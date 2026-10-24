import { Sparkles } from 'lucide-react';
import type { HelpModule } from '../types';

export const aiHelp: HelpModule = {
  key: 'ai',
  title: 'AI',
  icon: Sparkles,
  routes: ['/dashboard/ai-assistant', '/dashboard/ai'],
  permission: 'ai.use',
  guides: [
    {
      id: 'ai.assistant',
      title: 'Ask the AI Assistant',
      summary: 'Questions about your projects, answered from live data.',
      keywords: ['chat', 'question'],
      steps: [
        'Open AI Assistant and type a question, for example “Which projects are over budget?”.',
        'Answers use your organization’s current data. Earlier chats are kept so you can return to them.',
        'Inside a project, the project assistant answers about that project only.',
      ],
    },
    {
      id: 'ai.connect',
      title: 'Connect an AI provider',
      summary: 'Use your own key or request the free trial.',
      permission: 'ai.manage',
      steps: [
        'Open Settings → AI.',
        'Add a key for Gemini, Groq or Hugging Face. It is tested before saving and stored encrypted.',
        'Or request the free trial, which a SitePilot admin approves.',
      ],
    },
  ],
};
