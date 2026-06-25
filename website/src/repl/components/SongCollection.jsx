/*
SongCollection.jsx - lists community songs from the neurorave-songs-collection
GitHub repo and opens any of them directly in the NeuroRAVE REPL.

How it works:
- On mount it reads the repo's git tree (one API call), so any .js song added
  to the repo automatically shows up here on the next page load.
- Each card lazily fetches its song's header comment to show a nice title/author.
- "Open in NeuroRAVE" encodes the song with the same code2hash the REPL's share
  button uses, then navigates to /#<hash> which the REPL decodes on load.
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
const songCache = new Map(); // path -> { code, title, author }

function prettifyName(path) {
  return path.replace(/\.js$/, '').replace(/[-_]+/g, ' ');
}

// pull `// "Title"` and `// ... @by author` (or `@author`) from the header comments
function parseMeta(code, path) {
  const head = code.split('\n').slice(0, 8).join('\n');
  const titleMatch = head.match(/^\s*\/\/\s*["“](.+?)["”]/m);
  const authorMatch = head.match(/@by\s+([^\s,]+)/i) || head.match(/@([A-Za-z0-9_]+)/);
  return {
    title: titleMatch ? titleMatch[1] : prettifyName(path),
    author: authorMatch ? authorMatch[1].replace(/^@/, '') : null,
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

function SongCard({ path }) {
  const ref = useRef(null);
  const [meta, setMeta] = useState(() => songCache.get(path) || null);
  const [busy, setBusy] = useState(false);

  // lazily load the title/author only when the card scrolls into view
  useEffect(() => {
    if (meta || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fetchSong(path)
            .then(setMeta)
            .catch(() => setMeta({ title: prettifyName(path), author: null }));
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [path, meta]);

  const title = meta?.title ?? prettifyName(path);
  const author = meta?.author;

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

  return (
    <div
      ref={ref}
      className="flex flex-col justify-between gap-3 rounded-lg border border-foreground/20 bg-lineHighlight p-4"
    >
      <div className="min-w-0">
        <h3 className="truncate font-bold text-foreground" title={title}>
          {title}
        </h3>
        <p className="truncate text-sm opacity-60">
          {author ? `by ${author}` : path}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleOpen}
          disabled={busy}
          className="rounded bg-foreground px-3 py-1.5 text-sm font-semibold text-background hover:opacity-80 disabled:opacity-50"
        >
          {busy ? 'Opening…' : '▶ Open in NeuroRAVE'}
        </button>
        <a
          href={rawUrl(path)}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          source
        </a>
      </div>
    </div>
  );
}

export function SongCollection() {
  const [songs, setSongs] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(TREE_URL);
        if (!res.ok) {
          throw new Error(
            res.status === 403
              ? 'GitHub rate limit reached, please try again in a few minutes.'
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
    if (!q) return songs;
    return songs.filter((p) => p.toLowerCase().includes(q));
  }, [songs, query]);

  if (error) {
    return (
      <div className="rounded border border-red-500/40 bg-red-500/10 p-4 text-sm">
        ⚠ {error}
      </div>
    );
  }

  if (!songs) {
    return <p className="opacity-60">Loading songs…</p>;
  }

  return (
    <div className="not-prose space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs…"
          className="w-full max-w-xs rounded border border-foreground/30 bg-background px-3 py-1.5 text-foreground"
        />
        <span className="text-sm opacity-60">
          {filtered.length} / {songs.length} songs
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="opacity-60">No songs match “{query}”.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((path) => (
            <SongCard key={path} path={path} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SongCollection;
