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

export const PEOPLE_HEADING = 'Guests & Hosts';
export const VIDEOS_HEADING = 'Latest Videos';

export const NEWSLETTER = {
  heading: 'New episodes, straight to your inbox',
  body:
    'Subscribe for a note whenever a new episode drops — plus the best moments ' +
    'and lessons from our guests.',
  buttonText: 'Subscribe'
};

export const CTA = {
  heading: 'Real operators. Real lessons.',
  body:
    'The stories behind the decisions that build Silicon Valley companies — ' +
    'and the people who make them.',
  buttonText: 'Learn more about the show',
  buttonUrl: '/about'
};

export const BANNER = {
  label: 'New on the show:',
  text: 'Hear the latest conversations with the people who make Silicon Valley run.',
  buttonText: 'Listen now',
  buttonUrl: '/episodes'
};

/** Brand accents. Must match the defaults in src/styles/theme.css. */
export const ACCENTS = {
  accent1: '#ffd400',
  accent2: '#8f7bff',
  accent3: '#ff6a3d',
  accent4: '#23c4b1',
  accent5: '#ff5da2',
  accent6: '#38b6ff'
};

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

/* ────────────────────────────────────────────────────────────────────────────
 * Series — announced ahead of their first episodes so guests can be invited
 * ────────────────────────────────────────────────────────────────────────── */

export interface SeedSeries {
  name: string;
  tagline: string;
  description: string;
  accent: number;
}

export const SERIES: SeedSeries[] = [
  {
    name: 'Technology',
    tagline: 'The builders, investors and operators shaping what Silicon Valley ships next.',
    description:
      '<p>Conversations with founders, engineers and investors about how technology companies are really built: the product bets, the funding rounds, the hires and the mistakes.</p><p>We are inviting founders, CTOs, product leaders and investors with a story worth telling.</p>',
    accent: 2
  },
  {
    name: 'Finance & Accounting',
    tagline: 'How the numbers get made: CFOs, controllers and the people who keep companies honest.',
    description:
      '<p>A series on the finance side of growing a business: fundraising, forecasting, audits, controls and the moments where the books decide the strategy.</p><p>We are inviting CFOs, finance leaders, accountants and advisors who have been through it.</p>',
    accent: 1
  },
  {
    name: 'Manufacturing',
    tagline: 'From factory floor to global supply chain: the people making physical things at scale.',
    description:
      '<p>Manufacturing is where technology meets the physical world. This series follows the operators, engineers and executives running plants, supply chains and hardware businesses.</p><p>We are inviting plant leaders, supply-chain heads, hardware founders and manufacturing executives to share how they do it.</p>',
    accent: 3
  }
];
