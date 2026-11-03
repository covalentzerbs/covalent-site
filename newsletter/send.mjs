// Turns an issue into a Resend Broadcast.
//
//   node --env-file=.env newsletter/send.mjs newsletter/issues/2026-11-example.html
//   node --env-file=.env newsletter/send.mjs <issue> --send          (send now)
//   node --env-file=.env newsletter/send.mjs <issue> --send "in 1 hour"
//
// Without --send it only creates a draft you can review in the Resend dashboard.
// An issue file starts with a front-matter block, then the HTML body:
//
//   ---
//   subject: what we shot this month
//   preheader: optional inbox preview line
//   ---
//   <p>hello.</p>

import { readFile } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const issuePath = args.find((a) => !a.startsWith('--'));
const sendIndex = args.indexOf('--send');
const send = sendIndex !== -1;
const scheduledAt = send ? args[sendIndex + 1] : undefined;

if (!issuePath) {
  console.error('usage: node --env-file=.env newsletter/send.mjs <issue.html> [--send ["when"]]');
  process.exit(1);
}

const { RESEND_API_KEY, RESEND_SEGMENT_ID, NEWSLETTER_FROM, NEWSLETTER_REPLY_TO } = process.env;
for (const [name, value] of Object.entries({ RESEND_API_KEY, RESEND_SEGMENT_ID, NEWSLETTER_FROM })) {
  if (!value) {
    console.error(`missing ${name}; copy .env.example to .env and fill it in`);
    process.exit(1);
  }
}

function parseIssue(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('issue needs a front-matter block with at least a subject');
  const meta = Object.fromEntries(
    match[1].split('\n').filter(Boolean).map((line) => {
      const i = line.indexOf(':');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
  );
  if (!meta.subject) throw new Error('issue front matter is missing a subject');
  return { meta, body: match[2].trim() };
}

const { meta, body } = parseIssue(await readFile(issuePath, 'utf8'));
const template = await readFile(join(here, 'template.html'), 'utf8');
const html = template
  .replaceAll('{{subject}}', meta.subject)
  .replaceAll('{{preheader}}', meta.preheader || '')
  .replace('{{content}}', body);

const payload = {
  name: basename(issuePath, '.html'),
  segment_id: RESEND_SEGMENT_ID,
  from: NEWSLETTER_FROM,
  subject: meta.subject,
  html,
  send,
};
if (NEWSLETTER_REPLY_TO) payload.reply_to = NEWSLETTER_REPLY_TO;
if (scheduledAt && !scheduledAt.startsWith('--')) payload.scheduled_at = scheduledAt;

const res = await fetch('https://api.resend.com/broadcasts', {
  method: 'POST',
  headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});
const result = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`resend error ${res.status}:`, result);
  process.exit(1);
}

const state = !send ? 'draft created' : payload.scheduled_at ? `scheduled (${payload.scheduled_at})` : 'sending';
console.log(`${state}: ${meta.subject} [${result.id}]`);
