'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, Copy, RotateCw, AlertTriangle, CloudRain, 
  PackageSearch, Clock, ArrowUpRight, ArrowDownRight, Terminal
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Progress } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';

import { projectDetails, weatherAlerts } from '@/data/demo';
import { usePurchaseOrders } from '@/hooks/api/use-purchase-orders';


// --- Markdown Parser (Simple Demo Version) ---
const parseMarkdown = (text: string) => {
  let html = text
    .replace(/### (.*)/g, '<h3 class="text-lg font-bold text-foreground mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/- (.*)/g, '<li class="ml-4 list-disc my-1">$1</li>')
    .replace(/\n/g, '<br />')
    // Fix consecutive breaks created by list items
    .replace(/<\/li><br \/>/g, '</li>');

  // Simple Table parser for demo purposes
  if (html.includes('|')) {
    const lines = html.split('<br />');
    let inTable = false;
    html = lines.map(line => {
      if (line.includes('|')) {
        const cells = line.split('|').filter(c => c.trim() !== '');
        if (line.includes('---')) return ''; // skip separator
        const isHeader = !inTable;
        inTable = true;
        const tag = isHeader ? 'th' : 'td';
        const classes = isHeader 
          ? 'px-4 py-2 bg-muted/50 text-left font-semibold border-b' 
          : 'px-4 py-2 border-b border-muted/50';
        return `<tr class="hover:bg-muted/10">${cells.map(c => `<${tag} class="${classes}">${c.trim()}</${tag}>`).join('')}</tr>`;
      } else {
        if (inTable) {
          inTable = false;
          return `</table><div class="mb-4"></div>${line}`;
        }
        return line;
      }
    }).join('<br />');
    
    // Wrap any open table rows
    if (html.includes('<tr')) {
       html = html.replace(/<tr/i, '<div class="overflow-hidden rounded-md border my-4"><table class="w-full text-sm text-left"><tr');
       html += '</table></div>';
    }
  }

  return { __html: html };
};

// --- Predefined AI Responses ---
const getPredefinedResponse = (query: string, project: any, purchaseOrders: any[]) => {
  const q = query.toLowerCase();
  
  const po23 = purchaseOrders.find((po: any) => po.number === 'PO-0023');
  const isSteelApproved = po23?.status === 'approved';

  if (q.includes('risk') || q.includes('biggest risks')) {
    return `### Current Risk Assessment for ${project.name}
Based on the latest daily reports and schedule data, I have identified the following critical risks:

**1. Supply Chain Delay (High Priority)**
The premium glass facade shipment is currently 5 days delayed. 
- **Impact**: Could halt exterior sealing scheduled for next week.
- **Action**: Follow up with the overseas vendor and explore expedited air-freight options for the first batch.

${isSteelApproved 
  ? `**2. Steel Procurement (Resolved)**
PO-0023 for 150 tons of 16mm TMT Rebar has been approved.
- **Impact**: The critical path for the 22nd-floor superstructure is no longer blocked. Project risk significantly reduced.`
  : `**2. Steel Procurement (High Priority)**
PO-0023 for 150 tons of 16mm TMT Rebar is pending approval.
- **Impact**: If not approved today, superstructure work on the 22nd floor will halt.
- **Action**: Please review and approve the pending purchase order immediately.`
}

**3. Weather Risk (Medium Priority)**
Heavy rain is forecasted for Thursday.
- **Impact**: Earthworks and crane operations may be temporarily suspended.
- **Action**: Direct site supervisors to secure loose materials and prioritize interior framing on floors 15-17.

**4. Budget Variance (Low Priority)**
Equipment budget is tracking 8% higher than projected due to extended crane rentals.`;
  }
  
  if (q.includes('procurement') || q.includes('materials')) {
    return `### Procurement Status & Alerts
Here is the current status of critical materials for **${project.name}**:

| Material | Required By | Status | Action Required |
|----------|-------------|--------|-----------------|
| Glass Facade Panels | Oct 15 | **Delayed (5 days)** | Expedite shipping |
| C40 Concrete | Daily | On Track | None |
| HVAC Units (Fl 15) | Oct 12 | At Port | Schedule transport |
| 16mm Rebar | Oct 20 | ${isSteelApproved ? 'Approved/In Transit' : '**Pending Approval**'} | ${isSteelApproved ? 'Monitor' : 'Approve PO-0023'} |

**Recommendation:**
Shift focus to securing the HVAC units immediately to take advantage of the crane availability before Thursday's expected rain.`;
  }

  if (q.includes('budget') || q.includes('analyze')) {
    return `### Budget Analysis
We are currently operating at **${((project.spent / project.budget) * 100).toFixed(1)}% budget utilization** ($${(project.spent/1000000).toFixed(1)}M spent of $${(project.budget/1000000).toFixed(1)}M).

- **Materials**: $22M spent (Trending under budget due to bulk steel pricing).
- **Labour**: $18M spent (On track).
- **Equipment**: $11M spent (Trending 8% over budget).

**Director's Note:**
The overspend in Equipment is driven by the extended use of Tower Crane T1. I recommend demobilizing T1 by next Friday to cap this variance.`;
  }

  // Default Fallback
  return `### Executive Summary: ${project.name}
I've analyzed the latest data for the project. We are currently at **${project.progress}% completion**, operating efficiently with a workforce of 1,240 personnel across all sites.

- **Financials**: Budget utilization is healthy, with $${((project.budget - project.spent)/1000000).toFixed(1)}M remaining.
- **Schedule**: Superstructure for floors 1-20 is currently in progress. 
- **Immediate Attention**: Please review the pending purchase orders for the HVAC units and prepare the site for forecasted heavy rain on Thursday.

What specific area would you like me to dive into? I can analyze the budget, forecast completion, or review safety observations.`;
};


// --- Types ---
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
};


