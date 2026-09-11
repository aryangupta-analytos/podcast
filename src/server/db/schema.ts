import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

/* ────────────────────────────────────────────────────────────────────────────
 * Shared column helpers
 * ────────────────────────────────────────────────────────────────────────── */

const createdAt = timestamp('created_at', { withTimezone: true })
  .notNull()
  .defaultNow();

const updatedAt = timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow();

/* ────────────────────────────────────────────────────────────────────────────
 * Auth
 * ────────────────────────────────────────────────────────────────────────── */

export const userRole = pgEnum('user_role', ['owner', 'editor']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    /** scrypt hash, encoded as `scrypt$N$r$p$salt$hash`. Never a plain password. */
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: userRole('role').notNull().default('owner'),
    /** Set after N failed logins to throttle credential stuffing. */
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt,
    updatedAt
  },
  (t) => [uniqueIndex('users_email_idx').on(sql`lower(${t.email})`)]
);

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 of the cookie token. The raw token is never stored. */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    createdAt
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)]
);

/* ────────────────────────────────────────────────────────────────────────────
 * Media — metadata only. The bytes live in object storage (see server/storage).
 * ────────────────────────────────────────────────────────────────────────── */

export const mediaKind = pgEnum('media_kind', ['image', 'audio']);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Storage key, e.g. `audio/2026/01/abc123.mp3`. Unique per file. */
    storageKey: text('storage_key').notNull().unique(),
    /** Public URL the browser fetches. CDN URL in production. */
    url: text('url').notNull(),
    kind: mediaKind('kind').notNull(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(),
    bytes: integer('bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    durationSeconds: integer('duration_seconds'),
    /** Alt text for images. Editable in the media library. */
    alt: text('alt'),
    uploadedBy: uuid('uploaded_by').references(() => users.id, {
      onDelete: 'set null'
    }),
    createdAt
  },
  (t) => [index('media_assets_kind_created_idx').on(t.kind, t.createdAt)]
);

/* ────────────────────────────────────────────────────────────────────────────
 * People — hosts, team members, and guests share one table so an image and bio
 * are edited in exactly one place, no matter how the person appears.
 * ────────────────────────────────────────────────────────────────────────── */

export const personKind = pgEnum('person_kind', ['host', 'team', 'guest']);

export const people = pgTable(
  'people',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    /** Job title / role, e.g. "Executive Producer & Host". */
    title: text('title'),
    bio: text('bio'),
    imageUrl: text('image_url'),
    /**
     * Which placeholder to draw when there is no photo. Set by the owner, not
     * inferred — a name tells you nothing about how someone looks or
     * identifies, so the system never guesses.
     */
    placeholder: text('placeholder').notNull().default('monogram'),
    website: text('website'),
    twitter: text('twitter'),
    linkedin: text('linkedin'),
    github: text('github'),
    kind: personKind('kind').notNull().default('guest'),
    /** Controls display order within a kind. Lower comes first. */
    sortOrder: integer('sort_order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    createdAt,
    updatedAt
  },
  (t) => [index('people_kind_sort_idx').on(t.kind, t.sortOrder)]
);

/* ────────────────────────────────────────────────────────────────────────────
 * Episodes
 * ────────────────────────────────────────────────────────────────────────── */

export const episodeStatus = pgEnum('episode_status', [
  'draft',
  'published',
  'unpublished'
]);

export const episodes = pgTable(
  'episodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Public URL segment: /episodes/<slug>. Never a database id. */
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    /** Short summary shown in lists and meta descriptions. Plain text. */
    description: text('description').notNull().default(''),
    /** Long-form show notes. Stored as sanitized HTML. */
    showNotes: text('show_notes').notNull().default(''),

    audioUrl: text('audio_url'),
    audioMimeType: text('audio_mime_type').notNull().default('audio/mpeg'),
    audioBytes: integer('audio_bytes'),
    durationSeconds: integer('duration_seconds'),

    thumbnailUrl: text('thumbnail_url'),

    episodeNumber: integer('episode_number'),
    season: integer('season'),

    publishDate: timestamp('publish_date', { withTimezone: true })
      .notNull()
      .defaultNow(),

    spotifyUrl: text('spotify_url'),
    youtubeUrl: text('youtube_url'),
    appleUrl: text('apple_url'),
    otherUrl: text('other_url'),

    status: episodeStatus('status').notNull().default('draft'),
    /** Exactly one episode may be featured; enforced in the repository. */
    isFeatured: boolean('is_featured').notNull().default(false),
    /** Manual ordering override for the archive; null = order by publishDate. */
    sortOrder: integer('sort_order'),

    createdAt,
    updatedAt
  },
  (t) => [
    // The public archive query: published episodes newest first.
    index('episodes_status_publish_date_idx').on(t.status, t.publishDate),
    index('episodes_featured_idx').on(t.isFeatured),
    // Deliberately not unique: the show's own back catalogue reuses a few
    // episode numbers, and refusing to store the owner's real data would be
    // the wrong trade. The slug is the canonical identity; a number lookup
    // resolves to the most recent match.
    index('episodes_number_idx').on(t.episodeNumber)
  ]
);

