import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import Home from '../app/page';
import Blog from '../app/blog/page';
import Article from '../app/blog/[slug]/page';
import { posts } from '../lib/posts';
import Header from '../components/Header';
import ContactForm from '../components/ContactForm';
import { POST } from '../app/api/contact/route';

it('home-main: identifies Gedson with grounded experience and useful navigation', () => {
  render(<><Header /><Home /></>);
  expect(screen.getAllByText(/Gedson Silva/i).length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/systems/i);
  expect(screen.getAllByText(/AI/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/engineer/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/20/).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('link', { name: /blog|writing/i }).some(a => a.getAttribute('href') === '/blog')).toBe(true);
  expect(document.querySelector('#contact')).not.toBeNull();
});
it('home-access: keyboard skip navigation and responsive layouts', () => {
  render(<Header />);
  expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main');
  expect(screen.getByRole('navigation')).toBeInTheDocument();
  const css = readFileSync('app/globals.css', 'utf8');
  expect(css).toMatch(/@media[^\{]*max-width/);
  expect(css).toMatch(/focus-visible/);
});
it('blog-list: lists unique navigable articles', () => {
  render(<Blog />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/notes|writing|blog/i);
  expect(posts.length).toBeGreaterThanOrEqual(3);
  expect(new Set(posts.map(p => p.slug)).size).toBe(posts.length);
  for (const post of posts) expect(screen.getByRole('link', { name: new RegExp(post.title) })).toHaveAttribute('href', `/blog/${post.slug}`);
});
it('blog-list: every article has substantial readable body and return navigation', async () => {
  const content = {
    'ai-is-a-system-not-a-model': ['Start with the decision, not the model', 'Keep deterministic rules in deterministic code.'],
    'architecture-that-survives-delivery': ['Record the trade-off while it is fresh', 'Build a thin vertical slice through the riskiest part of the design.'],
    'trust-is-an-engineering-requirement': ['Give human oversight a real interface', 'Auditability and privacy need to be designed together.'],
  };
  expect(posts.map(p => p.slug).sort()).toEqual(Object.keys(content).sort());
  for (const post of posts) {
    const { unmount } = render(await Article({ params: Promise.resolve({ slug: post.slug }) }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(post.title);
    expect(document.querySelector('article')!.textContent!.length).toBeGreaterThan(1800);
    const [heading, passage] = content[post.slug as keyof typeof content];
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(document.querySelector('.article-body')).toHaveTextContent(passage);
    for (const [slug, [otherHeading]] of Object.entries(content)) {
      if (slug !== post.slug) expect(screen.queryByRole('heading', { name: otherHeading })).not.toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: /all writing|back to/i })).toHaveAttribute('href', '/blog');
    unmount();
  }
});
it('blog-missing: unknown slug is a genuine not-found', async () => {
  await expect(Article({ params: Promise.resolve({ slug: 'not-a-post' }) })).rejects.toThrow('NEXT_NOT_FOUND');
});

const valid = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'I would like to discuss a reliable AI platform.' };
const req = (data: unknown, origin = 'https://gedson.example') => new Request('https://gedson.example/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(data) });
describe('contact delivery', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 'secret-test-key');
    vi.stubEnv('CONTACT_FROM_EMAIL', 'Website <hello@example.com>');
    vi.stubEnv('CONTACT_TO_EMAIL', 'gedsonmsilva@gmail.com');
  });
  it('email-send: sends fixed recipient and reply-to, not user-controlled recipient', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'message-123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const response = await POST(req({ ...valid, to: 'attacker@example.com' }));
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers.Authorization).toBe('Bearer secret-test-key');
    const payload = JSON.parse(options.body);
    expect(payload.to).toEqual(['gedsonmsilva@gmail.com']);
    expect(payload.reply_to).toBe(valid.email);
    expect(payload.text).toContain(valid.name);
    expect(payload.text).toContain(valid.message);
    expect(payload.from).toBe('Website <hello@example.com>');
  });
  it.each([
    { ...valid, name: '' }, { ...valid, email: 'not-email' }, { ...valid, message: '' },
    { ...valid, email: 'ada@example.com\r\nBcc: bad@example.com' },
    { ...valid, name: 'Ada\nBcc: bad@example.com' },
    { ...valid, message: 'x'.repeat(5001) }, { ...valid, name: 'x'.repeat(101) },
    null,
  ])('email-invalid: rejects invalid input %j without sending', async data => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect([400, 413]).toContain((await POST(req(data))).status);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('email-invalid: rejects malformed JSON', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await POST(new Request('https://gedson.example/api/contact', { method: 'POST', body: '{broken' }));
    expect(response.status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it('email-invalid: rejects oversized request', async () => {
    vi.stubGlobal('fetch', vi.fn());
    expect((await POST(req({ ...valid, message: 'x'.repeat(20000) }))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('email-origin: rejects foreign origin', async () => {
    vi.stubGlobal('fetch', vi.fn());
    expect((await POST(req(valid, 'https://evil.example'))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('email-unavailable: no success without private configuration', async () => {
    vi.stubEnv('RESEND_API_KEY', ''); vi.stubGlobal('fetch', vi.fn());
    expect((await POST(req(valid))).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['rejected', 'network'])('email-unavailable: provider %s does not expose secrets or report success', async kind => {
    vi.stubGlobal('fetch', kind === 'network' ? vi.fn().mockRejectedValue(new Error('secret-test-key')) : vi.fn().mockResolvedValue(new Response('secret-test-key', { status: 429 })));
    const response = await POST(req(valid));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('secret-test-key');
  });
});
describe('email-boundaries and integrated submission', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('CONTACT_FROM_EMAIL', 'hello@example.com');
    vi.stubEnv('CONTACT_TO_EMAIL', 'owner@example.com');
  });
  const emailAt = (length: number) => `${'a'.repeat(60)}@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(length - 187)}.com`;
  it.each([
    { ...valid, message: 'x'.repeat(10) },
    { ...valid, message: 'x'.repeat(5000) },
    { ...valid, name: 'n'.repeat(100) },
    { ...valid, email: emailAt(254) },
  ])('email-boundaries: accepts valid boundary %j', async input => {
    const provider = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })); vi.stubGlobal('fetch', provider);
    expect((await POST(req(input))).status).toBe(200);
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...valid, message: 'x'.repeat(9) }, { ...valid, message: ' '.repeat(20) },
    { ...valid, name: '   ' }, { ...valid, email: emailAt(255) },
    { email: valid.email, message: valid.message }, { name: valid.name, message: valid.message },
    { name: valid.name, email: valid.email }, { ...valid, name: 42 },
    { ...valid, email: ['ada@example.com'] }, { ...valid, message: {} },
  ])('email-boundaries: rejects invalid boundary %j without delivery', async input => {
    const provider = vi.fn(); vi.stubGlobal('fetch', provider);
    expect((await POST(req(input))).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });
  it('email-unavailable: missing sender prevents delivery', async () => {
    vi.stubEnv('CONTACT_FROM_EMAIL', ''); const provider = vi.fn(); vi.stubGlobal('fetch', provider);
    expect((await POST(req(valid))).status).toBe(503); expect(provider).not.toHaveBeenCalled();
  });
  it('form-integration: component request reaches real handler and provider', async () => {
    const provider = vi.fn().mockResolvedValue(new Response('{"id":"accepted"}', { status: 200 }));
    vi.stubGlobal('fetch', vi.fn((url, options) => {
      if (url === '/api/contact') return POST(new Request('https://gedson.example/api/contact', options));
      return provider(url, options);
    }));
    render(<ContactForm />); fill(); fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/sent/));
    expect(provider).toHaveBeenCalledTimes(1);
    expect(provider.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(provider.mock.calls[0][1].body)).toMatchObject({ to: ['owner@example.com'], reply_to: valid.email });
    expect(JSON.parse(provider.mock.calls[0][1].body).text).toContain(valid.message);
  });
});
function fill() {
  fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: valid.name } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: valid.email } });
  fireEvent.change(screen.getByLabelText(/^message/i), { target: { value: valid.message } });
}
it('form-success: posts data, disables pending, announces acceptance and resets', async () => {
  let resolve!: (value: Response) => void;
  const fetcher = vi.fn().mockReturnValue(new Promise(r => { resolve = r; })); vi.stubGlobal('fetch', fetcher);
  render(<ContactForm />); fill();
  fireEvent.click(screen.getByRole('button', { name: /send message/i }));
  expect(screen.getByRole('button')).toBeDisabled();
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject(valid);
  expect(fetcher.mock.calls[0][0]).toBe('/api/contact');
  expect(fetcher.mock.calls[0][1].method).toBe('POST');
  expect(fetcher.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/sent|thank/i));
  expect(screen.getByLabelText(/^message/i)).toHaveValue('');
  expect(screen.getByRole('button')).not.toBeDisabled();
});
it.each(['provider', 'network'])('form-failure: %s retains draft, announces error and allows retry', async kind => {
  const fetcher = kind === 'network' ? vi.fn().mockRejectedValueOnce(new Error('offline')) : vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 }));
  fetcher.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 })); vi.stubGlobal('fetch', fetcher);
  render(<ContactForm />); fill(); fireEvent.click(screen.getByRole('button', { name: /send message/i }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/try|unable|could not/i));
  expect(screen.getByLabelText(/^message/i)).toHaveValue(valid.message);
  expect(screen.getByRole('button')).not.toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /send message/i }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/sent|thank/i));
  expect(fetcher).toHaveBeenCalledTimes(2);
});
