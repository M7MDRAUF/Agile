import type { Job, JobSource } from "../types.ts";

const URL =
  "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json";

interface SimplifyListing {
  id: string;
  title: string;
  company_name: string;
  url: string;
  locations?: string[];
  active?: boolean;
  is_visible?: boolean;
  date_posted?: number;
}

/** Community-curated list of new-grad roles (github.com/SimplifyJobs/New-Grad-Positions). */
export const simplifySource: JobSource = {
  key: "simplify",
  async fetch({ cutoff, fetchJson }) {
    const listings = await fetchJson<SimplifyListing[]>(URL);
    const jobs: Job[] = [];
    for (const item of listings) {
      if (!item.active || item.is_visible === false || !item.date_posted) continue;
      const postedAt = new Date(item.date_posted * 1000);
      if (postedAt < cutoff) continue;
      jobs.push({
        id: `simplify:${item.id}`,
        source: "Simplify",
        title: item.title,
        company: item.company_name,
        location: (item.locations ?? []).join("; ") || "Not specified",
        url: item.url,
        postedAt,
      });
    }
    return { jobs, warnings: [] };
  },
};