// --- Page Component ---
export default function ProjectDirectorAIPage({ params }: { params: { id: string } }) {
  const project = projectDetails[params.id] || projectDetails['p1'];
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response stream
    setTimeout(() => {
      const responseText = getPredefinedResponse(text, project, purchaseOrders);
      const aiMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', isStreaming: true }]);
      
      let i = 0;
      const interval = setInterval(() => {
        setMessages(prev => prev.map(m => {
          if (m.id === aiMsgId) {
            // Randomize chunk size for realistic streaming
            const chunk = Math.floor(Math.random() * 3) + 2;
            const newContent = responseText.slice(0, i + chunk);
            i += chunk;
            return { ...m, content: newContent, isStreaming: i < responseText.length };
          }
          return m;
        }));
        
        if (i >= responseText.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 20);
    }, 600);
  };

  const suggestedPrompts = [
    "What are today's biggest risks?",
    "Which materials need procurement?",
    "Analyze the current budget",
    "Generate executive summary"
  ];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6 overflow-hidden">
      
      {/* LEFT PANEL: Project Context */}
      <div className="hidden lg:flex w-80 flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <div>
          <h3 className="font-semibold text-lg flex items-center mb-4">
            <Terminal className="mr-2 h-5 w-5 text-primary" /> Context Window
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            The AI Director is actively monitoring these real-time metrics to inform its responses.
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
                <span className="text-muted-foreground">Budget</span>
                <span className="font-medium">${(project.spent / 1000000).toFixed(1)}M</span>
              </div>
              <Progress value={(project.spent / project.budget) * 100} className="h-1.5" />
            </div>
            <div className="pt-2 flex items-center justify-between text-sm border-t border-border/50">
              <span className="text-muted-foreground">Days Remaining</span>
              <span className="font-medium">{differenceInDays(new Date(project.dueDate), new Date())} Days</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>Facade delivery tracking 5 days late.</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CloudRain className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <span>{weatherAlerts.forecast}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pending Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center"><PackageSearch className="mr-2 h-4 w-4 text-muted-foreground" /> PO-4492 (HVAC)</span>
              <Badge variant="outline">Awaiting Approval</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground" /> Daily Report</span>
              <Badge variant="secondary">Draft</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT PANEL: Chat UI */}
      <div className="flex-1 flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm relative">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Project Director AI</h2>
              <p className="text-muted-foreground mb-8">
                I&apos;m your dedicated AI Director for {project.name}. I have full visibility into the schedule, budget, procurement, and daily reports. How can I assist you today?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {suggestedPrompts.map(prompt => (
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
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-sm rounded-tr-sm' 
                      : 'bg-card border border-border/60 shadow-sm text-foreground rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-3 text-primary font-semibold text-sm">
                        <Sparkles className="h-4 w-4" /> AI Director
                      </div>
                    )}
                    
                    {msg.role === 'user' ? (
                      <div className="text-sm">{msg.content}</div>
                    ) : (
                      <div 
                        className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-strong:text-foreground text-muted-foreground"
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
                        <button className="hover:text-foreground transition-colors p-1" title="Copy response">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button className="hover:text-foreground transition-colors p-1" title="Regenerate">
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

        {/* Input Area */}
        <div className="p-4 bg-background border-t">
          <div className="relative flex items-center max-w-4xl mx-auto group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 to-purple-500/40 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
            <Input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Ask the Project Director..." 
              className="relative pr-12 py-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] bg-background border-border/60 focus-visible:ring-0 focus-visible:border-primary/50 text-base"
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
             <span className="text-[10px] text-muted-foreground">AI responses may occasionally be inaccurate. Please verify critical project data.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
