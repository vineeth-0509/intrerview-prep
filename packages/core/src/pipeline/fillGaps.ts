import type { Question, Requirement } from "../types";
import { checkCoverage } from "../coverage";
import { generateAllQuestions, type GenerateQuestionsDeps } from "./generateQuestions";



function nextQuestionIndex(existing: Question[]): number {
  let max = 0;
  for (const q of existing) {
    const match = /^q(\d+)$/.exec(q.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

export interface RunCoveragePassesResult {
  questions: Question[];
  passes: number;
  uncoveredRequirementIds: string[];
}

interface RoleContext {
  title: string;
  seniority: string;
}

export async function runCoveragePasses(
  requirements: Requirement[],
  initialQuestions: Question[],
  role: RoleContext,
  apiKey: string,
  deps: GenerateQuestionsDeps = {},
  maxPasses = 2,
): Promise<RunCoveragePassesResult> {
  let questions = initialQuestions;
  let passes = 1;

  while (passes < maxPasses) {
    const uncoveredIds = checkCoverage(requirements, questions);
    if (uncoveredIds.length === 0) break;

    const gapRequirements = requirements.filter((r) => uncoveredIds.includes(r.id));
    const startIndex = nextQuestionIndex(questions);
    const gapResult = await generateAllQuestions(gapRequirements, role, apiKey, deps, { startIndex });

    questions = [...questions, ...gapResult.questions];
    passes++;
  }

  return {
    questions,
    passes,
    uncoveredRequirementIds: checkCoverage(requirements, questions),
  };
}
