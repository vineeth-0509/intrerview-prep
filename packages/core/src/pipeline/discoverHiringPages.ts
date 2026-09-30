import robotsParser from "robots-parser";
import { fetchPage, type FetchedPage } from "./fetchPage";
import { assertSafeUrl } from "../security/urlSafety";



const KEYWORDS = [
  "career",
  "careers",
  "job",
  "jobs",
  "hiring",
  "interview",
  "life-at",
  "life at",
  "engineering",
  "eng-blog",
  "blog",
  "handbook",
  "about",
  "team",
  "culture",
  "people",
];

const MAX_DEPTH = 2;
const MAX_PAGES = 15;

interface FrontierItem {
  url: string;
  depth: number;
  score: number;
}

export interface CrawlResult {
  pages: FetchedPage[];
  skipped: Array<{ url: string; reason: string }>;
}

export function scoreLink(url: string, anchorText: string): number {
  const path = new URL(url).pathname.toLowerCase();
  const anchor = anchorText.toLowerCase();
  let score = 0;
  for (const kw of KEYWORDS) {
    if (path.includes(kw)) score += 2;
    if (anchor.includes(kw)) score += 1;
  }
  return score;
}

export function isSameSite(a: string, b: string): boolean {
  try {
    return new URL(a).hostname.toLowerCase() === new URL(b).hostname.toLowerCase();
  } catch {
    return false;
  }
}

async function loadRobots(homepageUrl: string, allowLocal: boolean) {
  try {
    const robotsUrl = new URL("/robots.txt", homepageUrl).toString();
    await assertSafeUrl(robotsUrl, { allowLocal });
    const res = await fetch(robotsUrl);
    if (!res.ok) return null;
    const body = await res.text();
    return robotsParser(robotsUrl, body);
  } catch {
    // No robots.txt, or it's unreachable — proceed without a robots
    // filter rather than blocking the whole crawl on it.
    return null;
  }
}

export interface DiscoverHiringPagesOptions {
  allowLocal?: boolean;
  maxDepth?: number;
  maxPages?: number;
}

export interface DiscoverHiringPagesDeps {
  fetchPageFn?: typeof fetchPage;
}

export async function discoverHiringPages(
  homepageUrl: string,
  options: DiscoverHiringPagesOptions = {},
  deps: DiscoverHiringPagesDeps = {},
): Promise<CrawlResult> {
  const maxDepth = options.maxDepth ?? MAX_DEPTH;
  const maxPages = options.maxPages ?? MAX_PAGES;
  const allowLocal = options.allowLocal ?? false;
  const doFetch = deps.fetchPageFn ?? fetchPage;

  const robots = await loadRobots(homepageUrl, allowLocal);
  const userAgent = "AIInterviewPrepKitBot";

  const visited = new Set<string>();
  const pages: FetchedPage[] = [];
  const skipped: Array<{ url: string; reason: string }> = [];

  let frontier: FrontierItem[] = [{ url: homepageUrl, depth: 0, score: Infinity }];

  while (frontier.length > 0 && pages.length < maxPages) {
    // Best-first: always take the highest-scoring undiscovered link next,
    // regardless of which depth it's queued at (bounded by maxDepth below).
    frontier.sort((a, b) => b.score - a.score);
    const next = frontier.shift()!;

    if (visited.has(next.url) || next.depth > maxDepth) continue;
    visited.add(next.url);

    if (robots && robots.isAllowed(next.url, userAgent) === false) {
      skipped.push({ url: next.url, reason: "disallowed_by_robots_txt" });
      continue;
    }

    const result = await doFetch(next.url, { allowLocal });
    if (!result.ok) {
      skipped.push({ url: result.url, reason: result.reason });
      continue;
    }

    pages.push(result);

    if (next.depth < maxDepth) {
      for (const link of result.links) {
        if (!isSameSite(link.url, homepageUrl)) continue;
        if (visited.has(link.url)) continue;
        frontier.push({
          url: link.url,
          depth: next.depth + 1,
          score: scoreLink(link.url, link.anchorText),
        });
      }
    }
  }

  return { pages, skipped };
}
