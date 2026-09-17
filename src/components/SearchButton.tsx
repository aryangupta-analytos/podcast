import { isSearchOpen } from './state';

/** "Search" in green beside a green disc with a magnifier — opens the ⌘K dialog. */
export default function SearchButton() {
  return (
    <button
      type="button"
      class="search-trigger"
      onClick={() => (isSearchOpen.value = true)}
      aria-label="Search episodes (Ctrl or ⌘ K)"
      title="Search (Ctrl/⌘ K)"
    >
      <span class="hidden sm:inline">Search</span>
      <span class="search-trigger-disc" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="M15 15l4.5 4.5" />
        </svg>
      </span>
    </button>
  );
}
