import type { Metadata } from 'next';
import Link from 'next/link';
import enMessages from '../../messages/en.json';

const t = enMessages.notFound;
const tBreadcrumbs = enMessages.learn.breadcrumbs;
const tGlossary = enMessages.learn.glossary;

export const metadata: Metadata = {
  title: `${t.metaTitle} | ${enMessages.metadata.titleTemplate.replace('%s | ', '')}`,
  description: t.metaDescription,
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  const links = [
    { href: '/en', label: t.homeLink },
    { href: '/en/learn', label: `${tBreadcrumbs.learn} — ${t.learnLink}` },
    { href: '/en/learn/glossary', label: tGlossary.title },
  ];

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: '#fbf9f3',
          color: '#262626',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}
      >
        <main style={{ maxWidth: '32rem', width: '100%', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#857857',
              marginBottom: '0.75rem',
            }}
          >
            404
          </p>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '1rem',
            }}
          >
            {t.heading}
          </h1>
          <p
            style={{
              fontSize: '1.0625rem',
              lineHeight: 1.6,
              color: '#5f5840',
              marginBottom: '2rem',
            }}
          >
            {t.body}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
            {links.map((l) => (
              <li key={l.href} style={{ marginBottom: '0.75rem' }}>
                <Link
                  href={l.href}
                  style={{
                    display: 'block',
                    padding: '1rem',
                    background: '#ffffff',
                    border: '1px solid #ece5cf',
                    borderRadius: '1rem',
                    color: '#1f1f1f',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  {l.label} →
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  );
}
