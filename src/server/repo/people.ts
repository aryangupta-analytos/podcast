import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import type { Episode } from '../../lib/types';
import { getDb } from '../db';
import {
  episodePeople,
  episodes,
  people,
  type NewPerson,
  type Person
} from '../db/schema';
import { slugify, uniqueSlug } from '../slug';
import { guestsFor, toEpisode } from './episodes';

export type PersonKind = 'host' | 'team' | 'guest';

async function slugExists(slug: string, exceptId?: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: people.id })
    .from(people)
    .where(exceptId ? and(eq(people.slug, slug), ne(people.id, exceptId)) : eq(people.slug, slug))
    .limit(1);
  return rows.length > 0;
}

/** Visible people of a kind, in the order the owner arranged them. */
export async function listPeople(
  kind?: PersonKind,
  { includeHidden = false }: { includeHidden?: boolean } = {}
): Promise<Person[]> {
  const filters = [];
  if (kind) filters.push(eq(people.kind, kind));
  if (!includeHidden) filters.push(eq(people.isVisible, true));

  return getDb()
    .select()
    .from(people)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(people.sortOrder), asc(people.name));
}

/** Hosts and team members together — the "Team" section on the homepage. */
export async function listTeam(): Promise<Person[]> {
  return getDb()
    .select()
    .from(people)
    .where(and(eq(people.isVisible, true), sql`${people.kind} in ('host','team')`))
    .orderBy(asc(people.sortOrder), asc(people.name));
}

/**
 * Guests who appear on at least one live episode, most recent first.
 *
 * Guests with no published episode are excluded so the homepage never shows a
 * guest the visitor cannot listen to.
 */
export async function listRecentGuests(limit = 12): Promise<Person[]> {
  const rows = await getDb()
    .select({
      person: people,
      lastSeen: sql<Date>`max(${episodes.publishDate})`.as('last_seen')
    })
    .from(people)
    .innerJoin(episodePeople, eq(episodePeople.personId, people.id))
    .innerJoin(episodes, eq(episodes.id, episodePeople.episodeId))
    .where(
      and(
        eq(people.isVisible, true),
        eq(people.kind, 'guest'),
        eq(episodes.status, 'published'),
        sql`${episodes.publishDate} <= now()`
      )
    )
    .groupBy(people.id)
    .orderBy(desc(sql`max(${episodes.publishDate})`))
    .limit(limit);

  return rows.map((row) => row.person);
}

