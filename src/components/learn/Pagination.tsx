import { Link } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

function buildHref(basePath: string, page: number): string {
  return page === 1 ? basePath : `${basePath}/page/${page}`;
}

function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: (number | 'ellipsis')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) items.push('ellipsis');
  for (let p = left; p <= right; p += 1) items.push(p);
  if (right < total - 1) items.push('ellipsis');
  items.push(total);
  return items;
}

export default async function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  const t = await getTranslations('learn.pagination');

  if (totalPages <= 1) return null;

  const prevHref = currentPage > 1 ? buildHref(basePath, currentPage - 1) : null;
  const nextHref = currentPage < totalPages ? buildHref(basePath, currentPage + 1) : null;
  const items = pageWindow(currentPage, totalPages);

  const baseLinkClass =
    'inline-flex items-center justify-center min-w-9 h-9 px-3 rounded-full text-sm font-medium transition-colors';
  const inactiveClass = `${baseLinkClass} bg-white border border-ipc-200 text-ipc-700 hover:border-ipc-400 hover:text-ipc-950`;
  const activeClass = `${baseLinkClass} bg-ipc-950 text-white border border-ipc-950`;
  const disabledClass = `${baseLinkClass} bg-white border border-ipc-100 text-ipc-300 cursor-default`;

  return (
    <nav aria-label={t('label')} className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {prevHref ? (
        <Link href={prevHref} rel="prev" className={inactiveClass} aria-label={t('prev')}>
          <ChevronLeft size={16} aria-hidden className="rtl:scale-x-[-1]" />
          <span className="ms-1">{t('prev')}</span>
        </Link>
      ) : (
        <span aria-hidden className={disabledClass}>
          <ChevronLeft size={16} className="rtl:scale-x-[-1]" />
          <span className="ms-1">{t('prev')}</span>
        </span>
      )}

      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, idx) => {
          if (item === 'ellipsis') {
            return (
              <li key={`e${idx}`} aria-hidden className="px-1 text-ipc-500">
                …
              </li>
            );
          }
          const isActive = item === currentPage;
          return (
            <li key={item}>
              {isActive ? (
                <span aria-current="page" className={activeClass}>
                  {item}
                </span>
              ) : (
                <Link href={buildHref(basePath, item)} className={inactiveClass}>
                  {item}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {nextHref ? (
        <Link href={nextHref} rel="next" className={inactiveClass} aria-label={t('next')}>
          <span className="me-1">{t('next')}</span>
          <ChevronRight size={16} aria-hidden className="rtl:scale-x-[-1]" />
        </Link>
      ) : (
        <span aria-hidden className={disabledClass}>
          <span className="me-1">{t('next')}</span>
          <ChevronRight size={16} className="rtl:scale-x-[-1]" />
        </span>
      )}
    </nav>
  );
}
