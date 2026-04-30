import { readFileSync } from 'fs';
import { join } from 'path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import NextImage from 'next/image';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkGfm from 'remark-gfm';
import { imageSize } from 'image-size';
import { Link } from '@/i18n/navigation';
import DiaryCta from '@/components/learn/DiaryCta';

// Markdown image renderer.
//
// Markdown `![alt](path)` would otherwise render as a bare `<img>` with no
// width/height, which causes Cumulative Layout Shift (CLS) — a Core Web Vital
// that Google factors into rankings. Articles with many inline images (e.g.
// the bladder-irritants set has 9) make CLS especially visible.
//
// We resolve dimensions at build time from the actual file in `public/`,
// then hand off to next/image for lazy-loading + responsive srcset + format
// negotiation. External URLs (rare in our content) fall back to a plain <img>
// since we can't measure them at build time.
function MdxImage({
  src,
  alt,
}: {
  src?: string;
  alt?: string;
}) {
  if (!src) return null;

  if (src.startsWith('http://') || src.startsWith('https://')) {
    return <img src={src} alt={alt ?? ''} loading="lazy" />;
  }

  const cleanPath = src.startsWith('/') ? src.slice(1) : src;
  const filePath = join(process.cwd(), 'public', cleanPath);

  let width = 1200;
  let height = 800;
  try {
    const dims = imageSize(readFileSync(filePath));
    if (dims.width && dims.height) {
      width = dims.width;
      height = dims.height;
    }
  } catch {
    // Image not yet on disk (e.g. during incremental dev). Fall back to
    // sensible default; CLS is best-effort here.
  }

  return (
    <NextImage
      src={src}
      alt={alt ?? ''}
      width={width}
      height={height}
      sizes="(max-width: 768px) 100vw, 768px"
    />
  );
}

const components = {
  a: ({ href = '', children, className, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isInternal = href.startsWith('/') && !href.startsWith('//');
    if (isInternal) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={className}
        {...rest}
      >
        {children}
      </a>
    );
  },
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="scroll-mt-24" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="scroll-mt-24" {...props} />
  ),
  img: MdxImage,
  DiaryCta,
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
