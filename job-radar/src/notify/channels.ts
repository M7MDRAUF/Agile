import { fetchJson } from "../http.ts";
import type { Job } from "../types.ts";
import {
  NTFY_BYTE_LIMIT,
  TELEGRAM_CHAR_LIMIT,
  buildHeartbeat,
  buildJobNotifications,
  escapeHtml,
  type DigestContext,
  type Notification,
} from "./format.ts";

export interface Channel {
  name: string;
  /** Renders a digest or heartbeat in this channel's size limits and sends it. */
  sendJobs(jobs: Job[], ctx: DigestContext): Promise<number>;
  sendHeartbeat(ctx: DigestContext): Promise<void>;
  sendRaw(title: string, text: string): Promise<void>;
}

function ntfyChannel(server: string, topic: string, token?: string): Channel {
  const post = async (n: Notification) => {
    await fetchJson(server, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        topic,
        title: n.title,
        message: n.text,
        priority: n.silent ? 1 : 3,
        tags: n.silent ? ["zzz"] : ["briefcase"],
        ...(n.clickUrl ? { click: n.clickUrl } : {}),
      }),
    });
  };
  return {
    name: "ntfy",
    async sendJobs(jobs, ctx) {
      const messages = buildJobNotifications(jobs, ctx, {
        measure: (s) => Buffer.byteLength(s, "utf8"),
        max: NTFY_BYTE_LIMIT,
        format: "text",
      });
      for (const message of messages) await post(message);
      return messages.length;
    },
    sendHeartbeat: (ctx) => post(buildHeartbeat(ctx)),
    sendRaw: (title, text) => post({ title, text, html: "", silent: false }),
  };
}

function telegramChannel(botToken: string, chatId: string): Channel {
  const api = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const post = async (html: string, silent: boolean) => {
    await fetchJson(api, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        disable_notification: silent,
      }),
    });
  };
  return {
    name: "telegram",
    async sendJobs(jobs, ctx) {
      const messages = buildJobNotifications(jobs, ctx, {
        measure: (s) => s.length,
        max: TELEGRAM_CHAR_LIMIT,
        format: "html",
      });
      for (const message of messages) await post(message.html, false);
      return messages.length;
    },
    sendHeartbeat: (ctx) => {
      const heartbeat = buildHeartbeat(ctx);
      return post(heartbeat.html, true);
    },
    sendRaw: (title, text) => post(`<b>${escapeHtml(title)}</b>\n\n${escapeHtml(text)}`, false),
  };
}

export function loadChannels(env: NodeJS.ProcessEnv = process.env): Channel[] {
  const channels: Channel[] = [];
  const topic = env.NTFY_TOPIC?.trim();
  if (topic) {
    const server = (env.NTFY_SERVER?.trim() || "https://ntfy.sh").replace(/\/+$/, "");
    channels.push(ntfyChannel(server, topic, env.NTFY_TOKEN?.trim() || undefined));
  }
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();
  if (botToken && chatId) channels.push(telegramChannel(botToken, chatId));
  return channels;
}
