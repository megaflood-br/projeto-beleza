const SPIN_BLOCK = /\{([^{}|]+\|[^{}]+)\}/;

export function spin(template: string, random: () => number = Math.random) {
  let out = template;
  for (let i = 0; i < 20 && SPIN_BLOCK.test(out); i += 1) {
    out = out.replace(SPIN_BLOCK, (_, inner: string) => {
      const options = inner.split("|").map((item) => item.trim()).filter(Boolean);
      if (!options.length) return "";
      const index = Math.min(options.length - 1, Math.floor(random() * options.length));
      return options[index] ?? "";
    });
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export const HUMAN_TYPING_DELAY_MS = 1200;
export const BOT_PAUSE_HOURS = 2;

export function typingDelayMs(text: string) {
  const chars = text.trim().length;
  return Math.min(5000, Math.max(2000, 1800 + chars * 18));
}

export function botPausedUntilFromNow(hours = BOT_PAUSE_HOURS, now = new Date()) {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

export function isConversationBotPaused(
  conversation: { botPaused?: boolean | null; botPausedUntil?: Date | string | null },
  now = new Date(),
) {
  if (conversation.botPaused) return true;
  if (!conversation.botPausedUntil) return false;
  const until =
    conversation.botPausedUntil instanceof Date
      ? conversation.botPausedUntil
      : new Date(conversation.botPausedUntil);
  return until.getTime() > now.getTime();
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isConfirmReply(text: string) {
  return /^(1|sim+|confirmo|confirmado|ok|pode|claro)$/.test(fold(text).replace(/\s/g, ""));
}

export function looksLikeReminderPrompt(text: string) {
  return /(responda com 1|responder com 1|confirmar (o )?seu horario|confirmar amanha)/.test(fold(text));
}

export const PROACTIVE_CAMPAIGN_TRIGGERS = ["REMINDER"] as const;
