const MAX_BODY = 12_000;
const failure = (message: string, status: number) => Response.json({ error: message }, { status });
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return failure('Request origin not allowed.', 403);
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return failure('Message is too large.', 413);
  let input: Record<string, unknown>;
  try {
    // Bound the stream as well as Content-Length, which clients can omit.
    const reader = request.body?.getReader();
    if (!reader) return failure('A message is required.', 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); return failure('Message is too large.', 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
    if (!input || typeof input !== 'object' || Array.isArray(input)) return failure('Invalid message.', 400);
  } catch { return failure('Invalid message format.', 400); }
  const { name, email, message, website } = input;
  if (website) return failure('Unable to accept this message.', 400);
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string' ||
      !name.trim() || name.length > 100 || /[\r\n]/.test(name) ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      message.trim().length < 10 || message.length > 5000) {
    return failure('Please provide a valid name, email and message (10–5,000 characters).', 400);
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL || 'gedsonmsilva@gmail.com';
  if (!key || !from) return failure('Email delivery is not configured. Please email Gedson directly.', 503);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: email.trim(), subject: `Website message from ${name.trim()}`, text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}` }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return failure('Email delivery is temporarily unavailable. Please try again.', 502);
    return Response.json({ ok: true });
  } catch { return failure('Email delivery is temporarily unavailable. Please try again.', 502); }
}
