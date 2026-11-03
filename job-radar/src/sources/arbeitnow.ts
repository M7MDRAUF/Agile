import type { Job, JobSource } from "../types.ts";
import { clip, htmlToText } from "../text.ts";

interface ArbeitnowResponse {
  data: Array<{
    slug: string;
    company_name: string;
    title: string;
    description?: string;
    remote?: boolean;
    url: string;
    location?: string;
    created_at: number;
  }>;
}

const MAX_PAGES = 6;

export const arbeitnowSource: JobSource = {
  key: "arbeitnow",
  async fetch({ cutoff, fetchJson }) {
    const jobs: Job[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await fetchJson<ArbeitnowResponse>(
        `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
      );
      if (!response.data?.length) break;
      let reachedOld = false;
      for (const item of response.data) {
        const postedAt = new Date(item.created_at * 1000);
        if (postedAt < cutoff) {
          reachedOld = true;
          continue;
        }
        jobs.push({
          id: `arbeitnow:${item.slug}`,
          source: "Arbeitnow",
          title: item.title,
          company: item.company_name,
          location:
            [item.location, item.remote ? "Remote" : ""].filter(Boolean).join(" / ") ||
            "Not specified",
          url: item.url,
          postedAt,
          description: item.description ? clip(htmlToText(item.description)) : undefined,
        });
      }
      if (reachedOld) break;
    }
    return { jobs, warnings: [] };
  },
};
