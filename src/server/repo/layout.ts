import type { Show } from '../../lib/types';
import type { LinkRow, Person, SiteSettings } from '../db/schema';
import { listPeople } from './people';
import { getLinks, getSettings, getShowInfo } from './settings';

export interface LayoutData {
  settings: SiteSettings;
  show: Show;
  hosts: Person[];
  platforms: LinkRow[];
  socials: LinkRow[];
  navLinks: LinkRow[];
}

/**
 * Everything the site shell renders, fetched in parallel once per request.
 *
 * The layout is on every page, so this is the hottest query path on the site:
 * five small reads issued together, all served from the settings cache within
 * its window.
 */
export async function getLayoutData(): Promise<LayoutData> {
  const [settings, show, hosts, platforms, socials, navLinks] = await Promise.all([
    getSettings(),
    getShowInfo(),
    listPeople('host'),
    getLinks('platform'),
    getLinks('social'),
    getLinks('nav')
  ]);

  return { settings, show, hosts, platforms, socials, navLinks };
}
