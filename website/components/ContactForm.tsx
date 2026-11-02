'use client';
import { useState } from 'react';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
export default function ContactForm() {
  const [state, setState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'pending') return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setState('pending');
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email: data.get('email'), message: data.get('message'), website: data.get('website') }) });
      if (!response.ok) throw new Error('Delivery unavailable');
      setState('success'); form.reset();
    } catch { setState('error'); }
  }
  return <form className="contact-form" onSubmit={submit} aria-label="Contact Gedson">
    <div className="form-row"><div><label htmlFor="name">Name <span>*</span></label><input id="name" name="name" placeholder="Your name" autoComplete="name" maxLength={100} required /></div><div><label htmlFor="email">Email <span>*</span></label><input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" maxLength={254} required /></div></div>
    <div className="honey" aria-hidden="true"><label htmlFor="website">Leave this empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
    <label htmlFor="message">Message <span>*</span></label><textarea id="message" name="message" placeholder="What are you thinking about building?" rows={5} minLength={10} maxLength={5000} required />
    <div className="form-bottom"><p>Your details are used only to reply.<br/>No mailing lists. Just a conversation.</p><button className="button button-dark" type="submit" disabled={state === 'pending'}>{state === 'pending' ? <>Sending <LoaderCircle size={17} className="spin" /></> : <>Send message <ArrowUpRight size={17}/></>}</button></div>
    {state === 'success' && <p className="form-notice success" role="status">Thank you — your message has been sent. I’ll get back to you by email.</p>}
    {state === 'error' && <p className="form-notice error" role="alert">Your message could not be sent. Please try again, or email <a href="mailto:gedsonmsilva@gmail.com">gedsonmsilva@gmail.com</a> directly. Your draft is still here.</p>}
  </form>;
}
