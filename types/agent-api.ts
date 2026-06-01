import type { ChatRole } from "@/types/chat";

/** Client → server chat payload (no client-generated ids required). */
export type AgentChatMessage = {
  role: ChatRole;
  content: string;
};

export type AgentRequestBody = {
  messages: AgentChatMessage[];
  transactionId?: string;
};

export type PaymentRequiredResponse = {
  requiresPayment: true;
  amount: number;
  currency: typeof import("@/lib/constants").X402_CURRENCY;
  operatorAccountId: string;
};

export type AgentSuccessResponse = {
  requiresPayment: false;
  content: string;
  imageUrl?: string;
  premiumTask: boolean;
  paymentVerified: boolean;
};

export type AgentErrorResponse = {
  error: string;
  code?: string;
};
