/*
SongCollection.jsx - lists community songs from the neurorave-songs-collection
GitHub repo and opens any of them directly in the NeuroRAVE REPL.

How it works:
- On mount it reads the repo's git tree (one API call), so any .js song added
  to the repo automatically shows up here on the next page load.
- Each card lazily fetches its song's header comment to show a nice title/author
  plus a short code preview.
- "Play" encodes the song with the same code2hash the REPL's share button uses,
  then navigates to /#<hash> which the REPL decodes on load.
*/
import { useEffect, useMemo, useRef, useState } from 'react';
import { code2hash } from '@strudel/core';

const REPO = 'k4ran909/neurorave-songs-collection';
const BRANCH = 'main';
const TREE_URL = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
const rawUrl = (path) => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;

// base path of the site (usually "/"), used to build the REPL link
const BASE = import.meta.env.BASE_URL?.endsWith('/')
  ? import.meta.env.BASE_URL.slice(0, -1)
  : import.meta.env.BASE_URL || '';

// in-memory cache so we don't refetch a song's code/metadata twice per session
const songCache = new Map(); // path -> { code, title, author, preview }

function prettifyName(path) {
  return path
    .replace(/\.js$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// pull `// "Title"` and `// ... @by author` (or `@author`) from the header comments
function parseMeta(code, path) {
  const head = code.split('\n').slice(0, 8).join('\n');
  const titleMatch = head.match(/^\s*\/\/\s*["“](.+?)["”]/m);
  const authorMatch = head.match(/@by\s+([^\s,]+)/i) || head.match(/@([A-Za-z0-9_]+)/);
  const preview = code
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'))
    .slice(0, 3)
    .join('\n');
  return {
    title: titleMatch ? titleMatch[1] : prettifyName(path),
    author: authorMatch ? authorMatch[1].replace(/^@/, '') : null,
    preview,
  };
}

async function fetchSong(path) {
  if (songCache.has(path)) return songCache.get(path);
  const res = await fetch(rawUrl(path));
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  const code = await res.text();
  const meta = { code, ...parseMeta(code, path) };
  songCache.set(path, meta);
  return meta;
}

function openInRepl(code) {
  // same scheme as the REPL share button: location + '#' + code2hash(code)
  window.location.href = `${BASE}/#${code2hash(code)}`;
}

const PlayIcon = (props) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M6.3 2.8A1 1 0 0 0 4.8 3.7v12.6a1 1 0 0 0 1.5.9l10.2-6.3a1 1 0 0 0 0-1.8L6.3 2.8Z" />
  </svg>
);
const SearchIcon = (props) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
    <circle cx="9" cy="9" r="6" />
    <path d="m17 17-3.5-3.5" strokeLinecap="round" />
  </svg>
);

function SongCard({ path, index }) {
  const ref = useRef(null);
  const [meta, setMeta] = useState(() => songCache.get(path) || null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // lazily load the title/author/preview only when the card scrolls into view
  useEffect(() => {
    if (meta || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fetchSong(path)
            .then(setMeta)
            .catch(() => setMeta({ title: prettifyName(path), author: null, preview: '' }));
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [path, meta]);

  const title = meta?.title ?? prettifyName(path);
  const author = meta?.author;
  const preview = meta?.preview;

  const handleOpen = async () => {
    try {
      setBusy(true);
      const song = await fetchSong(path);
      openInRepl(song.code);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Could not open song: ${e.message}`);
      setBusy(false);
    }
  };

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      const song = await fetchSong(path);
      await navigator.clipboard.writeText(song.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={ref}
      onClick={handleOpen}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/[0.06] hover:shadow-[0_8px_30px_-12px_rgba(34,211,238,0.55)]"
    >
      {/* neon top edge on hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-foreground" title={title}>
            {title}
          </h3>
          <p className="truncate text-xs opacity-60">{author ? `by ${author}` : path}</p>
        </div>
        <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] opacity-40">
          #{index + 1}
        </span>
      </div>

      {/* code preview */}
      <pre className="mt-3 h-14 overflow-hidden whitespace-pre-wrap break-all rounded-md bg-black/30 p-2 font-mono text-[10px] leading-snug text-cyan-200/70">
        {preview || ''}
      </pre>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          <PlayIcon className="h-3.5 w-3.5" />
          {busy ? 'Opening…' : 'Play'}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copy code"
            className="rounded-md px-2 py-1 text-xs opacity-60 transition hover:bg-white/10 hover:opacity-100"
          >
            {copied ? '✓ copied' : 'copy'}
          </button>
          <a
            href={rawUrl(path)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="View source on GitHub"
            className="rounded-md px-2 py-1 text-xs opacity-60 transition hover:bg-white/10 hover:opacity-100"
          >
            source
          </a>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="h-4 w-2/3 rounded bg-white/10" />
      <div className="mt-2 h-3 w-1/3 rounded bg-white/10" />
      <div className="mt-3 h-14 rounded-md bg-white/5" />
      <div className="mt-3 h-7 w-20 rounded-lg bg-white/10" />
    </div>
  );
}

export function SongCollection() {
  const [songs, setSongs] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [shuffleKey, setShuffleKey] = useState(0); // 0 = A→Z, otherwise random order

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(TREE_URL);
        if (!res.ok) {
          throw new Error(
            res.status === 403
              ? 'GitHub rate limit reached — please try again in a few minutes.'
              : `Failed to load song list (${res.status})`,
          );
        }
        const data = await res.json();
        const paths = (data.tree || [])
          .filter((n) => n.type === 'blob' && n.path.endsWith('.js'))
          .map((n) => n.path)
          .sort((a, b) => a.localeCompare(b));
        if (!cancelled) setSongs(paths);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!songs) return [];
    const q = query.trim().toLowerCase();
    let list = q ? songs.filter((p) => p.toLowerCase().includes(q)) : songs.slice();
    if (shuffleKey) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, query, shuffleKey]);

  const openRandom = async () => {
    if (!songs?.length) return;
    const path = songs[Math.floor(Math.random() * songs.length)];
    try {
      const song = await fetchSong(path);
      openInRepl(song.code);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="not-prose space-y-6">
      {/* hero */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-600/15 via-purple-600/10 to-cyan-500/15 p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <h2 className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
          🎵 Community Song Collection
        </h2>
        <p className="mt-1 max-w-2xl text-sm opacity-70">
          Live coding tracks made with NeuroRAVE. Hit <strong>Play</strong> to load any song straight into the editor —
          then tweak it and make it your own.
        </p>

        {/* toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs…"
              className="w-full rounded-lg border border-white/15 bg-black/30 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-cyan-400/60"
            />
          </div>
          <button
            onClick={openRandom}
            disabled={!songs?.length}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium transition hover:border-fuchsia-400/50 hover:bg-white/10 disabled:opacity-40"
          >
            🎲 Surprise me
          </button>
          <button
            onClick={() => setShuffleKey((k) => k + 1)}
            disabled={!songs?.length}
            title="Shuffle order"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium transition hover:border-cyan-400/50 hover:bg-white/10 disabled:opacity-40"
          >
            ⤮ Shuffle
          </button>
          {songs && (
            <span className="ml-auto text-xs opacity-50">
              {filtered.length} / {songs.length} songs
            </span>
          )}
        </div>
      </div>

      {/* states */}
      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">⚠ {error}</div>
      ) : !songs ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="opacity-60">No songs match “{query}”.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((path, i) => (
            <SongCard key={path} path={path} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SongCollection;
