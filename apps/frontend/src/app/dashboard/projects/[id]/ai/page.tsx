'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Copy,
  RotateCw,
  Terminal,
  Activity as ActivityIcon,
  Users,
  CalendarClock,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle, Button, Input, Progress, Skeleton } from '@sitepilot/ui';
import { useProject, type ProjectDetail } from '@/hooks/api/use-projects';
import { useWorkforce } from '@/hooks/api/use-workforce';
import { formatRelativeTime } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';

// Worker element type, derived from the hook so this page has no demo-dataset dependency.
type Worker = NonNullable<ReturnType<typeof useWorkforce>['data']>[number];

// ── Lightweight markdown renderer (formatting only - no data) ────────────────
function parseMarkdown(text: string): { __html: string } {
  const html = text
    .replace(/### (.*)/g, '<h3 class="text-base font-bold text-foreground mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/^- (.*)$/gm, '<li class="ml-4 list-disc my-1">$1</li>')
    .replace(/\n/g, '<br />')
    .replace(/<\/li><br \/>/g, '</li>');
  return { __html: html };
}

function formatCrore(n: number | null | undefined): string {
  if (n == null) return 'No data available';
  return `₹${(n / 10_000_000).toFixed(2)} Cr`;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function daysToCompletion(project: ProjectDetail): number | null {
  if (!project.expectedCompletion) return null;
  return differenceInDays(new Date(project.expectedCompletion), new Date());
}

// ── Deterministic answer builders - computed only from real, loaded data ─────
function buildBudget(project: ProjectDetail): string {
  if (project.budget == null) {
    return `### Budget\nNo budget data available for this project.`;
  }
  const allocated = project.budget;
  const spent = project.spent;
  const remaining = allocated - spent;
  const util = allocated > 0 ? (spent / allocated) * 100 : 0;
  const gap = util - project.progress;
  const note =
    gap > 15
      ? `Spend (**${util.toFixed(1)}%**) is running ahead of reported progress (**${project.progress}%**).`
      : `Spend (**${util.toFixed(1)}%**) is broadly in line with reported progress (**${project.progress}%**).`;
  return `### Budget for ${project.name}
- **Allocated**: ${formatCrore(allocated)}
- **Spent**: ${formatCrore(spent)}
- **Remaining**: ${formatCrore(remaining)}
- **Utilisation**: ${util.toFixed(1)}%

${note}`;
}

function buildSchedule(project: ProjectDetail): string {
  const days = daysToCompletion(project);
  const scheduleLine =
    days == null
      ? 'No expected completion date is set for this project.'
      : days < 0
        ? `The expected completion date has passed by **${Math.abs(days)} day(s)**.`
        : `**${days} day(s)** remain until the expected completion date.`;
  return `### Schedule for ${project.name}
- **Status**: ${statusLabel(project.status)}
- **Progress**: ${project.progress}%
- **Priority**: ${statusLabel(project.priority)}

${scheduleLine}`;
}

function buildTeam(project: ProjectDetail): string {
  if (project.members.length === 0) {
    return `### Team\nNo team members are assigned to this project.`;
  }
  const lines = project.members
    .map((m) => `- **${m.user.name}** - ${statusLabel(m.role)}`)
    .join('\n');
  return `### Team for ${project.name}
${project.members.length} member(s) assigned:
${lines}`;
}

function buildWorkforce(workers: Worker[]): string {
  if (workers.length === 0) {
    return `### Workforce\nNo workforce is assigned to this project.`;
  }
  const present = workers.filter((w) => w.status === 'active' || w.status === 'late').length;
  const absent = workers.filter((w) => w.status === 'absent').length;
  const subs = workers.filter((w) => w.type.toLowerCase() === 'subcontractor').length;
  const trades = new Map<string, number>();
  for (const w of workers) trades.set(w.trade, (trades.get(w.trade) ?? 0) + 1);
  const tradeLines = Array.from(trades.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `- ${name}: ${count}`)
    .join('\n');
  return `### Workforce for this project
- **Total**: ${workers.length}
- **Present today**: ${present}
- **Absent**: ${absent}
- **Subcontractors**: ${subs}

**Trades**:
${tradeLines}`;
}

function buildActivity(project: ProjectDetail): string {
  if (project.activities.length === 0) {
    return `### Recent Activity\nNo recent activity has been recorded for this project.`;
  }
  const lines = project.activities
    .slice(0, 6)
    .map((a) => `- **${a.title}** - ${formatRelativeTime(a.createdAt)}${a.description ? `\n  ${a.description}` : ''}`)
    .join('\n');
  return `### Recent Activity for ${project.name}
${lines}`;
}

function buildRisks(project: ProjectDetail, workers: Worker[]): string {
  const risks: string[] = [];

  if (project.status === 'ON_HOLD' || project.status === 'CANCELLED') {
    risks.push(`Project status is **${statusLabel(project.status)}**.`);
  }

  if (project.budget != null && project.budget > 0) {
    const util = (project.spent / project.budget) * 100;
    if (util - project.progress > 15) {
      risks.push(
        `Budget utilisation (**${util.toFixed(1)}%**) is outpacing progress (**${project.progress}%**).`,
      );
    }
  }

  const days = daysToCompletion(project);
  if (days != null && days < 0) {
    risks.push(`Project is past its expected completion date by **${Math.abs(days)} day(s)**.`);
  } else if (days != null && days < 30 && project.progress < 90) {
    risks.push(`Only **${days} day(s)** remain with progress at **${project.progress}%**.`);
  }

  const absent = workers.filter((w) => w.status === 'absent').length;
  if (absent > 0) risks.push(`**${absent}** worker(s) reported absent.`);

  const expiredCerts = workers.filter((w) =>
    w.certifications?.some((c) => c.status === 'expired'),
  ).length;
  if (expiredCerts > 0) {
    risks.push(`**${expiredCerts}** worker(s) have at least one expired certification.`);
  }

  const nonCompliant = workers.filter((w) => !w.ppeCompliant).length;
  if (nonCompliant > 0) risks.push(`**${nonCompliant}** worker(s) are not PPE-compliant.`);

  if (risks.length === 0) {
    return `### Risk Assessment for ${project.name}\nNo significant risks were detected from the available project data.`;
  }
  return `### Risk Assessment for ${project.name}
${risks.map((r) => `- ${r}`).join('\n')}`;
}

function buildSummary(project: ProjectDetail, workers: Worker[]): string {
  const days = daysToCompletion(project);
  const util =
    project.budget != null && project.budget > 0
      ? `${((project.spent / project.budget) * 100).toFixed(1)}%`
      : 'No data available';
  const present = workers.filter((w) => w.status === 'active' || w.status === 'late').length;
  const scheduleLine =
    days == null
      ? 'no completion date set'
      : days < 0
        ? `${Math.abs(days)} day(s) overdue`
        : `${days} day(s) remaining`;
  return `### Executive Summary: ${project.name}
- **Status**: ${statusLabel(project.status)} · **Progress**: ${project.progress}%
- **Budget**: ${formatCrore(project.budget)} allocated, ${formatCrore(project.spent)} spent (**${util}** utilised)
- **Schedule**: ${scheduleLine}
- **Team**: ${project.members.length} member(s) · **Workforce present**: ${present} of ${workers.length}
- **Recent activity entries**: ${project.activities.length}

Ask about budget, schedule, risks, team, workforce, or recent activity for more detail.`;
}

function buildUnavailable(topic: string): string {
  return `### ${topic}\nNo data available. This information is not yet exposed by the backend, so I can't report on it without fabricating an answer.`;
}

function generateResponse(query: string, project: ProjectDetail, workers: Worker[]): string {
  const q = query.toLowerCase();
  if (q.includes('risk')) return buildRisks(project, workers);
  if (q.includes('budget') || q.includes('cost') || q.includes('spend')) return buildBudget(project);
  if (q.includes('procurement') || q.includes('purchase') || q.includes('vendor') || q.includes('material'))
    return buildUnavailable('Procurement');
  if (q.includes('daily report') || q.includes('report')) return buildUnavailable('Daily Reports');
  if (q.includes('team') || q.includes('member') || q.includes('who'))
    return buildTeam(project);
  if (q.includes('workforce') || q.includes('worker') || q.includes('personnel') || q.includes('attendance') || q.includes('labour') || q.includes('labor'))
    return buildWorkforce(workers);
  if (q.includes('schedule') || q.includes('timeline') || q.includes('progress') || q.includes('deadline') || q.includes('complete'))
    return buildSchedule(project);
  if (q.includes('activity') || q.includes('recent') || q.includes('update') || q.includes('happening'))
    return buildActivity(project);
  return buildSummary(project, workers);
}

// ── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
};

const SUGGESTED_PROMPTS = [
  'Generate an executive summary',
  'Assess the current risks',
  'Analyse the budget',
  'What is the workforce status?',
];

export default function ProjectDirectorAIPage({ params }: { params: { id: string } }) {
  const { data: project, isLoading } = useProject(params.id);
  const { data: allWorkers = [] } = useWorkforce();

  const workers = useMemo(
    () => allWorkers.filter((w) => w.projectId === params.id),
    [allWorkers, params.id],
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim() || !project || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const responseText = generateResponse(text, project, workers);
    const aiMsgId = (Date.now() + 1).toString();

    setTimeout(() => {
      setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', content: '', isStreaming: true }]);
      let i = 0;
      const interval = setInterval(() => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== aiMsgId) return m;
            const chunk = Math.floor(i / 40) + 3;
            const next = responseText.slice(0, i + chunk);
            i += chunk;
            return { ...m, content: next, isStreaming: i < responseText.length };
          }),
        );
        if (i >= responseText.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 18);
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6">
        <Skeleton className="hidden lg:block w-80 h-full rounded-xl" />
        <Skeleton className="flex-1 h-full rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No data available"
        description="This project could not be loaded, so the AI Director has no data to work with."
      />
    );
  }

  const days = daysToCompletion(project);
  const budgetUtil =
    project.budget != null && project.budget > 0 ? (project.spent / project.budget) * 100 : 0;
  const present = workers.filter((w) => w.status === 'active' || w.status === 'late').length;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6 overflow-hidden">
      {/* LEFT: real project context */}
      <div className="hidden lg:flex w-80 flex-col gap-6 overflow-y-auto pr-2">
        <div>
          <h3 className="font-semibold text-lg flex items-center mb-4">
            <Terminal className="mr-2 h-5 w-5 text-primary" /> Context Window
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            The AI Director answers only from this project&apos;s live backend data. It never fabricates figures.
          </p>
        </div>

        <Card className="bg-muted/30 border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Project Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-emerald-600">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-1.5" indicatorColor="bg-emerald-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Budget spent</span>
                <span className="font-medium">{formatCrore(project.spent)}</span>
              </div>
              <Progress value={budgetUtil} className="h-1.5" />
            </div>
            <div className="pt-2 flex items-center justify-between text-sm border-t border-border/50">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> Days remaining
              </span>
              <span className="font-medium">{days == null ? 'No date' : `${days} days`}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Team
              </span>
              <span className="font-medium">{project.members.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Workforce present
              </span>
              <span className="font-medium">{present} / {workers.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ActivityIcon className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              project.activities.slice(0, 4).map((a) => (
                <div key={a.id} className="text-sm">
                  <p className="font-medium leading-snug">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: chat */}
      <div className="flex-1 flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Project Director AI</h2>
              <p className="text-muted-foreground mb-8">
                I&apos;m the AI Director for {project.name}. I generate summaries from this project&apos;s
                live data - budget, schedule, team, workforce, and activity. I don&apos;t make up facts; if
                something isn&apos;t available, I&apos;ll say so.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="text-left px-4 py-3 rounded-lg border bg-muted/30 hover:bg-muted/80 hover:border-primary/50 transition-all text-sm font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-sm rounded-tr-sm'
                        : 'bg-card border border-border/60 shadow-sm text-foreground rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-3 text-primary font-semibold text-sm">
                        <Sparkles className="h-4 w-4" /> AI Director
                      </div>
                    )}

                    {msg.role === 'user' ? (
                      <div className="text-sm">{msg.content}</div>
                    ) : (
                      <div
                        className="text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground"
                        dangerouslySetInnerHTML={parseMarkdown(msg.content)}
                      />
                    )}

                    {msg.isStreaming && (
                      <span className="inline-flex gap-1 ml-2 align-middle">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}

                    {msg.role === 'assistant' && !msg.isStreaming && (
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50 text-muted-foreground">
                        <button
                          className="hover:text-foreground transition-colors p-1"
                          title="Copy response"
                          onClick={() => navigator.clipboard?.writeText(msg.content)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="hover:text-foreground transition-colors p-1"
                          title="Regenerate"
                          onClick={() => {
                            const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                            if (lastUser) handleSend(lastUser.content);
                          }}
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="p-4 bg-background border-t">
          <div className="relative flex items-center max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Ask the Project Director..."
              className="relative pr-12 py-6 rounded-xl bg-background border-border/60 focus-visible:border-primary/50 text-base"
              disabled={isTyping}
            />
            <Button
              size="icon"
              className="absolute right-2 h-9 w-9 rounded-lg"
              disabled={!input.trim() || isTyping}
              onClick={() => handleSend(input)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground">
              Answers are generated deterministically from this project&apos;s backend data. No external AI is used.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
