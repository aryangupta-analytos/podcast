import { useEffect, useState, useRef } from 'preact/hooks';

import {
  currentEpisode,
  isMuted,
  isPlaying,
  playbackRate,
  playerDuration,
  playerTime,
  seekTo,
  skipBy
} from '../components/state';
import MuteButton from './player/MuteButton';
import PlayButton from './player/PlayButton';
import PlaybackRateButton from './player/PlaybackRateButton';
import ForwardButton from './player/ForwardButton';
import RewindButton from './player/RewindButton';
import Slider from './player/Slider';

export default function Player() {
  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  if (currentEpisode.value === null) {
    return;
  }

  const { audio, episodeNumber, title } = currentEpisode.value;

  function whilePlaying() {
    if (audioPlayer.current?.duration) {
      const time = audioPlayer.current.currentTime;
      const percentage = (time / audioPlayer.current.duration) * 100;
      setCurrentTime(time);
      playerTime.value = time;
      playerDuration.value = audioPlayer.current.duration;

      const slider = document.querySelector('.slider');
      const particles = document.querySelector('.ship-particles');

      if (slider) {
        (slider as HTMLElement).style.setProperty(
          '--seek-before-width',
          `${percentage}%`
        );
      }

      if (particles && slider) {
        const pxOffset = slider.clientWidth * (percentage / 100);
        (particles as HTMLElement).style.setProperty(
          '--seek-particles-left',
          `${pxOffset - 10}px` // -5 to put the dots into the track
        );
      }
    }
    progressRef.current = requestAnimationFrame(whilePlaying);
  }

  useEffect(() => {
    if (audioPlayer.current) {
      audioPlayer.current.src = audio.src;
      audioPlayer.current.currentTime = 0;
      audioPlayer.current.playbackRate = playbackRate.value;
      playerTime.value = 0;
      playerDuration.value = 0;
      audioPlayer.current.play().catch(() => (isPlaying.value = false));
    }
  }, [audio]);

  // Skips and speed changes requested by other islands.
  useEffect(() => {
    const delta = skipBy.value;
    if (delta === null || !audioPlayer.current) return;
    audioPlayer.current.currentTime = Math.max(0, audioPlayer.current.currentTime + delta);
    playerTime.value = audioPlayer.current.currentTime;
    skipBy.value = null;
  }, [skipBy.value]);

  useEffect(() => {
    if (audioPlayer.current) audioPlayer.current.playbackRate = playbackRate.value;
  }, [playbackRate.value]);

  useEffect(() => {
    if (isPlaying.value) {
      audioPlayer.current?.play().catch(() => (isPlaying.value = false));
      progressRef.current = requestAnimationFrame(whilePlaying);
    } else {
      audioPlayer.current?.pause();
      cancelAnimationFrame(progressRef.current as number);
    }
  }, [isPlaying.value]);

  useEffect(() => {
    const target = seekTo.value;
    const player = audioPlayer.current;
    if (target === null || !player) {
      return;
    }

    const applySeek = async () => {
      const previousIsPlaying = isPlaying.value;
      const previousSeekTo = seekTo.value;
      player.currentTime = target;
      try {
        await player.play();
        isPlaying.value = true;
        seekTo.value = null;
      } catch {
        // Playback was blocked (e.g. autoplay policy) — keep the UI honest by
        // restoring the pre-seek state instead of showing a false "playing".
        isPlaying.value = previousIsPlaying;
        seekTo.value = previousSeekTo;
      }
    };

    // If the episode was just switched, its metadata isn't loaded yet and the
    // seek wouldn't stick — wait for it. Otherwise seek immediately.
    if (player.readyState >= 1 /* HAVE_METADATA */) {
      applySeek();
    } else {
      player.addEventListener('loadedmetadata', applySeek, { once: true });
      return () => player.removeEventListener('loadedmetadata', applySeek);
    }
  }, [seekTo.value]);

  useEffect(() => {
    const duration = audioPlayer.current?.duration ?? 0;
    if (duration > 0 && currentTime >= duration - 0.01) {
      isPlaying.value = false;
      setCurrentTime(0);
    }
  }, [currentTime]);

  return (
    <div class="player fixed inset-x-0 bottom-0 z-50">
      <div
        class="border-line text-heading flex items-center gap-6 border-t px-4 py-4 md:px-6"
        role="region"
        style={{ viewTransitionName: 'player' }}
      >
        <div class="hidden self-start md:block">
          <PlayButton />
        </div>

        <div class="flex flex-1 flex-col gap-3 overflow-hidden p-1">
          <a
            href={episodeNumber ? `/episodes/${episodeNumber}` : '/episodes'}
            class="truncate text-center text-sm font-bold leading-6 md:text-left"
            title={title}
          >
            {title}
          </a>

          <div class="flex justify-between gap-6">
            <div class="flex items-center md:hidden">
              <MuteButton />
            </div>
            <div class="flex flex-none items-center gap-4">
              <RewindButton audioPlayer={audioPlayer} />
              <div class="md:hidden">
                <PlayButton />
              </div>
              <ForwardButton audioPlayer={audioPlayer} />
            </div>
            <Slider audioPlayer={audioPlayer} currentTime={currentTime} />
            <div class="flex items-center gap-4">
              <div class="flex items-center">
                <PlaybackRateButton audioPlayer={audioPlayer} />
              </div>
              <div class="hidden items-center md:flex">
                <MuteButton />
              </div>
              <a
                href={audio.src}
                download
                class="text-heading/70 hover:text-heading inline-flex h-5 w-5 items-center justify-center transition-colors"
                aria-label="Download this episode"
                title="Download episode"
              >
                <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </a>
            </div>
          </div>

          <div class="hidden">
            <audio muted={isMuted} ref={audioPlayer} />
          </div>
        </div>
      </div>
    </div>
  );
}
