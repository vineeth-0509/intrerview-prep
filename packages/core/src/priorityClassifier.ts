import type { RequirementPriority } from "./types";



const NICE_PATTERNS: RegExp[] = [
  /\bnice[- ]to[- ]have\b/i,
  /\bbonus( points)?\b/i,
  /\ba\s+plus\b/i,
  /\bpreferred\b/i,
  /\bideally\b/i,
  /\badvantageous\b/i,
  /\bdesirable\b/i,
  /\bgood to have\b/i,
  /\bwould be great\b/i,
];

const MUST_PATTERNS: RegExp[] = [
  /\brequired\b/i,
  /\bmust[- ]?have\b/i,
  /\brequires?\b/i,
  /\bessential\b/i,
  /\bmandatory\b/i,
  /\bminimum of\b/i,
  /\bat least\b/i,
  /\b\d+\+?\s*(?:-\s*\d+\s*)?\s*years?\b/i, // "5+ years", "3-5 years", "5 years"
  /\byou must\b/i,
];

export function classifyPriority(sourcePhrase: string): RequirementPriority {
  const text = sourcePhrase ?? "";
  if (NICE_PATTERNS.some((p) => p.test(text))) return "nice";
  if (MUST_PATTERNS.some((p) => p.test(text))) return "must";
  return "nice"; // ambiguous default — never invent urgency
}
