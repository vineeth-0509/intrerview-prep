import type { Kit, QuestionCategory, RequirementKind } from "../types";
import { fetchPage, type FetchedPage } from "./fetchPage";
import { generateCompanyBrief, type GenerateCompanyBriefDeps } from "./generateCompanyBrief";
import { generateAllQuestions, type GenerateQuestionsDeps } from "./generateQuestions";
import { deriveFlashcards } from "./deriveFlashcards";
import { buildSchedule } from "../scheduler";
import { checkCoverage } from "../coverage";
import { mergeRegeneratedList, mergeRegeneratedSchedule, mergeRegeneratedSingle, isRegeneratable } from "./regenerate";


export type RegenerateScope = "company_brief" | "schedule" | "technical" | "behavioural" | "company-fit";

const KIND_BY_CATEGORY: Partial<Record<QuestionCategory, RequirementKind>> = {
  technical: "technical",
  behavioural: "behavioural",
  "company-fit": "domain",
};

function nextIndex(ids: string[], prefix: string): number {
  let max = 0;
  for (const id of ids) {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

export interface RegenerateSectionInput {
  kit: Kit;
  scope: RegenerateScope;
  openaiApiKey: string;
}

export interface RegenerateSectionDeps {
  briefDeps?: GenerateCompanyBriefDeps;
  questionsDeps?: GenerateQuestionsDeps;
  fetchPageFn?: typeof fetchPage;
}

export class InvalidRegenerateScopeError extends Error {}

export async function regenerateSection(
  input: RegenerateSectionInput,
  deps: RegenerateSectionDeps = {},
): Promise<Kit> {
  const { kit, scope, openaiApiKey } = input;

  if (scope === "company_brief") {
    const doFetch = deps.fetchPageFn ?? fetchPage;
    const fetched = await Promise.all(kit.source.pages_used.map((url) => doFetch(url)));
    const pages = fetched
      .filter((r): r is FetchedPage => r.ok)
      .map((p) => ({ url: p.url, title: p.title, text: p.text }));

    const freshBrief = await generateCompanyBrief(kit.source.company, pages, [], openaiApiKey, deps.briefDeps);
    return { ...kit, company_brief: mergeRegeneratedSingle(kit.company_brief, freshBrief) };
  }

  if (scope === "schedule") {
    const freshDays = buildSchedule(kit.role.requirements, kit.questions, kit.schedule.days_available).days;
    return {
      ...kit,
      schedule: { ...kit.schedule, days: mergeRegeneratedSchedule(kit.schedule.days, freshDays) },
    };
  }

  const kind = KIND_BY_CATEGORY[scope];
  if (!kind) {
    throw new InvalidRegenerateScopeError(`Unsupported regenerate scope: ${scope}`);
  }

  const scopeRequirements = kit.role.requirements.filter((r) => r.kind === kind);
  const role = { title: kit.role.title, seniority: kit.role.seniority };

  // Don't spend an LLM call regenerating a requirement that's already
  // covered by a preserved (pinned/edited/created) question — only
  // requirements whose coverage was solely from untouched-generated
  // questions actually need fresh content.
  const existingQuestionsInScope = kit.questions.filter((q) => q.category === scope);
  const preservedInScope = existingQuestionsInScope.filter((q) => !isRegeneratable(q.meta));
  const preservedCoveredRequirementIds = new Set(preservedInScope.flatMap((q) => q.requirement_ids));
  const requirementsNeedingFreshQuestions = scopeRequirements.filter(
    (r) => !preservedCoveredRequirementIds.has(r.id),
  );

  const questionStartIndex = nextIndex(
    kit.questions.map((q) => q.id),
    "q",
  );
  const freshResult = await generateAllQuestions(
    requirementsNeedingFreshQuestions,
    role,
    openaiApiKey,
    deps.questionsDeps,
    { startIndex: questionStartIndex },
  );

  const mergedQuestionsInScope = mergeRegeneratedList(existingQuestionsInScope, freshResult.questions);
  const updatedQuestions = [
    ...kit.questions.filter((q) => q.category !== scope),
    ...mergedQuestionsInScope,
  ];

  const scopeRequirementIds = new Set(scopeRequirements.map((r) => r.id));
  const existingFlashcardsInScope = kit.flashcards.filter((f) =>
    f.requirement_ids.some((rid) => scopeRequirementIds.has(rid)),
  );
  const flashcardStartIndex = nextIndex(
    kit.flashcards.map((f) => f.id),
    "f",
  );
  const freshFlashcards = deriveFlashcards(freshResult.questions, flashcardStartIndex);
  const mergedFlashcardsInScope = mergeRegeneratedList(existingFlashcardsInScope, freshFlashcards);
  const updatedFlashcards = [
    ...kit.flashcards.filter((f) => !f.requirement_ids.some((rid) => scopeRequirementIds.has(rid))),
    ...mergedFlashcardsInScope,
  ];

  const uncoveredRequirementIds = checkCoverage(kit.role.requirements, updatedQuestions);
  const freshScheduleDays = buildSchedule(kit.role.requirements, updatedQuestions, kit.schedule.days_available).days;
  const mergedScheduleDays = mergeRegeneratedSchedule(kit.schedule.days, freshScheduleDays);

  return {
    ...kit,
    questions: updatedQuestions,
    flashcards: updatedFlashcards,
    coverage: { uncovered_requirement_ids: uncoveredRequirementIds, passes: kit.coverage.passes + 1 },
    schedule: { ...kit.schedule, days: mergedScheduleDays },
  };
}
