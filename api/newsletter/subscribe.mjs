// POST /api/newsletter/subscribe
// Adds an email to Resend Contacts (and the newsletter segment, if set).
// Plain fetch on purpose — no Resend SDK.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return request.json();
  const form = await request.formData();
  return Object.fromEntries(form);
}

export async function POST(request) {
  let body;
  try {
    body = await readBody(request);
  } catch {
    return json({ ok: false, error: 'Bad request.' }, 400);
  }

  // Honeypot: real people never fill this field. Pretend it worked.
  if (body.company) return json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ ok: false, error: 'Please enter a valid email.' }, 422);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('newsletter: RESEND_API_KEY is not set');
    return json({ ok: false, error: 'Something went wrong. Try again later.' }, 500);
  }

  const segmentId = process.env.RESEND_SEGMENT_ID;
  const payload = { email, unsubscribed: false };
  if (segmentId) payload.segments = [{ id: segmentId }];

  const res = await fetch('https://api.resend.com/contacts', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) return json({ ok: true });

  const detail = await res.text();
  // Already subscribed counts as success; don't leak whether an email exists.
  if (res.status === 409 || /already exists/i.test(detail)) return json({ ok: true });

  console.error('newsletter: resend error', res.status, detail);
  return json({ ok: false, error: 'Something went wrong. Try again later.' }, 502);
}
