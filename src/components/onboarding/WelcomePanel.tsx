'use client';

import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import Container from '@/components/layout/Container';
import PrivacyGraphic from './PrivacyGraphic';

interface WelcomePanelProps {
  onStart: () => void;
}

/**
 * WelcomePanel — Phase 14 EM-01 (welcome-panel install site).
 *
 * Hero surface that replaces the prior logo + heroTitle + heroSubtitle + Start
 * Tracking button block on the landing page (the `!diaryStarted && !showOnboarding`
 * branch). Frames the value in one sentence, sets the time expectation in one
 * sentence, offers a primary CTA, and houses the animated privacy graphic +
 * disclosure below.
 *
 * The component is pure presentation. The `onStart` callback wires analytics
 * and `setShowOnboarding(true)` in the parent so this stays test-trivial.
 *
 * Layout: uses Container variant="narrow" for the same editorial reading column
 * the existing onboarding wizard already lives in (DTUX-04). The h1 carries the
 * page's only h1 role; ariaLabelledBy via the outer <section>.
 */
export default function WelcomePanel({ onStart }: WelcomePanelProps) {
  const t = useTranslations('welcome');

  return (
    <section aria-labelledby="welcome-heading">
      <Container
        variant="narrow"
        as="div"
        noPadding
        className="px-6 sm:px-6 pt-8 md:pt-16 pb-8 flex flex-col items-center"
      >
        <div className="text-center mb-6 md:mb-8 animate-fade-slide-up max-w-xl">
          <h1
            id="welcome-heading"
            className="text-2xl md:text-4xl font-bold text-ipc-950 mb-3 md:mb-4 leading-tight text-balance"
          >
            {t('headline')}
          </h1>
          <p className="text-base md:text-lg text-ipc-600 leading-relaxed text-balance">
            {t('body')}
          </p>
        </div>

        <div className="w-full md:max-w-md animate-fade-slide-up stagger-2">
          <Button
            variant="hero"
            onClick={onStart}
            fullWidth
            size="lg"
          >
            {t('startCta')}
          </Button>
        </div>

        <div className="w-full md:max-w-md animate-fade-slide-up stagger-3">
          <PrivacyGraphic />
        </div>
      </Container>
    </section>
  );
}
