'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

function applyFilter(query: string) {
  const norm = query.trim().toLowerCase();
  const cards = document.querySelectorAll<HTMLElement>('[data-search-text]');
  let visible = 0;
  cards.forEach((card) => {
    const text = card.dataset.searchText ?? '';
    const match = !norm || text.includes(norm);
    card.style.display = match ? '' : 'none';
    if (match) visible += 1;
  });
  const empty = document.getElementById('archive-no-matches');
  if (empty) empty.hidden = visible !== 0 || !norm;
}

export default function ArchiveSearch({
  placeholder,
  label,
}: {
  placeholder: string;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const urlQ = new URLSearchParams(window.location.search).get('q') ?? '';
    if (urlQ) setQ(urlQ);
    applyFilter(urlQ);
  }, []);

  useEffect(() => {
    if (!mounted.current) return;
    applyFilter(q);
    const id = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (q.trim()) params.set('q', q.trim());
      else params.delete('q');
      const search = params.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    }, 150);
    return () => clearTimeout(id);
  }, [q, router, pathname]);

  return (
    <div className="mb-8">
      <label className="block">
        <span className="block text-sm font-medium text-ipc-700 mb-2">{label}</span>
        <span className="relative block">
          <Search
            size={16}
            aria-hidden
            className="absolute start-4 top-1/2 -translate-y-1/2 text-ipc-400 pointer-events-none"
          />
          <input
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-full bg-white border border-ipc-200 ps-10 pe-4 py-3 text-base placeholder:text-ipc-400 focus:outline-none focus:border-ipc-500 focus:ring-2 focus:ring-ipc-200"
          />
        </span>
      </label>
    </div>
  );
}
