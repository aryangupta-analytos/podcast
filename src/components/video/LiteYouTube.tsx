import { useState } from 'preact/hooks';

import { youtubeEmbed, youtubeThumb } from '../../lib/youtube';

type Props = {
  videoId: string;
  title: string;
};

/**
 * A YouTube embed that costs nothing until it is clicked.
 *
 * Renders the video's thumbnail with a play button; the iframe (and the
 * megabyte of player script that comes with it) only loads on demand.
 *
 * The thumbnail is a plain `<img>` on purpose: it is a remote YouTube asset,
 * not CMS media, so the SmartImage rule in CLAUDE.md does not apply — there is
 * nothing of ours to resize.
 */
export default function LiteYouTube({ videoId, title }: Props) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div class="bg-ink relative aspect-video w-full overflow-hidden rounded-[var(--radius-card)]">
        <iframe
          class="absolute inset-0 h-full w-full"
          src={youtubeEmbed(videoId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      class="group bg-ink relative block aspect-video w-full overflow-hidden rounded-[var(--radius-card)] text-left"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
    >
      <img
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        src={youtubeThumb(videoId)}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <span class="absolute inset-0 flex items-center justify-center">
        <span class="bg-primary text-on-primary flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-transform duration-200 group-hover:scale-110">
          <svg class="ml-1 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 4.5v15l13-7.5z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
