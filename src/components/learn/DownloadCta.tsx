import { Download, FileText } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

interface DownloadCtaProps {
  title: string;
  body: string;
  href: string;
  fileLabel?: string;
}

export default async function DownloadCta({
  title,
  body,
  href,
  fileLabel,
}: DownloadCtaProps) {
  const t = await getTranslations('learn.article');

  return (
    <aside className="not-prose my-9 sm:my-10 rounded-2xl bg-gradient-to-br from-amber-50 to-stone-50 border border-amber-200/70 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex shrink-0 size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
          <FileText size={24} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-bold text-ipc-950 mb-2 leading-tight tracking-tight">
            {title}
          </h3>
          <p className="text-base text-ipc-700 mb-4 leading-relaxed">
            {body}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <a
              href={href}
              download
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-ipc-900 hover:bg-ipc-950 text-white no-underline font-semibold text-sm sm:text-base shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Download size={16} aria-hidden />
              <span>{t('ctaDownloadPdf')}</span>
            </a>
            {fileLabel && (
              <span className="text-xs text-ipc-600 font-medium">
                {fileLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
