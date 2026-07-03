import {
  buildAdminSystemPrompt,
  getAdminRuleBasedReply,
  type AdminChatContext,
  type AdminChatReply,
} from "./adminChatKnowledge";
import type { ChatMessage } from "./chatService";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

function getGroqApiKey(): string | undefined {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  return typeof key === "string" && key.trim().length > 0 ? key.trim() : undefined;
}

async function chatWithGroq(
  history: ChatMessage[],
  userMessage: string,
  ctx: AdminChatContext,
): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("Clé API Groq manquante");

  const messages = [
    { role: "system" as const, content: buildAdminSystemPrompt(ctx) },
    ...history
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-8)
      .map(m => ({ role: m.role, content: m.text })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 800,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(err || `Groq API error ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Réponse vide du modèle");
  return content;
}

export async function sendAdminChatMessage(
  history: ChatMessage[],
  userMessage: string,
  ctx: AdminChatContext,
): Promise<Pick<ChatMessage, "text" | "actions" | "mode">> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return { text: "Veuillez saisir une question.", mode: "local" };
  }

  if (getGroqApiKey()) {
    try {
      const text = await chatWithGroq(history, trimmed, ctx);
      return { text, mode: "ai" };
    } catch {
      const fallback = getAdminRuleBasedReply(trimmed, ctx);
      return {
        text: `${fallback.text}\n\n_(Service IA momentanément indisponible — réponse basée sur les données locales.)_`,
        actions: fallback.actions,
        mode: "local",
      };
    }
  }

  const reply: AdminChatReply = getAdminRuleBasedReply(trimmed, ctx);
  return { ...reply, mode: "local" };
}
