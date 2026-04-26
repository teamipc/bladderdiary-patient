import { Link } from '@/i18n/navigation';
import { Clock, ShieldCheck } from 'lucide-react';
import type { Author } from '@/lib/content';

interface Props {
  author: Author | null;
  reviewer?: Author | null;
  lastReviewedAt?: string;
  updatedAt: string;
  readingTimeMin: number;
  labels: {
    by: string;
    reviewedBy: string;
    lastReviewed: string;
    updated: string;
    readingTime: (min: number) => string;
  };
}

export default function AuthorByline({
  author,
  reviewer,
  lastReviewedAt,
  updatedAt,
  readingTimeMin,
  labels,
}: Props) {
  return (
    <div className="rounded-2xl bg-white border border-ipc-100 p-4 space-y-2 text-sm">
      {author && (
        <div className="flex items-baseline gap-2">
          <span className="text-ipc-500 shrink-0">{labels.by}</span>
          <Link
            href={`/learn/authors/${author.slug}`}
            className="font-semibold text-ipc-900 hover:text-ipc-700 underline-offset-2 hover:underline"
          >
            {author.name}
          </Link>
          {author.credentials && (
            <span className="text-ipc-500 text-xs">{author.credentials}</span>
          )}
        </div>
      )}
      {reviewer && (
        <div className="flex items-baseline gap-2">
          <ShieldCheck size={14} className="text-ipc-500 shrink-0 self-center" aria-hidden />
          <span className="text-ipc-500 shrink-0">{labels.reviewedBy}</span>
          <Link
            href={`/learn/authors/${reviewer.slug}`}
            className="font-medium text-ipc-800 hover:text-ipc-700 underline-offset-2 hover:underline"
          >
            {reviewer.name}
          </Link>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ipc-500 pt-1">
        <span className="flex items-center gap-1">
          <Clock size={12} aria-hidden />
          {labels.readingTime(readingTimeMin)}
        </span>
        {lastReviewedAt && (
          <span>
            {labels.lastReviewed}: {lastReviewedAt}
          </span>
        )}
        {!lastReviewedAt && (
          <span>
            {labels.updated}: {updatedAt}
          </span>
        )}
      </div>
    </div>
  );
}
