/**
 * The admin panel's icon set.
 *
 * Kept in a plain module rather than the .astro component because Astro's
 * frontmatter cannot `export type` — the compiler chokes on the union before
 * TypeScript ever sees it. Pages import the name type from here.
 *
 * All paths are drawn on a 24x24 grid with a 1.6 stroke so they read as one
 * family at any size.
 */

export const ICON_PATHS = {
  dashboard: 'M4 5h6v6H4zM14 5h6v4h-6zM14 13h6v6h-6zM4 15h6v4H4z',
  mic: 'M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v3M9 20h6',
  plus: 'M12 5v14M5 12h14',
  home: 'M4 10.5 12 4l8 6.5M6 9.5V20h12V9.5M10 20v-6h4v6',
  document: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4M9 12h6M9 16h6',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M18 20a5.5 5.5 0 0 0-3-4.9',
  link: 'M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5',
  image: 'M4 5h16v14H4zM4 15l4.5-4.5L13 15M14 13l2.5-2.5L20 14M15.5 8.5h.01',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.5 1v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-2.6-1l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1-2.5H4.6a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1-2.6l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 2.5-1V4.6a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 2.6 1l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1 2.5h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  logout: 'M9 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4M15 16l4-4-4-4M19 12H9',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  upload: 'M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  audio: 'M4 12v2M8 8v10M12 5v14M16 9v8M20 11v4',
  trash: 'M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13M10 11v6M14 11v6',
  edit: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM15 6l3 3',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'eye-off': 'M4 4l16 16M10 6a9 9 0 0 1 2-.2c6.4 0 10 6.2 10 6.2a17 17 0 0 1-3 3.6M6.5 8A17 17 0 0 0 2 12s3.6 6.5 10 6.5a11 11 0 0 0 3.3-.5M10 10a3 3 0 0 0 4 4',
  star: 'M12 4l2.4 5 5.6.8-4 4 1 5.5-5-2.7-5 2.7 1-5.5-4-4 5.6-.8z',
  'chevron-up': 'M6 14l6-6 6 6',
  'chevron-down': 'M6 10l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  check: 'M5 12.5l5 5 9-11',
  close: 'M6 6l12 12M18 6L6 18',
  calendar: 'M4 6h16v14H4zM4 10h16M9 4v4M15 4v4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  play: 'M7 4.5v15l13-7.5z',
  pause: 'M9 5v14M15 5v14',
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M10 5h7M7 19h7M14 5l-4 14',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  heading: 'M6 5v14M18 5v14M6 12h12',
  rocket:
    'M12 3c3.5 2.2 5.5 6 5.5 10L12 18l-5.5-5C6.5 9 8.5 5.2 12 3zM12 11.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM9 18c-1.5 1-2 2.5-2 3.5 1 0 2.5-.5 3.5-2M15 18c1.5 1 2 2.5 2 3.5-1 0-2.5-.5-3.5-2'
};

export type IconName = keyof typeof ICON_PATHS;
