import type { APIRoute } from 'astro';

import { csvRow } from '../../lib/csv';
import { listAllSubscribersForExport } from '../../server/repo/newsletter';

/**
 * CSV export of every active subscriber.
 *
 * Lives under /admin so the middleware authenticates it like any other admin
 * page; there is no separate check to forget.
 */
export const GET: APIRoute = async () => {
  const rows = await listAllSubscribersForExport();

  const lines = [
    csvRow(['email', 'subscribed_at']),
    ...rows.map((row) => csvRow([row.email, row.createdAt]))
  ];

  const date = new Date().toISOString().slice(0, 10);

  // A byte-order mark so Excel opens the file as UTF-8.
  const bom = String.fromCharCode(0xfeff);

  return new Response(`${bom}${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="subscribers-${date}.csv"`,
      'Cache-Control': 'private, no-store'
    }
  });
};
