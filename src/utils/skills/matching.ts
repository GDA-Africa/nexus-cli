/**
 * Trigger matching — deterministic, no LLM.
 *
 * v1.2 and earlier matched with `task.toLowerCase().includes(trigger)`: the
 * task had to contain the trigger verbatim, so hit rate fell as trigger length
 * rose and word order was significant. SKILL_SPEC v1 §6 meanwhile promised
 * semantic matching, so the document told authors to write triggers the code
 * could never fire.
 *
 * This replaces containment with token-overlap scoring and — just as
 * importantly — **ranks** matches instead of admitting them in directory order,
 * so budget pressure drops the least relevant skill rather than an arbitrary
 * one.
 */

/**
 * Words carrying no discriminating power in a task description. Kept small on
 * purpose: an aggressive list would strip the domain words we match on.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'at',
  'by', 'with', 'from', 'into', 'this', 'that', 'these', 'those', 'it', 'its',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did',
  'i', 'we', 'you', 'my', 'our', 'me', 'us', 'need', 'want', 'please',
  'should', 'would', 'could', 'can', 'will', 'lets', 'let',
]);

/** Minimum share of a trigger's meaningful tokens that must appear in the task. */
const OVERLAP_FLOOR = 0.6;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9.+#-]+/)
    .map((token) => token.replace(/^[.+#-]+|[.+#-]+$/g, ''))
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Score one trigger against a task. Returns 0 when the trigger does not match.
 *
 * - a verbatim hit on word boundaries scores 1 (the old behaviour, preserved as
 *   the strongest signal so nothing that genuinely matched before stops
 *   matching). Boundaries matter: plain containment let a 3-letter trigger like
 *   "api" fire on "rapid".
 * - otherwise the score is the share of the trigger's meaningful tokens present
 *   in the task, and it must clear OVERLAP_FLOOR
 * - a single-token trigger must match that token exactly, and the token must be
 *   at least 4 characters, so an accidental one-word overlap cannot fire
 */
export function scoreTrigger(task: string, trigger: string): number {
  const normalizedTask = task.toLowerCase();
  const normalizedTrigger = trigger.toLowerCase().trim();
  if (normalizedTrigger.length === 0) return 0;

  if (containsOnWordBoundary(normalizedTask, normalizedTrigger)) return 1;

  const triggerTokens = tokenize(normalizedTrigger);
  if (triggerTokens.length === 0) return 0;

  const taskTokens = new Set(tokenize(normalizedTask));
  const hits = triggerTokens.filter((token) => taskTokens.has(token)).length;
  if (hits === 0) return 0;

  if (triggerTokens.length === 1) {
    const only = triggerTokens[0] ?? '';
    return only.length >= 4 && taskTokens.has(only) ? 0.8 : 0;
  }

  const overlap = hits / triggerTokens.length;
  return overlap >= OVERLAP_FLOOR ? overlap * 0.9 : 0;
}

/**
 * Verbatim containment, but only when the trigger sits on word boundaries.
 * Plain `includes` matched "api" inside "rapid" and "test" inside "latest".
 */
function containsOnWordBoundary(haystack: string, needle: string): boolean {
  const index = haystack.indexOf(needle);
  if (index < 0) return false;

  const before = haystack[index - 1];
  const after = haystack[index + needle.length];
  const isWordChar = (char: string | undefined) => char !== undefined && /[a-z0-9]/.test(char);

  return !isWordChar(before) && !isWordChar(after);
}

export interface TriggerMatch<T> {
  item: T;
  trigger: string;
  score: number;
}

/**
 * Score every item's triggers against the task and return the matches ranked
 * best-first. Ties break toward the more specific (longer) trigger.
 */
export function rankByTriggers<T>(
  task: string,
  items: readonly T[],
  triggersOf: (item: T) => readonly string[],
): Array<TriggerMatch<T>> {
  const matches: Array<TriggerMatch<T>> = [];

  for (const item of items) {
    let best: { trigger: string; score: number } | null = null;

    for (const trigger of triggersOf(item)) {
      const score = scoreTrigger(task, trigger);
      if (score <= 0) continue;
      if (!best || score > best.score || (score === best.score && trigger.length > best.trigger.length)) {
        best = { trigger, score };
      }
    }

    if (best) matches.push({ item, trigger: best.trigger, score: best.score });
  }

  return matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.trigger.length - a.trigger.length;
  });
}
