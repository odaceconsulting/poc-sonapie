import { buildSystemPrompt, getRuleBasedReply, type ChatReply } from "./chatKnowledge";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: ChatReply["actions"];
  mode?: "ai" | "local";
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

function getGroqApiKey(): string | undefined {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  return typeof key === "string" && key.trim().length > 0 ? key.trim() : undefined;
}

export function getChatMode(): "ai" | "local" {
  return getGroqApiKey() ? "ai" : "local";
}

async function chatWithGroq(history: ChatMessage[], userMessage: string): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("Clé API Groq manquante");

  const messages = [
    { role: "system" as const, content: buildSystemPrompt() },
    ...history
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-10)
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
      max_tokens: 600,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(err || `Groq API error ${response.status}`);
  }

  const data = await response.json() as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Réponse vide du modèle");
  return content;
}

export async function sendChatMessage(
  history: ChatMessage[],
  userMessage: string,
): Promise<Pick<ChatMessage, "text" | "actions" | "mode">> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return { text: "Veuillez saisir un message.", mode: "local" };
  }

  if (getGroqApiKey()) {
    try {
      const text = await chatWithGroq(history, trimmed);
      return { text, mode: "ai" };
    } catch {
      const fallback = getRuleBasedReply(trimmed);
      return {
        text: `${fallback.text}\n\n_(Le service IA est momentanément indisponible — réponse automatique.)_`,
        actions: fallback.actions,
        mode: "local",
      };
    }
  }

  const reply = getRuleBasedReply(trimmed);
  return { ...reply, mode: "local" };
}
