import type { MutableRef } from 'preact/hooks';

import { PLAYBACK_RATES, playbackRate } from '../state';

type Props = {
  audioPlayer: MutableRef<HTMLAudioElement | null>;
};

export default function PlaybackRateButton({ audioPlayer }: Props) {
  return (
    <button
      type="button"
      className="gradient-icon relative flex h-[18px] w-[18px] items-center justify-center rounded-md transition-colors focus:outline-hidden"
      onClick={() => {
        const idx = (PLAYBACK_RATES.indexOf(playbackRate.value) + 1) % PLAYBACK_RATES.length;
        playbackRate.value = PLAYBACK_RATES[idx];
        if (audioPlayer.current) audioPlayer.current.playbackRate = playbackRate.value;
      }}
      aria-label="Playback rate"
    >
      <div class="absolute -inset-4 md:hidden" />
      <div class="flex h-[18px] w-[18px] items-center justify-center rounded-sm p-2 text-[6px] font-black text-ink transition-colors">
        {playbackRate.value}
        <span class="ml-[1px] flex items-end">x</span>
      </div>
    </button>
  );
}
