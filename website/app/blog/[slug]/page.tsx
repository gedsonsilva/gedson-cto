import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { posts } from '../../../lib/posts';
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return posts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props) { const { slug } = await params; const post = posts.find(p => p.slug === slug); return { title: post?.title || 'Article not found', description: post?.summary }; }
export default async function Article({ params }: Props) {
  const { slug } = await params; const post = posts.find(p => p.slug === slug);
  if (!post) notFound();
  return <main id="main" className="article-main container"><Link className="text-link back-link" href="/blog"><ArrowLeft size={16}/> All writing</Link><article><header className="article-header"><div className="post-meta"><span>{post.category}</span><span>{post.readTime}</span></div><h1>{post.title}</h1><p className="article-deck">{post.summary}</p><div className="article-author"><span className="author-avatar">GS</span><div><strong>Gedson Silva</strong><span>Engineer & architect · Field notes</span></div></div></header><div className="article-body">{post.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(p => <p key={p}>{p}</p>)}</section>)}</div><aside className="article-end"><h2>Keep the conversation going.</h2><p>Architecture improves when ideas meet a different perspective.</p><Link className="text-link" href="/#contact">Share your thoughts <ArrowUpRight size={17}/></Link></aside></article></main>;
}
