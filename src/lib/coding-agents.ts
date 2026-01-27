export type AgentCategory = 'cli' | 'ide' | 'chat';

export interface CodingAgent {
  id: string;
  name: string;
  category: AgentCategory;
  icon: string;
}

export const codingAgents: CodingAgent[] = [
  // CLIs
  { id: 'claude-code', name: 'Claude Code', category: 'cli', icon: '/icons/agents/claude.svg' },
  { id: 'gh-copilot-cli', name: 'GitHub Copilot CLI', category: 'cli', icon: '/icons/agents/github.svg' },
  { id: 'gemini-cli', name: 'Gemini CLI', category: 'cli', icon: '/icons/agents/gemini.svg' },
  { id: 'codex', name: 'Codex', category: 'cli', icon: '/icons/agents/openai.svg' },
  { id: 'other-cli', name: 'Other', category: 'cli', icon: '/icons/agents/other.svg' },

  // IDE/GUI
  { id: 'cursor', name: 'Cursor', category: 'ide', icon: '/icons/agents/cursor.svg' },
  { id: 'gh-copilot', name: 'GitHub Copilot', category: 'ide', icon: '/icons/agents/github.svg' },
  { id: 'windsurf', name: 'Windsurf', category: 'ide', icon: '/icons/agents/windsurf.svg' },
  { id: 'goose', name: 'Goose', category: 'ide', icon: '/icons/agents/goose.svg' },
  { id: 'other-ide', name: 'Other', category: 'ide', icon: '/icons/agents/other.svg' },

  // Chat interfaces
  { id: 'chatgpt', name: 'ChatGPT', category: 'chat', icon: '/icons/agents/openai.svg' },
  { id: 'gemini', name: 'Gemini', category: 'chat', icon: '/icons/agents/gemini.svg' },
  { id: 'claude-ai', name: 'Claude.ai', category: 'chat', icon: '/icons/agents/claude.svg' },
  { id: 'other-chat', name: 'Other', category: 'chat', icon: '/icons/agents/other.svg' },
];

export const agentsByCategory = {
  cli: codingAgents.filter(a => a.category === 'cli'),
  ide: codingAgents.filter(a => a.category === 'ide'),
  chat: codingAgents.filter(a => a.category === 'chat'),
};

export const categoryLabels: Record<AgentCategory, string> = {
  cli: 'CLIs',
  ide: 'IDE / GUI',
  chat: 'Chat',
};

export type OptOutReason = 'none' | 'unsure';

export const optOutOptions: { id: OptOutReason; label: string }[] = [
  { id: 'none', label: "I/we don't use coding agents yet" },
  { id: 'unsure', label: "We use some, I'm not sure which" },
];
