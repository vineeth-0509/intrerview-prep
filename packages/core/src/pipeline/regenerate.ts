import type { ItemMeta, ScheduleDay } from "../types";


function isUntouchedGenerated(meta: ItemMeta | undefined): boolean {
  if (!meta) return true; // no meta at all is treated as untouched/generated
  return meta.source === "generated" && !meta.pinned;
}

/** Exported so regenerateSection can decide which requirements already
 *  have protected coverage before spending an LLM call on them again. */
export function isRegeneratable(meta: ItemMeta | undefined): boolean {
  return isUntouchedGenerated(meta);
}

export function mergeRegeneratedList<T extends { meta?: ItemMeta }>(
  existingInScope: T[],
  freshItems: T[],
): T[] {
  const preserved = existingInScope.filter((item) => !isUntouchedGenerated(item.meta));
  return [...preserved, ...freshItems];
}

/**
 * §7 applied to the company_brief object (a single item, not a list): if
 * the user pinned it or edited it, regeneration is a no-op that returns
 * the existing brief unchanged. Otherwise the fresh brief replaces it.
 */
export function mergeRegeneratedSingle<T extends { meta?: ItemMeta }>(existing: T, fresh: T): T {
  return isUntouchedGenerated(existing.meta) ? fresh : existing;
}

/**
 * Schedule is regenerated as a whole (buildSchedule recomputes every
 * day from the current question set), then any day the user pinned or
 * edited is spliced back in by day number, overwriting whatever the
 * fresh recomputation put there. Day number is Appendix A's stable key
 * for a schedule day, so this doesn't need item ids to line up between
 * the old and new schedule.
 */
export function mergeRegeneratedSchedule(existingDays: ScheduleDay[], freshDays: ScheduleDay[]): ScheduleDay[] {
  const existingByDay = new Map(existingDays.map((d) => [d.day, d]));
  return freshDays.map((freshDay) => {
    const existing = existingByDay.get(freshDay.day);
    if (existing && !isUntouchedGenerated(existing.meta)) {
      return existing;
    }
    return freshDay;
  });
}
