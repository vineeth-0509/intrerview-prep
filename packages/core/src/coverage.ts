import type { Coverage, Question, Requirement } from "./types";


export function checkCoverage(
  requirements: Requirement[],
  questions: Question[],
): string[] {
  const covered = new Set<string>();
  for (const question of questions) {
    for (const requirementId of question.requirement_ids) {
      covered.add(requirementId);
    }
  }
  return requirements
    .filter((requirement) => !covered.has(requirement.id))
    .map((requirement) => requirement.id);
}


export function buildCoverage(
  requirements: Requirement[],
  questions: Question[],
  passes: number,
): Coverage {
  return {
    uncovered_requirement_ids: checkCoverage(requirements, questions),
    passes,
  };
}


export function isFullyCovered(
  requirements: Requirement[],
  questions: Question[],
): boolean {
  return checkCoverage(requirements, questions).length === 0;
}
