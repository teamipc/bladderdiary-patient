import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkGfm from 'remark-gfm';
import { Link } from '@/i18n/navigation';

const components = {
  a: ({ href = '', children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isInternal = href.startsWith('/') && !href.startsWith('//');
    if (isInternal) {
      return (
        <Link href={href} className="text-ipc-700 underline underline-offset-2 hover:text-ipc-900">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-ipc-700 underline underline-offset-2 hover:text-ipc-900"
        {...rest}
      >
        {children}
      </a>
    );
  },
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-2xl font-bold text-ipc-950 mt-10 mb-3 scroll-mt-24" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-lg font-semibold text-ipc-900 mt-7 mb-2 scroll-mt-24" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-base text-ipc-800 leading-relaxed mb-4" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc pl-6 space-y-1.5 text-ipc-800 mb-4" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-6 space-y-1.5 text-ipc-800 mb-4" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-4 border-ipc-300 pl-4 italic text-ipc-700 my-4"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-ipc-100" />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-ipc-950" {...props} />
  ),
};

export function RenderMdx({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug,
            [
              rehypeAutolinkHeadings,
              { behavior: 'wrap', properties: { className: 'no-underline' } },
            ],
          ],
        },
      }}
    />
  );
}
