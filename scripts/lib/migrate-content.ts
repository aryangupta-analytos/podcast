/**
 * The content migrated from the legacy Wix site
 * (https://sunilranka.wixsite.com/svtechpodcast) and the show's Podbean feed.
 *
 * Everything here is a one-time seed: once it is in the database the owner
 * edits it from the admin panel, and this file is never read again. It exists
 * so the migration is reviewable and repeatable, not as a runtime source.
 */

/** Full-resolution originals — the `/v1/fill/...` suffix is the Wix thumbnailer. */
const WIX_MEDIA = 'https://static.wixstatic.com/media';

export const IMAGES = {
  logo: `${WIX_MEDIA}/858a00_d012d2062fe14c6b88437cf62f0d706e~mv2.png`,
  artwork: `${WIX_MEDIA}/858a00_7ec3e620a3bc42e4b2648ff1d0ec74e0~mv2.jpg`,
  shawn: `${WIX_MEDIA}/858a00_25a3be9516d04309aff77e5bca082134~mv2.jpg`,
  sunil: `${WIX_MEDIA}/858a00_4dff0ad5f3774b20b22a040e47249181~mv2.jpg`,
  anjani: `${WIX_MEDIA}/858a00_971ae7676981485f9137e40c1b2d301f~mv2.jpg`
} as const;

export const PODBEAN_FEED =
  'https://feed.podbean.com/siliconvalleytechpodcast/feed.xml';

/* ────────────────────────────────────────────────────────────────────────────
 * Site copy — taken verbatim from the Wix homepage
 * ────────────────────────────────────────────────────────────────────────── */

export const SHOW_TITLE = 'The Silicon Valley Tech Podcast';
export const TAGLINE = 'Behind The Scenes';

export const SHOW_DESCRIPTION =
  'We talk to the real heroes that make businesses run and learn how ' +
  'decisions are made and executed to create the thriving businesses of ' +
  'tomorrow.';

export const HERO = {
  eyebrow: 'The',
  title: 'Silicon Valley Tech Podcast',
  description:
    'Behind the scenes with the operators, founders and leaders who actually ' +
    'make Silicon Valley companies run.',
  ctaText: 'Listen to the latest episode',
  ctaUrl: '/episodes',
  secondaryCtaText: 'About the show',
  secondaryCtaUrl: '/about'
};

/** The Wix "About The Show" copy, as HTML paragraphs. */
export const ABOUT_BODY = `<p>The quarterback may get the glory for the win, but without the offensive line would he have been able to do anything? Culture and business in an organization are only as good as the team — especially leadership — behind it.</p>
<p>On the Silicon Valley Tech Podcast, we talk to the real heroes that make businesses run. Let's together find out what goes on "behind the scenes" of a company: how decisions are made and executed to create the thriving businesses of tomorrow.</p>
<p><em>"Nibble BITES. To Go Stories."</em></p>`;

export const CONTACT = {
  email: 'info@svtechpodcast.com',
  phone: '(650) 701-3468',
  body: `<p>Silicon Valley: 385 Moffett Park Drive, Sunnyvale, CA 94089</p>
<p>Have a guest to suggest, or a question about the show? Send us a note.</p>`
};

/* ────────────────────────────────────────────────────────────────────────────
 * People — hosts, then the team, in the order the Wix site listed them
 * ────────────────────────────────────────────────────────────────────────── */

export interface SeedPerson {
  name: string;
  title: string;
  kind: 'host' | 'team';
  linkedin?: string;
  imageKey?: keyof typeof IMAGES;
  bio?: string;
}

