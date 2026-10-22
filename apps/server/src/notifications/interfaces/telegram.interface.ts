export interface TelegramCommandHandler {
  handle(userId: string, chatId: string, text: string): Promise<void>;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
  };
}
