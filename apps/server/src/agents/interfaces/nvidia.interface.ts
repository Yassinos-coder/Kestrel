export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NvidiaChatResponse {
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}
