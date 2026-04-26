import { Link } from '@/i18n/navigation';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ipc-500">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-ipc-700 underline-offset-2 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-ipc-700 font-medium' : ''}>{item.label}</span>
              )}
              {!isLast && <ChevronRight size={12} className="text-ipc-300" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
