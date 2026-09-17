import type { JSX } from 'preact/jsx-runtime';

import { currentEpisode, isPlaying } from './state';

type Props = {
  episode: (typeof currentEpisode)['value'];
  /**
   * When set, the control is a real link to the episode page: pressing it
   * starts playback and the ClientRouter follows the link. The audio player
   * persists across that navigation, so playback keeps going on the new page.
   */
  href?: string;
  /** Visual style: `primary` (blue), `dark` (for colour bands), `light` (for dark grounds). */
  tone?: 'primary' | 'dark' | 'light';
  /** Shorter label for tight cards. */
  compact?: boolean;
  class?: string;
};

const PlayIcon = (
  <svg class="ml-0.5 h-3 w-3" viewBox="0 0 11 14" fill="currentColor" aria-hidden="true">
    <path d="m.367882.443158c0-.065142.07026-.106046.126866-.073861l11.541952 6.562623c.0573.03256.0573.11515 0 .14772l-11.541949 6.56266c-.056606.0321-.126865-.0088-.126865-.0739z" />
  </svg>
);

const PauseIcon = (
  <svg class="h-3 w-3" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
    <rect height="16.8" rx="1.07692" width="5.6" y=".799805" />
    <rect height="16.8" rx="1.07692" width="5.6" x="8.40039" y=".799805" />
  </svg>
);

function renderIcon(icon: JSX.Element, key?: string) {
  return <span key={key}>{icon}</span>;
}

const TONES = {
  primary: 'pill-primary',
  dark: 'pill-ink',
  light: 'pill-light'
};

export default function FullPlayButton({
  episode,
  href,
  tone = 'primary',
  compact = false,
  class: className = ''
}: Props) {
  if (!episode) {
    return null;
  }

  const isCurrentEpisode = episode.id === currentEpisode.value?.id;
  const showPauseIcon = isCurrentEpisode && isPlaying.value;

  const play = () => {
    currentEpisode.value = {
      audio: episode.audio,
      episodeNumber: episode.episodeNumber,
      id: episode.id,
      title: episode.title
    };
    isPlaying.value = isCurrentEpisode ? !isPlaying.value : true;
  };

  const inner = (
    <>
      <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white/25">
        {showPauseIcon
          ? renderIcon(PauseIcon, 'pause')
          : renderIcon(PlayIcon, 'play')}
      </span>
      {showPauseIcon ? 'Pause' : compact ? 'Listen' : 'Play episode'}
      <span class="sr-only">
        (press to {showPauseIcon ? 'pause' : 'play'})
      </span>
    </>
  );

  const classes = `pill ${TONES[tone]} ${className}`;

  if (!href) {
    return (
      <button type="button" class={classes} onClick={play}>
        {inner}
      </button>
    );
  }

  /*
    With an href this is ALWAYS an <a>, whatever the playback state. Switching
    element type by state broke two things: pressing Listen re-rendered the
    link into a button mid-click, so the router never saw a link and the page
    did not change; and coming back to a page while that episode was playing
    made the client render a <button> over the server's <a>, which hydration
    kept both of.

    The link carries `#play`: the episode page starts playback itself on
    arrival, so this works even before this island has hydrated. Pausing, or
    pressing it on the episode's own page, toggles in place instead.
  */
  const onLinkClick = (event: MouseEvent) => {
    if (showPauseIcon || location.pathname === href) {
      event.preventDefault();
      play();
    }
  };

  return (
    <a href={`${href}#play`} class={classes} onClick={onLinkClick}>
      {inner}
    </a>
  );
}
