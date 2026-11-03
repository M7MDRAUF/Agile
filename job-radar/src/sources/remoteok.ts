import type { Job, JobSource } from "../types.ts";
import { htmlToText } from "../text.ts";

interface RemoteOkItem {
  id?: string;
  epoch?: number;
  position?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
}

/** Remote OK requires attribution: every notification names the source and links back to its page. */
export const remoteOkSource: JobSource = {
  key: "remoteok",
  async fetch({ cutoff, fetchJson }) {
    const items = await fetchJson<RemoteOkItem[]>("https://remoteok.com/api");
    const jobs: Job[] = [];
    for (const item of items) {
      if (!item.id || !item.epoch || !item.position || !item.url) continue;
      const postedAt = new Date(item.epoch * 1000);
      if (postedAt < cutoff) continue;
      jobs.push({
        id: `remoteok:${item.id}`,
        source: "Remote OK",
        title: item.position,
        company: item.company ?? "Unknown",
        location: item.location ? `Remote / ${item.location}` : "Remote",
        url: item.url,
        postedAt,
        description: item.description ? htmlToText(item.description) : undefined,
      });
    }
    return { jobs, warnings: [] };
  },
};
