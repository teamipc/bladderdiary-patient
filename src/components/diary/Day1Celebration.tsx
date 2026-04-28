'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Check, Sunrise, Coffee, Home, CalendarPlus, Share2, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { buildDiaryIcs, downloadIcs, shareDiaryLink, anchorTimeLabel } from '@/lib/reminders';
import type { MorningAnchor } from '@/lib/types';

export type ReminderMethod = 'calendar' | 'share' | 'helper' | 'none';

interface Day1CelebrationProps {
  open: boolean;
  eventCount: number;
  onClose: (args: { anchor: MorningAnchor | null; method: ReminderMethod }) => void;
}

const ANCHOR_OPTIONS: { value: MorningAnchor; icon: typeof Sunrise; key: 'anchorWake' | 'anchorCoffee' | 'anchorBathroom' }[] = [
  { value: 'wake', icon: Sunrise, key: 'anchorWake' },
  { value: 'coffee', icon: Coffee, key: 'anchorCoffee' },
  { value: 'bathroom', icon: Home, key: 'anchorBathroom' },
];

export default function Day1Celebration({ open, eventCount, onClose }: Day1CelebrationProps) {
  const t = useTranslations('day1Celebration');
  const locale = useLocale();
  const { startDate } = useDiaryStore();
  const [selected, setSelected] = useState<MorningAnchor | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  if (!open) return null;

  const timeLabel = anchorTimeLabel(selected, locale);
  const day2Url = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/diary/day/2`
    : '';

  const handleCalendar = () => {
    const ics = buildDiaryIcs({
      startDate,
      anchor: selected,
      locale,
      url: day2Url,
      day2Title: t('icsDay2Title'),
      day3Title: t('icsDay3Title'),
      description: t('icsDescription', { count: eventCount }),
      alarmDescription: t('icsAlarm'),
    });
    downloadIcs(ics);
    onClose({ anchor: selected, method: 'calendar' });
  };

  const handleShare = async () => {
    await shareDiaryLink({
      title: t('shareTitle'),
      text: t('shareText', { count: eventCount }),
      url: day2Url,
    });
    onClose({ anchor: selected, method: 'share' });
  };

  const handleHelperShare = async () => {
    await shareDiaryLink({
      title: t('helperShareTitle'),
      text: t('helperShareText', { count: eventCount, time: timeLabel }),
      url: day2Url,
    });
    onClose({ anchor: selected, method: 'helper' });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-ipc-50 via-white to-ipc-100 animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="day1-celebration-title"
    >
      <div className="flex-1 flex flex-col items-center px-5 pt-5 pb-4 max-w-lg md:max-w-xl mx-auto w-full">
        <div className="animate-scale-in mb-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-ipc-400 to-ipc-600 flex items-center justify-center shadow-xl">
            <Check size={32} className="text-white" strokeWidth={3} />
          </div>
        </div>

        <h1
          id="day1-celebration-title"
          className="text-2xl font-bold text-ipc-950 text-center mb-1.5 animate-fade-slide-up stagger-1"
        >
          {t('title')}
        </h1>

        {/* Combined evidence + 2-of-3 progress in one tighter line */}
        <p className="text-sm text-ipc-600 text-center mb-4 animate-fade-slide-up stagger-2 px-2 leading-snug">
          {t('evidence', { count: eventCount })} {t('subtitle')}
        </p>

        {/* Anchor picker — compact 3-column grid so all 4 reminder options fit on iPhone SE */}
        <div className="w-full animate-fade-slide-up stagger-3 mb-4">
          <p className="text-sm font-semibold text-ipc-800 text-center mb-2">
            {t('anchorPrompt')}
          </p>

          <div className="grid grid-cols-3 gap-2">
            {ANCHOR_OPTIONS.map(({ value, icon: Icon, key }) => {
              const isSelected = selected === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelected(value)}
                  className={`min-h-[68px] px-2 py-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.96]
                    ${isSelected
                      ? 'bg-ipc-500 border-ipc-600 text-white shadow-lg'
                      : 'bg-white border-ipc-200 text-ipc-800 hover:bg-ipc-50'
                    }`}
                  aria-pressed={isSelected}
                >
                  <Icon size={20} className={isSelected ? 'text-white' : 'text-ipc-500'} />
                  <span className="text-xs font-semibold text-center leading-tight">{t(key)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reminder options — all 4 visible without scrolling */}
        <div className="w-full space-y-2 animate-fade-slide-up stagger-4">
          <p className="text-sm font-semibold text-ipc-800 text-center mb-1">
            {selected ? t('reminderPromptWithTime', { time: timeLabel }) : t('reminderPrompt')}
          </p>

          <Button onClick={handleCalendar} variant="primary" size="lg" fullWidth>
            <CalendarPlus size={20} />
            {t('addToCalendar')}
          </Button>

          <Button onClick={handleShare} variant="secondary" size="lg" fullWidth>
            <Share2 size={20} />
            {t('emailMyself')}
          </Button>

          <Button onClick={handleHelperShare} variant="secondary" size="lg" fullWidth>
            <Users size={20} />
            {t('askHelper')}
          </Button>

          <button
            type="button"
            onClick={() => onClose({ anchor: selected, method: 'none' })}
            className="w-full min-h-[44px] text-center text-sm text-ipc-500 hover:text-ipc-700 py-2 font-medium safe-bottom"
          >
            {t('skip')}
          </button>

          <p className="text-[11px] text-ipc-500 text-center leading-relaxed pt-0">
            {t('privacyNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
