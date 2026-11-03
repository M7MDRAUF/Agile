import type { JobSource } from "../types.ts";
import { htmlToText } from "../text.ts";

interface RemotiveResponse {
  jobs: Array<{
    id: number;
    url: string;
    title: string;
    company_name: string;
    publication_date: string;
    candidate_required_location?: string;
    description?: string;
  }>;
}

/**
 * Remotive asks API consumers to poll at most ~4 times a day and links must point back to Remotive,
 * so this source is throttled to once every 6 hours regardless of the schedule.
 */
export const remotiveSource: JobSource = {
  key: "remotive",
  minIntervalMinutes: 360,
  async fetch({ cutoff, fetchJson }) {
    const response = await fetchJson<RemotiveResponse>(
      "https://remotive.com/api/remote-jobs?category=software-dev",
    );
    const jobs = response.jobs.flatMap((item) => {
      const postedAt = new Date(`${item.publication_date}Z`);
      if (Number.isNaN(postedAt.getTime()) || postedAt < cutoff) return [];
      return [
        {
          id: `remotive:${item.id}`,
          source: "Remotive",
          title: item.title,
          company: item.company_name,
          location: item.candidate_required_location
            ? `Remote / ${item.candidate_required_location}`
            : "Remote",
          url: item.url,
          postedAt,
          description: item.description ? htmlToText(item.description) : undefined,
        },
      ];
    });
    return { jobs, warnings: [] };
  },
};