export const PEOPLE: SeedPerson[] = [
  {
    name: 'Shawn Flynn',
    title: 'Executive Producer & Host',
    kind: 'host',
    linkedin: 'https://www.linkedin.com/in/shawnpflynn/',
    imageKey: 'shawn'
  },
  {
    name: 'Sunil S Ranka',
    title: 'Executive Producer & Co-Host',
    kind: 'host',
    linkedin: 'https://www.linkedin.com/in/sranka/',
    imageKey: 'sunil'
  },
  {
    name: 'Anjani Sharda',
    title: 'Head Of Growth',
    kind: 'team',
    linkedin: 'https://www.linkedin.com/in/anjani-sharda-986149a9/',
    imageKey: 'anjani'
  },
  {
    name: 'Matthew Lewis',
    title: 'Content Advisor',
    kind: 'team',
    linkedin: 'https://www.linkedin.com/in/wealthbootcamp/'
  },
  {
    name: 'Michael Kasperzak',
    title: 'Political Relations Advisor',
    kind: 'team',
    linkedin: 'https://www.linkedin.com/in/michael-kasperzak-055196/'
  },
  {
    name: 'Andreas Ramos',
    title: 'Digital Advisor',
    kind: 'team',
    linkedin: 'https://www.linkedin.com/in/andreasramos/'
  },
  {
    name: 'Sergio Smirnoff',
    title: 'Brand and Marketing Advisor',
    kind: 'team',
    linkedin: 'https://www.linkedin.com/in/sergiosmirnoff/'
  },
  {
    name: 'Daniel N.',
    title: 'Strategic Operations Officer',
    kind: 'team',
    linkedin: 'https://www.linkedin.com/in/danielqn90/'
  },
  {
    name: 'Iris Yuh',
    title: 'Intern',
    kind: 'team',
    linkedin: 'https://www.linkedin.com/in/iris-yuh-98b05b163/'
  }
];

/* ────────────────────────────────────────────────────────────────────────────
 * Links
 * ────────────────────────────────────────────────────────────────────────── */

export interface SeedLink {
  group: 'platform' | 'social' | 'nav';
  platform: string;
  label: string;
  url: string;
}

export const LINKS: SeedLink[] = [
  {
    group: 'platform',
    platform: 'apple',
    label: 'Apple Podcasts',
    url: 'https://podcasts.apple.com/us/podcast/the-silicon-valley-tech-podcast/id1511171638'
  },
  {
    group: 'platform',
    platform: 'podbean',
    label: 'Podbean',
    url: 'https://siliconvalleytechpodcast.podbean.com/'
  },
  {
    group: 'platform',
    platform: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/channel/UCOiwbY0lqPMph0QRFEAMujw'
  },
  {
    group: 'social',
    platform: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/groups/13846839/'
  },
  {
    group: 'social',
    platform: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/Silicon-Valley-Tech-Podcast-105678124444565/'
  },
  {
    group: 'social',
    platform: 'twitter',
    label: 'X / Twitter',
    url: 'https://twitter.com/PodcastSilicon'
  },
  {
    group: 'social',
    platform: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/channel/UCOiwbY0lqPMph0QRFEAMujw'
  }
];

/* ────────────────────────────────────────────────────────────────────────────
 * Guest extraction
 * ────────────────────────────────────────────────────────────────────────── */

export interface ParsedGuest {
  name: string;
  title: string | null;
}

/**
 * Pulls the guest out of an episode title.
 *
 * Every episode in the back catalogue is titled in one of a few shapes:
 *
 *   "Interview of Larry Kesslin, Chief Connector at SPIRE"
 *   "Part 2 - Interview of Prem Jain, CEO at Pensando Systems"
 *   "Teaser - Interview of Prem Jain, CEO at Pensando Systems"
 *
 * so the guest's name and role can be recovered rather than typed in by hand
 * for all fourteen episodes. Anything that doesn't match returns null and the
 * episode is simply imported without a linked guest.
 */
export function parseGuestFromTitle(title: string): ParsedGuest | null {
  const decoded = title.replace(/&amp;/g, '&').trim();

  // Strip a leading "Part 2 - ", "Part 1: ", "Teaser - " and similar.
  const withoutPrefix = decoded.replace(
    /^(part\s*\d+|teaser|bonus)\s*[-–:]\s*/i,
    ''
  );

  const match = /interview of\s+(.+)$/i.exec(withoutPrefix);
  if (!match) return null;

  let remainder = match[1].trim();

  // "Prem Jain, CEO at Pensando Systems" → name, role
  // "Lou Pambianco - Chairman and CEO of ..." → name, role
  const separator = /\s*[,–-]\s+/.exec(remainder);
  let name = remainder;
  let role: string | null = null;

  if (separator && separator.index > 0) {
    name = remainder.slice(0, separator.index).trim();
    role = remainder.slice(separator.index + separator[0].length).trim();
  }

  // Guard against a mis-split leaving something that is not a person's name.
  const words = name.split(/\s+/);
  if (words.length < 2 || words.length > 5 || name.length > 60) return null;

  return {
    name,
    title: role && role.length <= 200 ? role : role ? role.slice(0, 200) : null
  };
}
