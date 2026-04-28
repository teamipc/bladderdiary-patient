import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ShieldCheck } from 'lucide-react';
import type { Author } from '@/lib/content';
import { authorInitials } from '@/lib/authorByline';

interface Props {
  author: Author | null;
  reviewer?: Author | null;
  metaLine: string;
  reviewedByLabel: string;
}

export default function AuthorByline({
  author,
  reviewer,
  metaLine,
  reviewedByLabel,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="w-11 h-11 rounded-full bg-ipc-100 text-ipc-700 flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden"
        >
          {author?.photoUrl ? (
            <Image
              src={author.photoUrl}
              alt=""
              width={44}
              height={44}
              className="w-full h-full object-cover"
            />
          ) : (
            authorInitials(author?.name)
          )}
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          {author ? (
            <Link
              href={`/learn/authors/${author.slug}`}
              className="text-base font-semibold text-ipc-900 hover:text-ipc-700 underline-offset-2 hover:underline truncate"
            >
              {author.name}
            </Link>
          ) : (
            <span className="text-base font-semibold text-ipc-900">
              Bladder Diaries Team
            </span>
          )}
          <span className="text-sm text-ipc-600 mt-0.5">{metaLine}</span>
        </div>
      </div>
      {reviewer && (
        <div className="flex items-center gap-2 text-sm text-ipc-700">
          <ShieldCheck size={14} className="text-ipc-500 shrink-0" aria-hidden />
          <span>
            {reviewedByLabel}{' '}
            <Link
              href={`/learn/authors/${reviewer.slug}`}
              className="font-medium text-ipc-900 hover:text-ipc-700 underline-offset-2 hover:underline"
            >
              {reviewer.name}
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}
