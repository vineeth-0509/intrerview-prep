import type { Flashcard, Question } from "../types";


export function deriveFlashcards(questions: Question[], startIndex = 1): Flashcard[] {
  return questions.map((q, i) => ({
    id: `f${startIndex + i}`,
    front: q.prompt,
    back: q.answer_outline || "(no outline provided)",
    requirement_ids: [...q.requirement_ids],
    meta: { source: "generated", pinned: false, version: 0 },
  }));
}
