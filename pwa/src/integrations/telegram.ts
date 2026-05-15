// Telegram adapter (stub). Real bot lives behind a webhook server
// (Edge Function in `supabase/functions/telegram-webhook/`). The PWA only
// queues outbound messages via this adapter — actual send happens server-side.

export interface OutboundMessage {
  chat_id: string;
  text: string;
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: unknown;
}

export interface TelegramAdapter {
  isConfigured(): Promise<boolean>;
  send(msg: OutboundMessage): Promise<{ queued: boolean; id?: string; error?: string }>;
}

export const telegram: TelegramAdapter = {
  async isConfigured() {
    return false; // until BYO bot token saved in Tenant Settings
  },
  async send(msg) {
    // Stub: pretend to queue. Real impl writes a row to `notifications` and
    // the edge function picks it up to call api.telegram.org/bot<TOKEN>/sendMessage.
    console.info("[telegram-stub] queue", msg);
    return { queued: true, id: `local-${Date.now()}` };
  },
};