export async function getPersonById(id: string): Promise<Person | null> {
  const rows = await getDb().select().from(people).where(eq(people.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getPersonBySlug(slug: string): Promise<Person | null> {
  const rows = await getDb().select().from(people).where(eq(people.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export interface PersonInput {
  name: string;
  kind?: PersonKind;
  title?: string | null;
  bio?: string | null;
  /** Which placeholder to draw when there is no photo. Chosen, never inferred. */
  placeholder?: string;
  imageUrl?: string | null;
  website?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  github?: string | null;
  isVisible?: boolean;
  sortOrder?: number;
}

export async function createPerson(input: PersonInput): Promise<Person> {
  const db = getDb();
  const slug = await uniqueSlug(slugify(input.name), (candidate) => slugExists(candidate));

  // Append to the end of the person's group rather than jumping to the top.
  const [{ value: nextOrder }] = await db
    .select({ value: sql<number>`coalesce(max(${people.sortOrder}), -1) + 1` })
    .from(people)
    .where(eq(people.kind, input.kind ?? 'guest'));

  const values: NewPerson = {
    slug,
    name: input.name.trim(),
    kind: input.kind ?? 'guest',
    title: input.title ?? null,
    bio: input.bio ?? null,
    placeholder: input.placeholder ?? 'monogram',
    imageUrl: input.imageUrl ?? null,
    website: input.website ?? null,
    twitter: input.twitter ?? null,
    linkedin: input.linkedin ?? null,
    github: input.github ?? null,
    isVisible: input.isVisible ?? true,
    sortOrder: input.sortOrder ?? nextOrder
  };

  const [row] = await db.insert(people).values(values).returning();
  return row;
}

export async function updatePerson(
  id: string,
  input: Partial<PersonInput>
): Promise<Person | null> {
  const db = getDb();
  const patch: Partial<NewPerson> = { updatedAt: new Date() };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.title !== undefined) patch.title = input.title;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.placeholder !== undefined) patch.placeholder = input.placeholder;
  if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
  if (input.website !== undefined) patch.website = input.website;
  if (input.twitter !== undefined) patch.twitter = input.twitter;
  if (input.linkedin !== undefined) patch.linkedin = input.linkedin;
  if (input.github !== undefined) patch.github = input.github;
  if (input.isVisible !== undefined) patch.isVisible = input.isVisible;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

  await db.update(people).set(patch).where(eq(people.id, id));
  return getPersonById(id);
}

export async function deletePerson(id: string): Promise<void> {
  // episode_people cascades, so the person simply stops appearing on episodes.
  await getDb().delete(people).where(eq(people.id, id));
}

export async function reorderPerson(id: string, direction: 'up' | 'down'): Promise<void> {
  const db = getDb();
  const person = await getPersonById(id);
  if (!person) return;

  const group = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.kind, person.kind))
    .orderBy(asc(people.sortOrder), asc(people.name));

  const index = group.findIndex((row) => row.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= group.length) return;

  const reordered = [...group];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await Promise.all(
    reordered.map((row, position) =>
      db.update(people).set({ sortOrder: position }).where(eq(people.id, row.id))
    )
  );
}

/**
 * Finds a guest by name, creating them if new.
 *
 * This is what makes the Add Episode form simple: the owner types a guest name
 * and the guest record is managed for them, with no separate "create the guest
 * first" step — and without a second copy of the name living on the episode.
 */
export async function findOrCreateGuest(
  name: string,
  extra: { imageUrl?: string | null; title?: string | null } = {}
): Promise<Person> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A guest needs a name.');

  const existing = await getDb()
    .select()
    .from(people)
    .where(sql`lower(${people.name}) = ${trimmed.toLowerCase()}`)
    .limit(1);

  if (existing[0]) {
    // Fill in a photo the owner has now supplied, but never overwrite one.
    if (extra.imageUrl && !existing[0].imageUrl) {
      return (await updatePerson(existing[0].id, { imageUrl: extra.imageUrl }))!;
    }
    return existing[0];
  }

  return createPerson({ name: trimmed, kind: 'guest', ...extra });
}

/** Episode counts per person, for the admin guest list. */
export async function getPersonEpisodeCounts(): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({ personId: episodePeople.personId, total: count() })
    .from(episodePeople)
    .groupBy(episodePeople.personId);

  return new Map(rows.map((row) => [row.personId, row.total]));
}

/** Live episodes a guest appeared on, for their public page. */
export async function getEpisodesForPerson(personId: string): Promise<Episode[]> {
  const rows = await getDb()
    .select({ episode: episodes })
    .from(episodePeople)
    .innerJoin(episodes, eq(episodes.id, episodePeople.episodeId))
    .where(
      and(
        eq(episodePeople.personId, personId),
        eq(episodes.status, 'published'),
        sql`${episodes.publishDate} <= now()`
      )
    )
    .orderBy(desc(episodes.publishDate));

  const guests = await guestsFor(rows.map((r) => r.episode.id));
  return rows.map((r) => toEpisode(r.episode, guests.get(r.episode.id) ?? []));
}

/** Full rows (including bios) for a set of people, in one query. */
export async function getPeopleByIds(ids: string[]): Promise<Person[]> {
  if (ids.length === 0) return [];
  return getDb().select().from(people).where(inArray(people.id, ids));
}
