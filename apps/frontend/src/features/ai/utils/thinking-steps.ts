interface QuestionTopic {
  pattern: RegExp;
  steps: string[];
}

/** Ordered by how specific the wording is, so "over budget" reads as finance before it reads as a status ask. */
const QUESTION_TOPICS: QuestionTopic[] = [
  { pattern: /budget|cost|spen[dt]|overrun|invoice|bill|payment|cash|finance|money|₹/i, steps: ['Reading project budgets', 'Comparing spend against budget'] },
  { pattern: /schedule|delay|behind|deadline|timeline|progress|late|on track/i, steps: ['Checking project timelines', 'Comparing progress with planned dates'] },
  { pattern: /approv|pending|waiting|sign.?off/i, steps: ['Collecting pending approvals', 'Checking who needs to act'] },
  { pattern: /deliver|purchase|\bpos?\b|vendor|supplier|rfq|order/i, steps: ['Looking through purchase orders', 'Checking delivery dates'] },
  { pattern: /stock|inventory|material|warehouse|reorder|running low/i, steps: ['Scanning stock levels', 'Finding items below reorder level'] },
  { pattern: /attendance|workforce|worker|labou?r|crew|manpower/i, steps: ['Reviewing site attendance'] },
  { pattern: /daily report|site report|issue|risk|incident|safety/i, steps: ['Reading recent daily reports', 'Spotting issues and risks'] },
  { pattern: /summar|status|update|meeting|overview|brief/i, steps: ['Gathering the latest across your projects', 'Picking out what matters most'] },
];

const MAX_TOPICS = 2;

/** What the assistant is "doing" while it answers, phrased from the question so the wait feels purposeful. */
export function thinkingSteps(question: string): string[] {
  const matched = QUESTION_TOPICS.filter((topic) => topic.pattern.test(question)).slice(0, MAX_TOPICS);
  const research = matched.length > 0
    ? matched.flatMap((topic) => topic.steps)
    : ['Gathering your SitePilot data', 'Looking for relevant records'];
  return ['Understanding your question', ...research, 'Writing the answer'];
}
