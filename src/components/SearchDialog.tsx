import type { JSX } from 'preact/jsx-runtime';
import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import { isSearchOpen } from './state';
import type { Episode } from '../lib/types';

const KBD =
  'bg-surface-2 border-line text-text-muted rounded border px-1.5 py-0.5';

export default function SearchDialog() {
  const [query, setQuery] = useState('');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search on the server, debounced.
  //
  // The alternative — downloading every episode on mount and filtering in the
  // browser — costs a payload that grows with the archive. A query hits an
  // indexed database lookup and returns at most eight rows, so search stays
  // the same weight at episode 500 as at episode 5.
  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setFilteredEpisodes(episodes);
      setSelectedIndex(0);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal
      })
        .then((res) => (res.ok ? res.json() : { episodes: [] }))
        .then((data) => {
          setFilteredEpisodes(data.episodes ?? []);
          setSelectedIndex(0);
        })
        .catch((error) => {
          if (error?.name !== 'AbortError') console.error(error);
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, episodes]);

  // Seed the dialog with the newest episodes so it is useful before typing.
  useEffect(() => {
    if (!isSearchOpen.value || episodes.length > 0) return;
    fetch('/api/search?latest=1')
      .then((res) => (res.ok ? res.json() : { episodes: [] }))
      .then((data) => {
        setEpisodes(data.episodes ?? []);
        setFilteredEpisodes(data.episodes ?? []);
      })
      .catch(console.error);
  }, [isSearchOpen.value]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isSearchOpen.value) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isSearchOpen.value]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Open search with cmd+k or ctrl+k
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isSearchOpen.value = !isSearchOpen.value;
        return;
      }

      // Close on escape
      if (e.key === 'Escape' && isSearchOpen.value) {
        e.preventDefault();
        isSearchOpen.value = false;
        return;
      }

      // Navigation and selection when dialog is open
      if (isSearchOpen.value && filteredEpisodes.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredEpisodes.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = filteredEpisodes[selectedIndex];
          if (selected) {
            window.location.href = `/episodes/${selected.episodeSlug}`;
          }
        }
      }
    },
    [filteredEpisodes, selectedIndex]
  );

  // Add global keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedEl = resultsRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle backdrop click
  const handleBackdropClick = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      isSearchOpen.value = false;
    }
  };

  if (!isSearchOpen.value) {
    return null;
  }

  return (
    <div
      class="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[10vh] backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Search episodes"
    >
      <div class="search-panel bg-surface border-line mx-4 w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl">
        {/* Search Input */}
        <div class="border-line flex items-center border-b px-4">
          <span
            class="search-icon text-text-muted h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            class="text-heading placeholder-text-muted flex-1 border-none bg-transparent px-4 py-4 outline-none focus:ring-0"
            placeholder="Search episodes..."
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            aria-label="Search episodes"
            aria-autocomplete="list"
            aria-controls="search-results"
          />
          <kbd class={`hidden items-center gap-1 text-xs sm:inline-flex ${KBD}`}>
            <span class="text-xs">ESC</span>
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          id="search-results"
          class="max-h-80 overflow-y-auto p-2"
          role="listbox"
        >
          {filteredEpisodes.length === 0 ? (
            <div class="text-text-muted p-4 text-center">
              {query
                ? 'No episodes found'
                : 'Start typing to search episodes...'}
            </div>
          ) : (
            filteredEpisodes.map((episode, index) => (
              <a
                key={episode.id}
                href={`/episodes/${episode.episodeSlug}`}
                data-index={index}
                class={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${
                  index === selectedIndex
                    ? 'bg-surface-2'
                    : 'hover:bg-surface-2'
                }`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => (isSearchOpen.value = false)}
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    {episode.episodeNumber && (
                      <span class="text-primary text-xs font-medium">
                        #{episode.episodeNumber}
                      </span>
                    )}
                    <span class="text-heading truncate text-sm font-semibold">
                      {episode.title}
                    </span>
                  </div>
                  <p class="text-text-muted mt-1 truncate text-xs">
                    {episode.description}
                  </p>
                </div>
                {index === selectedIndex && (
                  <kbd class={`hidden items-center text-xs sm:inline-flex ${KBD}`}>
                    ↵
                  </kbd>
                )}
              </a>
            ))
          )}
        </div>

        {/* Footer */}
        <div class="border-line text-text-muted flex items-center justify-between border-t px-4 py-2 text-xs">
          <div class="flex items-center gap-4">
            <span class="hidden items-center gap-1 sm:inline-flex">
              <kbd class={KBD}>↑</kbd>
              <kbd class={KBD}>↓</kbd>
              <span>to navigate</span>
            </span>
            <span class="hidden items-center gap-1 sm:inline-flex">
              <kbd class={KBD}>↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <span>
            {filteredEpisodes.length}{' '}
            {filteredEpisodes.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      </div>
    </div>
  );
}
