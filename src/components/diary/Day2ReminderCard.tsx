'use client';

import { useState } from 'react';
import { CalendarPlus, Share2, Users, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useDiaryStore } from '@/lib/store';
import { buildDiaryIcs, downloadIcs, shareDiaryLink, anchorTimeLabel } from '@/lib/reminders';

/**
 * Lightweight reminder check-in shown when Day 2 completes for a patient
 * who skipped reminder setup on Day 1 (i.e. `morningAnchor` is null). The
 * full Day1Celebration is intentionally not repeated — Day 2 has lower
 * drop-off than Day 1, so the design is one inline card under the
 * "Day 2 complete" banner offering the same three reminder methods.
 *
 * Skipped entirely when an anchor already exists, since Day 1 already
 * delivered an .ics or share link with both Day 2 and Day 3 events on it.
 *
 * The card self-dismisses on any action so the user isn't nagged twice.
 * Local-state dismiss only — we don't persist "Day 2 reminder shown"
 * because the cost of re-showing is low (a card, not a modal) and the
 * benefit of a second chance is high.
 */
export default function Day2ReminderCard() {
  const t = useTranslations('day2Reminder');
  const tdc = useTranslations('day1Celebration');
  const locale = useLocale();
  const { startDate, morningAnchor, setMorningAnchor, voids, drinks, leaks, wakeTimes, bedtimes } = useDiaryStore();
  const [dismissed, setDismissed] = useState(false);

  if (morningAnchor || dismissed) return null;

  // Default the anchor to "wake" — keeps the card shape light by skipping
  // the 3-way anchor picker. The user can still tweak from settings later
  // if we add that surface.
  const anchor = 'wake';
  const timeLabel = anchorTimeLabel(anchor, locale);
  const day3Url = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/diary/day/3`
    : '';

  // Day-1+Day-2 totals so the share text reflects what they've already invested.
  const eventCount =
    voids.length +
    drinks.length +
    (leaks?.length ?? 0) +
    (wakeTimes?.length ?? 0) +
    bedtimes.length;

  const finish = () => {
    setMorningAnchor(anchor);
    setDismissed(true);
  };

  const handleCalendar = () => {
    const ics = buildDiaryIcs({
      startDate,
      anchor,
      locale,
      url: day3Url,
      day2Title: tdc('icsDay2Title'),
      day3Title: tdc('icsDay3Title'),
      description: tdc('icsDescription', { count: eventCount }),
      alarmDescription: tdc('icsAlarm'),
    });
    downloadIcs(ics);
    finish();
  };

  const handleShare = async () => {
    await shareDiaryLink({
      title: tdc('shareTitle'),
      text: tdc('shareText', { count: eventCount }),
      url: day3Url,
    });
    finish();
  };

  const handleHelper = async () => {
    await shareDiaryLink({
      title: tdc('helperShareTitle'),
      text: tdc('helperShareText', { count: eventCount, time: timeLabel }),
      url: day3Url,
    });
    finish();
  };

  return (
    <div className="px-4 py-3 rounded-2xl bg-ipc-50 border border-ipc-200 relative animate-fade-slide-up">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={tdc('skip')}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-ipc-400 hover:bg-ipc-100 active:scale-[0.9]"
      >
        <X size={14} />
      </button>
      <p className="text-sm font-semibold text-ipc-900 mb-0.5 pr-7">{t('title')}</p>
      <p className="text-xs text-ipc-600 mb-3 leading-snug">
        {t('subtitle', { time: timeLabel })}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleCalendar}
          className="min-h-[60px] px-2 py-2 rounded-xl border border-ipc-300 bg-white flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-all"
        >
          <CalendarPlus size={18} className="text-ipc-600" />
          <span className="text-[11px] font-semibold text-ipc-800 text-center leading-tight">
            {t('calendar')}
          </span>
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="min-h-[60px] px-2 py-2 rounded-xl border border-ipc-300 bg-white flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-all"
        >
          <Share2 size={18} className="text-ipc-600" />
          <span className="text-[11px] font-semibold text-ipc-800 text-center leading-tight">
            {t('email')}
          </span>
        </button>
        <button
          type="button"
          onClick={handleHelper}
          className="min-h-[60px] px-2 py-2 rounded-xl border border-ipc-300 bg-white flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-all"
        >
          <Users size={18} className="text-ipc-600" />
          <span className="text-[11px] font-semibold text-ipc-800 text-center leading-tight">
            {t('helper')}
          </span>
        </button>
      </div>
    </div>
  );
}
