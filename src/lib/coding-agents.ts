export interface CodingAgent {
  id: string;
  name: string;
  icon: string;
}

// Grouped by company
export const codingAgents: CodingAgent[] = [
  // Anthropic
  { id: 'claude-code', name: 'Claude Code', icon: '/icons/agents/claude.svg' },
  { id: 'claude-ai', name: 'Claude.ai', icon: '/icons/agents/claude.svg' },
  // OpenAI
  { id: 'chatgpt', name: 'ChatGPT', icon: '/icons/agents/openai.svg' },
  { id: 'codex', name: 'Codex', icon: '/icons/agents/openai.svg' },
  // Google
  { id: 'gemini', name: 'Gemini', icon: '/icons/agents/gemini.svg' },
  { id: 'gemini-cli', name: 'Gemini CLI', icon: '/icons/agents/gemini.svg' },
  // GitHub
  { id: 'gh-copilot', name: 'GitHub Copilot', icon: '/icons/agents/github.svg' },
  { id: 'gh-copilot-cli', name: 'GitHub Copilot CLI', icon: '/icons/agents/github.svg' },
  // Independent
  { id: 'cursor', name: 'Cursor', icon: '/icons/agents/cursor.svg' },
  { id: 'windsurf', name: 'Windsurf', icon: '/icons/agents/windsurf.svg' },
  { id: 'goose', name: 'Goose', icon: '/icons/agents/goose.svg' },
];

export type OptOutReason = 'none' | 'unsure';

export const optOutOptions: { id: OptOutReason; label: string }[] = [
  { id: 'none', label: "I/we don't use coding agents yet" },
  { id: 'unsure', label: "We use some, I'm not sure which" },
];
