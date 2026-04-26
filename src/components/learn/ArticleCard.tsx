import { Link } from '@/i18n/navigation';
import { Clock } from 'lucide-react';
import type { Article } from '@/lib/content';

export default function ArticleCard({ article }: { article: Article }) {
  const fm = article.frontmatter;
  return (
    <Link
      href={article.urlPath.replace(/^\/(en|fr|es)/, '')}
      className="block rounded-2xl bg-white border border-ipc-100 p-4 hover:border-ipc-300 hover:shadow-sm transition-all"
    >
      <h3 className="text-base font-semibold text-ipc-950 mb-1.5 leading-snug">{fm.title}</h3>
      <p className="text-sm text-ipc-600 leading-relaxed mb-3 line-clamp-2">{fm.description}</p>
      <div className="flex items-center gap-3 text-xs text-ipc-400">
        <span className="flex items-center gap-1">
          <Clock size={12} aria-hidden />
          {article.readingTimeMin} min
        </span>
        {fm.audience.length === 1 && (
          <span className="text-ipc-500">
            {fm.audience[0] === 'men' ? 'For men' : 'For women'}
          </span>
        )}
      </div>
    </Link>
  );
}
