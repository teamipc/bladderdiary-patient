/**
 * Curated topic taxonomy for the /learn navigation.
 *
 * Articles in the patient app are organized into topic folders
 * (`content/articles/en/{topic}/...`). This file groups those topic folders
 * into a small set of patient-friendly categories so the /learn hub can
 * render meaningful sections instead of a flat alphabetical grid.
 *
 * Add new topic folder names to the relevant group's `topics` array as the
 * content catalog grows. Topic folders not matched by any group fall through
 * to a "More topics" section so nothing is hidden.
 */

export interface TopicGroup {
  /**
   * Stable key. Maps to i18n at `learn.hub.topicGroups.<key>.{label,description}`.
   * Never display this raw — always render via t().
   */
  key: string;
  topics: string[];
}

export const TOPIC_GROUPS: TopicGroup[] = [
  {
    key: 'bladder-symptoms',
    topics: [
      'oab',
      'urgency',
      'frequency',
      'urge-incontinence',
      'stress-incontinence',
      'mixed-incontinence',
    ],
  },
  {
    key: 'nighttime',
    topics: ['nocturia', 'sleep-and-bladder'],
  },
  {
    key: 'mens-health',
    topics: ['bph', 'post-prostatectomy', 'prostate-health'],
  },
  {
    key: 'womens-health',
    topics: [
      'pelvic-floor',
      'pelvic-organ-prolapse',
      'postpartum',
      'menopause',
      'pregnancy',
    ],
  },
  {
    key: 'bladder-training',
    topics: ['bladder-training', 'behavioral-therapy', 'pelvic-floor-exercises'],
  },
  {
    key: 'daily-life',
    topics: ['hydration', 'diet', 'lifestyle', 'caffeine'],
  },
];

export function findGroupForTopic(topic: string): TopicGroup | undefined {
  return TOPIC_GROUPS.find((g) => g.topics.includes(topic));
}

export function getGroupedTopicSet(): Set<string> {
  return new Set(TOPIC_GROUPS.flatMap((g) => g.topics));
}

/**
 * Curated chip rail shown on the /learn hub.
 *
 * Each chip is a real link to a real URL — chips are NOT client-side filter
 * state. This preserves crawlable internal-link equity from the hub to the
 * audience and topic pillars.
 *
 * Topic-bound chips (those with a `topic` field) only render when that topic
 * folder has published content. As the catalog grows, edit this list to
 * surface the highest-signal entry points (6-8 chips total is the sweet spot —
 * the full taxonomy still lives in the "Explore by topic" list further down).
 */
export interface FeaturedChip {
  /** i18n key under `learn.hub.<key>` */
  key: string;
  /** Locale-agnostic /learn route the chip links to */
  href: string;
  /** When set, the chip only renders if this topic folder exists in the catalog */
  topic?: string;
}

export const FEATURED_CHIPS: FeaturedChip[] = [
  { key: 'chipAll', href: '/learn' },
  { key: 'chipMensHealth', href: '/learn/for-men' },
  { key: 'chipWomensHealth', href: '/learn/for-women' },
  { key: 'chipBladderIrritants', href: '/learn/bladder-irritants', topic: 'bladder-irritants' },
  { key: 'chipNighttime', href: '/learn/nocturia', topic: 'nocturia' },
  { key: 'chipUrgency', href: '/learn/urgency', topic: 'urgency' },
  { key: 'chipTraining', href: '/learn/bladder-training', topic: 'bladder-training' },
  { key: 'chipDailyLife', href: '/learn/hydration', topic: 'hydration' },
];
