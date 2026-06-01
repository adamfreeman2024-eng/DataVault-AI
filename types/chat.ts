export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** Set when `generate_premium_image` returns a DALL·E URL */
  imageUrl?: string;
  createdAt: number;
};
