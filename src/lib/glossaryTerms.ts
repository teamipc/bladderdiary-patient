import type { Locale } from '@/i18n/config';
import type { GlossaryTerm } from './remarkAutoLinkGlossary';

/**
 * Per-locale lists of glossary terms eligible for auto-linking in article
 * body prose. Sorted longest-phrase-first so multi-word phrases match
 * before short overlapping ones (e.g. "post-void residual" before "PVR").
 *
 * URLs are built as `/<locale>/learn/glossary/<slug>` regardless of phrase
 * locale: the slug always stays in EN for hreflang parity.
 */
export const GLOSSARY_TERMS_BY_LOCALE: Record<Locale, GlossaryTerm[]> = {
  en: [
    { phrase: 'overactive bladder', slug: 'overactive-bladder' },
    { phrase: 'post-void residual', slug: 'post-void-residual' },
    { phrase: 'urinary frequency', slug: 'urinary-frequency' },
    { phrase: 'urinary urgency', slug: 'urinary-urgency' },
    { phrase: 'OAB', slug: 'overactive-bladder', wholeWord: true },
    { phrase: 'PVR', slug: 'post-void-residual', wholeWord: true },
    { phrase: 'nocturia', slug: 'nocturia' },
  ],
  fr: [
    { phrase: 'résidu post-mictionnel', slug: 'post-void-residual' },
    { phrase: 'vessie hyperactive', slug: 'overactive-bladder' },
    { phrase: 'urgence mictionnelle', slug: 'urinary-urgency' },
    { phrase: 'fréquence urinaire', slug: 'urinary-frequency' },
    { phrase: 'pollakiurie', slug: 'urinary-frequency' },
    { phrase: 'OAB', slug: 'overactive-bladder', wholeWord: true },
    { phrase: 'RPM', slug: 'post-void-residual', wholeWord: true },
    { phrase: 'nycturie', slug: 'nocturia' },
  ],
  es: [
    { phrase: 'residuo posmiccional', slug: 'post-void-residual' },
    { phrase: 'vejiga hiperactiva', slug: 'overactive-bladder' },
    { phrase: 'frecuencia urinaria', slug: 'urinary-frequency' },
    { phrase: 'urgencia urinaria', slug: 'urinary-urgency' },
    { phrase: 'OAB', slug: 'overactive-bladder', wholeWord: true },
    { phrase: 'RPM', slug: 'post-void-residual', wholeWord: true },
    { phrase: 'nicturia', slug: 'nocturia' },
  ],
  pt: [
    { phrase: 'resíduo pós-miccional', slug: 'post-void-residual' },
    { phrase: 'bexiga hiperativa', slug: 'overactive-bladder' },
    { phrase: 'frequência urinária', slug: 'urinary-frequency' },
    { phrase: 'urgência urinária', slug: 'urinary-urgency' },
    { phrase: 'OAB', slug: 'overactive-bladder', wholeWord: true },
    { phrase: 'RPM', slug: 'post-void-residual', wholeWord: true },
    { phrase: 'noctúria', slug: 'nocturia' },
  ],
  zh: [
    { phrase: '膀胱过度活动症', slug: 'overactive-bladder' },
    { phrase: '膀胱残余尿量', slug: 'post-void-residual' },
    { phrase: '膀胱残余尿', slug: 'post-void-residual' },
    { phrase: '夜尿症', slug: 'nocturia' },
    { phrase: 'OAB', slug: 'overactive-bladder', wholeWord: true },
    { phrase: 'PVR', slug: 'post-void-residual', wholeWord: true },
    { phrase: '尿频', slug: 'urinary-frequency' },
    { phrase: '尿急', slug: 'urinary-urgency' },
  ],
  ar: [
    { phrase: 'فرط نشاط المثانة', slug: 'overactive-bladder' },
    { phrase: 'البول المتبقي بعد التبول', slug: 'post-void-residual' },
    { phrase: 'البول المتبقي', slug: 'post-void-residual' },
    { phrase: 'إلحاح التبول', slug: 'urinary-urgency' },
    { phrase: 'تكرار التبول', slug: 'urinary-frequency' },
    { phrase: 'التبول الليلي', slug: 'nocturia' },
    { phrase: 'OAB', slug: 'overactive-bladder', wholeWord: true },
    { phrase: 'PVR', slug: 'post-void-residual', wholeWord: true },
  ],
};