/** Links guests (and per-episode hosts) to an episode, in display order. */
export const episodePeople = pgTable(
  'episode_people',
  {
    episodeId: uuid('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    role: personKind('role').notNull().default('guest'),
    sortOrder: integer('sort_order').notNull().default(0)
  },
  (t) => [
    primaryKey({ columns: [t.episodeId, t.personId] }),
    index('episode_people_person_idx').on(t.personId)
  ]
);

/* ────────────────────────────────────────────────────────────────────────────
 * Site content — one singleton row. Predefined fields, not a page builder.
 * ────────────────────────────────────────────────────────────────────────── */

export const siteSettings = pgTable('site_settings', {
  /** Always 1. Enforces a single row. */
  id: integer('id').primaryKey().default(1),

  // Identity
  showTitle: text('show_title').notNull().default('The Silicon Valley Tech Podcast'),
  tagline: text('tagline').notNull().default(''),
  description: text('description').notNull().default(''),
  artworkUrl: text('artwork_url'),

  // Hero
  heroEyebrow: text('hero_eyebrow').notNull().default(''),
  heroTitle: text('hero_title').notNull().default(''),
  heroDescription: text('hero_description').notNull().default(''),
  heroImageUrl: text('hero_image_url'),
  heroCtaText: text('hero_cta_text').notNull().default(''),
  heroCtaUrl: text('hero_cta_url').notNull().default(''),
  heroSecondaryCtaText: text('hero_secondary_cta_text').notNull().default(''),
  heroSecondaryCtaUrl: text('hero_secondary_cta_url').notNull().default(''),

  // Featured episode. Null = fall back to the most recent published episode.
  featuredEpisodeId: uuid('featured_episode_id'),

  // Section headings shown on the homepage
  featuredHeading: text('featured_heading').notNull().default('Featured Episode'),
  latestHeading: text('latest_heading').notNull().default('Latest Episodes'),
  teamHeading: text('team_heading').notNull().default('The Team'),
  guestsHeading: text('guests_heading').notNull().default('Recent Guests'),
  aboutHeading: text('about_heading').notNull().default('About The Show'),

  /** How many episodes the homepage lists. Keeps the query small. */
  latestEpisodeCount: integer('latest_episode_count').notNull().default(6),

  // Section visibility toggles
  showHero: boolean('show_hero').notNull().default(true),
  showFeatured: boolean('show_featured').notNull().default(true),
  showAbout: boolean('show_about').notNull().default(true),
  showTeam: boolean('show_team').notNull().default(true),
  showGuests: boolean('show_guests').notNull().default(true),

  // About page
  aboutTitle: text('about_title').notNull().default('About'),
  aboutBody: text('about_body').notNull().default(''),
  aboutImageUrl: text('about_image_url'),

  // Contact
  contactHeading: text('contact_heading').notNull().default('Contact'),
  contactBody: text('contact_body').notNull().default(''),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),

  // Footer
  footerText: text('footer_text').notNull().default(''),

  // SEO
  metaTitle: text('meta_title').notNull().default(''),
  metaDescription: text('meta_description').notNull().default(''),
  ogImageUrl: text('og_image_url'),

  /** Public RSS feed for podcast apps. Generated by this site at /rss.xml. */
  rssFeedUrl: text('rss_feed_url'),

  updatedAt
});

/* ────────────────────────────────────────────────────────────────────────────
 * Links — one table, three groups: where to listen, social profiles, nav.
 * ────────────────────────────────────────────────────────────────────────── */

export const linkGroup = pgEnum('link_group', ['platform', 'social', 'nav']);

export const links = pgTable(
  'links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    group: linkGroup('group').notNull(),
    /** Icon key: spotify, apple, youtube, linkedin, facebook, twitter, … */
    platform: text('platform').notNull(),
    label: text('label').notNull(),
    url: text('url').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true)
  },
  (t) => [index('links_group_sort_idx').on(t.group, t.sortOrder)]
);

/* ────────────────────────────────────────────────────────────────────────────
 * Contact form submissions
 * ────────────────────────────────────────────────────────────────────────── */

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt
  },
  (t) => [index('contact_messages_created_idx').on(t.createdAt)]
);

/* ────────────────────────────────────────────────────────────────────────────
 * Relations
 * ────────────────────────────────────────────────────────────────────────── */

export const episodesRelations = relations(episodes, ({ many }) => ({
  people: many(episodePeople)
}));

export const peopleRelations = relations(people, ({ many }) => ({
  episodes: many(episodePeople)
}));

export const episodePeopleRelations = relations(episodePeople, ({ one }) => ({
  episode: one(episodes, {
    fields: [episodePeople.episodeId],
    references: [episodes.id]
  }),
  person: one(people, {
    fields: [episodePeople.personId],
    references: [people.id]
  })
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

/* ────────────────────────────────────────────────────────────────────────────
 * Inferred types
 * ────────────────────────────────────────────────────────────────────────── */

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type EpisodeRow = typeof episodes.$inferSelect;
export type NewEpisode = typeof episodes.$inferInsert;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type LinkRow = typeof links.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
