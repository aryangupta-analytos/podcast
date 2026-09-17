import { signal } from '@preact/signals';
import type { Episode } from '../lib/types';

export const currentEpisode = signal<Pick<
  Episode,
  'audio' | 'episodeNumber' | 'id' | 'title'
> | null>(null);
export const isPlaying = signal(false);
export const isMuted = signal(false);

// Set to a time (in seconds) to ask the player to seek there. The player
// consumes it and resets it back to null. Used by clickable transcript
// timestamps to jump to a moment in the current episode.
export const seekTo = signal<number | null>(null);

// Load the given episode (if it isn't already current) and ask the player to
// seek to `seconds`. Shared by the RSS and markdown transcript timestamps.
export function seekToEpisode(
  episode: NonNullable<(typeof currentEpisode)['value']>,
  seconds: number
) {
  if (currentEpisode.value?.id !== episode.id) {
    currentEpisode.value = { ...episode };
  }
  seekTo.value = seconds;
}

// Search state
export const isSearchOpen = signal(false);

// ── Shared player state ──────────────────────────────────────────────────────
// The persistent Player owns the <audio> element; other islands (the inline
// episode player, the playback-rate button) drive it through these signals.

/** Seconds into the current episode, updated by the Player while it plays. */
export const playerTime = signal(0);
/** Duration of the current episode in seconds, once its metadata has loaded. */
export const playerDuration = signal(0);
/** Set to +/- seconds to skip; the Player consumes it and resets to null. */
export const skipBy = signal<number | null>(null);
/** Playback speed, applied by the Player. */
export const playbackRate = signal(1);
export const PLAYBACK_RATES = [1, 1.2, 1.5, 2];
