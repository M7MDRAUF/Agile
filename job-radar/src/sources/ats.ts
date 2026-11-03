import type { Job, JobSource, SourceResult } from "../types.ts";
import { mapLimit } from "../http.ts";
import { clip, htmlToText } from "../text.ts";

const CONCURRENCY = 6;

async function forEachBoard(
  label: string,
  boards: string[],
  load: (board: string) => Promise<Job[]>,
): Promise<SourceResult> {
  const results = await mapLimit(boards, CONCURRENCY, load);
  const jobs: Job[] = [];
  const warnings: string[] = [];
  results.forEach((result, index) => {
    if (result.ok) jobs.push(...result.value);
    else warnings.push(`${label}/${boards[index]}: ${result.error.message}`);
  });
  if (boards.length > 0 && warnings.length === boards.length) {
    throw new Error(`all ${boards.length} ${label} boards failed (${warnings[0]})`);
  }
  return { jobs, warnings };
}

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  company_name?: string;
  first_published?: string;
  location?: { name?: string };
}

export function greenhouseSource(boards: string[]): JobSource {
  return {
    key: "greenhouse",
    fetch: ({ cutoff, fetchJson }) =>
      forEachBoard("greenhouse", boards, async (board) => {
        const response = await fetchJson<{ jobs: GreenhouseJob[] }>(
          `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`,
        );
        return response.jobs.flatMap((item): Job[] => {
          const postedAt = item.first_published ? new Date(item.first_published) : null;
          if (!postedAt || Number.isNaN(postedAt.getTime()) || postedAt < cutoff) return [];
          return [
            {
              id: `greenhouse:${board}:${item.id}`,
              source: "Greenhouse",
              title: item.title,
              company: item.company_name ?? board,
              location: item.location?.name || "Not specified",
              url: item.absolute_url,
              postedAt,
              loadDescription: async () => {
                const detail = await fetchJson<{ content?: string }>(
                  `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${item.id}`,
                );
                return detail.content ? htmlToText(detail.content) : "";
              },
            },
          ];
        });
      }),
  };
}

interface LeverPosting {
  id: string;
  text: string;
  createdAt?: number;
  hostedUrl: string;
  descriptionPlain?: string;
  categories?: { location?: string; allLocations?: string[] };
  workplaceType?: string;
}

export function leverSource(boards: string[]): JobSource {
  return {
    key: "lever",
    fetch: ({ cutoff, fetchJson }) =>
      forEachBoard("lever", boards, async (board) => {
        const postings = await fetchJson<LeverPosting[]>(
          `https://api.lever.co/v0/postings/${board}?mode=json`,
        );
        return postings.flatMap((item): Job[] => {
          if (!item.createdAt) return [];
          const postedAt = new Date(item.createdAt);
          if (postedAt < cutoff) return [];
          const locations = item.categories?.allLocations?.length
            ? item.categories.allLocations
            : [item.categories?.location ?? ""];
          return [
            {
              id: `lever:${board}:${item.id}`,
              source: "Lever",
              title: item.text,
              company: board,
              location: locations.filter(Boolean).join("; ") || "Not specified",
              url: item.hostedUrl,
              postedAt,
              description: item.descriptionPlain ? clip(item.descriptionPlain) : undefined,
            },
          ];
        });
      }),
  };
}

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: Array<{ location?: string }>;
  publishedAt?: string;
  isListed?: boolean;
  isRemote?: boolean | null;
  jobUrl: string;
  descriptionPlain?: string;
}

export function ashbySource(boards: string[]): JobSource {
  return {
    key: "ashby",
    fetch: ({ cutoff, fetchJson }) =>
      forEachBoard("ashby", boards, async (board) => {
        const response = await fetchJson<{ jobs: AshbyJob[] }>(
          `https://api.ashbyhq.com/posting-api/job-board/${board}`,
        );
        return response.jobs.flatMap((item): Job[] => {
          if (item.isListed === false || !item.publishedAt) return [];
          const postedAt = new Date(item.publishedAt);
          if (Number.isNaN(postedAt.getTime()) || postedAt < cutoff) return [];
          const locations = [
            item.location,
            ...(item.secondaryLocations ?? []).map((l) => l.location),
            item.isRemote ? "Remote" : undefined,
          ].filter(Boolean);
          return [
            {
              id: `ashby:${board}:${item.id}`,
              source: "Ashby",
              title: item.title,
              company: board,
              location: locations.join("; ") || "Not specified",
              url: item.jobUrl,
              postedAt,
              description: item.descriptionPlain ? clip(item.descriptionPlain) : undefined,
            },
          ];
        });
      }),
  };
}
