import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  src: string;
}

const clock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Audio preview for the admin panel.
 *
 * The browser's default `<audio controls>` widget looks like a different
 * application on every platform. This matches the admin's own surfaces and
 * carries the rocket from the public site's player, so the owner is previewing
 * something that resembles what a listener will see.
 */
export default function AudioPreview({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        /* autoplay policy — the user will press again */
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seekTo = (clientX: number) => {
    const track = scrubRef.current;
    const audio = audioRef.current;
    if (!track || !audio || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setTime(audio.currentTime);
  };

  const progress = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div class={`audio-player${playing ? ' is-playing' : ''}`}>
      <button
        class="audio-play"
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause preview' : 'Play preview'}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="7" y="5" width="4" height="14" rx="1" />
            <rect x="13" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.2v13.6a.6.6 0 0 0 .92.5l10.6-6.8a.6.6 0 0 0 0-1l-10.6-6.8A.6.6 0 0 0 8 5.2z" />
          </svg>
        )}
      </button>

      <div class="audio-body">
        <div class="audio-times">
          <span>{clock(time)}</span>
          <span>{duration ? clock(duration) : '—:—'}</span>
        </div>

        <div
          ref={scrubRef}
          class="audio-scrub"
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${clock(time)} of ${clock(duration)}`}
          onClick={(event) => seekTo(event.clientX)}
          onKeyDown={(event) => {
            const audio = audioRef.current;
            if (!audio) return;
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              audio.currentTime = Math.min(duration, audio.currentTime + 5);
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault();
              audio.currentTime = Math.max(0, audio.currentTime - 5);
            } else if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault();
              void toggle();
            }
          }}
        >
          <span class="audio-fill" style={{ width: `${progress}%` }} />
          <span class="audio-rocket" style={{ left: `${progress}%` }} aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3c3.5 2.2 5.5 6 5.5 10L12 18l-5.5-5C6.5 9 8.5 5.2 12 3z" />
              <path d="M9 18c-1.5 1-2 2.5-2 3.5 1 0 2.5-.5 3.5-2M15 18c1.5 1 2 2.5 2 3.5-1 0-2.5-.5-3.5-2" />
            </svg>
          </span>
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
