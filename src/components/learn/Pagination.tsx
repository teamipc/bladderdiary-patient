import { Link } from '@/i18n/navigation';
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

  const items = pageWindow(currentPage, totalPages);

  return (
    <nav aria-label={t('label')} className="mt-12 flex justify-center">
      <ol className="flex items-baseline gap-6 sm:gap-8">
        {items.map((item, idx) => {
          if (item === 'ellipsis') {
            return (
              <li key={`e${idx}`} aria-hidden className="text-ipc-500 text-base">
                …
              </li>
            );
          }
          const isActive = item === currentPage;
          const rel = item === currentPage - 1 ? 'prev' : item === currentPage + 1 ? 'next' : undefined;
          return (
            <li key={item}>
              {isActive ? (
                <span
                  aria-current="page"
                  className="text-base font-semibold text-ipc-950 border-b-2 border-ipc-950 pb-1"
                >
                  {item}
                </span>
              ) : (
                <Link
                  href={buildHref(basePath, item)}
                  rel={rel}
                  className="text-base text-ipc-700 hover:text-ipc-950 transition-colors"
                >
                  {item}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
