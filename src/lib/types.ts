/**
 * The shapes the UI renders.
 *
 * `Episode` and `Show` intentionally match the interfaces the vendored Starpod
 * components were written against (see src/VENDORED.md), so those components
 * work unchanged against database rows instead of a parsed RSS feed.
 */

export interface Show {
  title: string;
  description: string;
  /** Show artwork URL. */
  image: string;
  link: string;
}

export interface EpisodeGuest {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  imageUrl: string | null;
  /** Placeholder style when there is no photo. Chosen by the owner. */
  placeholder: string | null;
  linkedin: string | null;
  twitter: string | null;
  website: string | null;
}

export interface Episode {
  id: string;
  title: string;
  /** Epoch milliseconds — what `new Date(published)` in the components expects. */
  published: number;
  /** Short plain-text summary for lists and meta tags. */
  description: string;
  /** Duration in seconds. */
  duration: number;
  /** Long-form show notes, HTML. */
  content: string;
  episodeImage?: string;
  episodeNumber?: string;
  episodeSlug: string;
  episodeThumbnail?: string;
  season?: number;
  audio: {
    src: string;
    type: string;
  };
  guests: EpisodeGuest[];
  links: {
    spotify?: string;
    youtube?: string;
    apple?: string;
    other?: string;
  };
  status: 'draft' | 'published' | 'unpublished';
  isFeatured: boolean;
  seriesId?: string;
  /** Topic tags for the archive filter, e.g. "Leadership". */
  tags: string[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}
