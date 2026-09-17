import { useEffect } from 'preact/hooks';

import {
  PLAYBACK_RATES,
  currentEpisode,
  isPlaying,
  playbackRate,
  playerDuration,
  playerTime,
  seekTo,
  skipBy
} from '../state';

type Props = {
  episode: {
    id: string;
    title: string;
    episodeNumber?: string;
    audio: { src: string; type: string };
    /** Duration from the database, shown before playback starts. */
    duration: number;
  };
  /** "with Guest and Host" line under the title. */
  subtitle?: string;
};

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * The inline player card on an episode page. It does not own an <audio>
 * element — the persistent Player at the foot of the page does — it drives
 * that player through the shared signals, so playback continues when the
 * visitor navigates away.
 */
export default function EpisodePlayer({ episode, subtitle }: Props) {
  const isCurrent = currentEpisode.value?.id === episode.id;
  const playing = isCurrent && isPlaying.value;
  const time = isCurrent ? playerTime.value : 0;
  const duration = isCurrent && playerDuration.value > 0 ? playerDuration.value : episode.duration;
  const percent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  const load = () => {
    if (!isCurrent) {
      currentEpisode.value = {
        audio: episode.audio,
        episodeNumber: episode.episodeNumber,
        id: episode.id,
        title: episode.title
      };
    }
  };

  // Arriving from a "Listen" link (`…#play`): start this episode. Done here,
  // on the page that is guaranteed to be hydrated, so it works even when the
  // button that was pressed had not hydrated yet or the page was fully loaded.
  // If the browser blocks autoplay the Player resets `isPlaying` and the big
  // play button is right here.
  useEffect(() => {
    if (location.hash !== '#play') return;
    history.replaceState(null, '', location.pathname + location.search);
    if (currentEpisode.value?.id !== episode.id) {
      currentEpisode.value = {
        audio: episode.audio,
        episodeNumber: episode.episodeNumber,
        id: episode.id,
        title: episode.title
      };
    }
    isPlaying.value = true;
  }, [episode.id]);

  const toggle = () => {
    load();
    isPlaying.value = isCurrent ? !isPlaying.value : true;
  };

  const skip = (delta: number) => {
    if (!isCurrent) {
      load();
      isPlaying.value = true;
      return;
    }
    skipBy.value = delta;
  };

  const cycleRate = () => {
    const idx = (PLAYBACK_RATES.indexOf(playbackRate.value) + 1) % PLAYBACK_RATES.length;
    playbackRate.value = PLAYBACK_RATES[idx];
  };

  const seek = (e: Event) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (!isCurrent) {
      load();
      isPlaying.value = true;
    }
    seekTo.value = value;
  };

  return (
    <div class="episode-player">
      <div class="episode-player-head">
        <p class="text-heading font-semibold leading-snug">{episode.title}</p>
        {subtitle && <p class="text-text-muted mt-1 text-sm">{subtitle}</p>}
      </div>

      <div class="episode-player-controls">
        <button
          type="button"
          class="episode-player-rate"
          onClick={cycleRate}
          aria-label={`Playback speed ${playbackRate.value}x`}
        >
          {playbackRate.value}x
        </button>

        <button type="button" class="episode-player-skip" onClick={() => skip(-15)} aria-label="Rewind 15 seconds">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          <span>15</span>
        </button>

        <button type="button" class="episode-player-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? (
            <svg viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
              <rect height="16.8" rx="1.07692" width="5.6" y=".799805" />
              <rect height="16.8" rx="1.07692" width="5.6" x="8.40039" y=".799805" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          )}
        </button>

        <button type="button" class="episode-player-skip" onClick={() => skip(15)} aria-label="Fast forward 15 seconds">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
          <span>15</span>
        </button>

        <a class="episode-player-download" href={episode.audio.src} download aria-label="Download episode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M4 19h16" />
          </svg>
        </a>
      </div>

      <div class="episode-player-timeline">
        <input
          type="range"
          class="episode-player-range"
          min={0}
          max={Math.max(1, Math.floor(duration))}
          value={Math.floor(time)}
          style={{ '--progress': `${percent}%` }}
          onInput={seek}
          aria-label="Episode timeline"
        />
        <span class="text-text-muted text-sm tabular-nums">
          {clock(time)} / {clock(duration)}
        </span>
      </div>
    </div>
  );
}
