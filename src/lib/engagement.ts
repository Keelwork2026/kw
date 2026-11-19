/**
 * Progress, not pressure. Keelwork shows what you've achieved and the next
 * useful step — never streaks, countdowns or "don't lose your progress"
 * nudges. Milestones come from real workspace state, so nothing is faked.
 */
export type Milestone = { key: string; label: string; hint: string; href: string; done: boolean };

export function progress(milestones: Milestone[]): { done: number; total: number; percent: number; next: Milestone | null; reached: Milestone[] } {
  const reached = milestones.filter((m) => m.done);
  const total = milestones.length;
  return {
    done: reached.length,
    total,
    percent: total ? Math.round((reached.length / total) * 100) : 0,
    next: milestones.find((m) => !m.done) ?? null,
    reached,
  };
}
