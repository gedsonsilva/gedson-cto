import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export default function Header() {
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><div className="container header-inner"><Link href="/" className="brand" aria-label="Gedson Silva home"><span className="brand-mark">gs<span>.</span></span><span className="brand-name">Gedson Silva<span>ENGINEER & ARCHITECT</span></span></Link><nav aria-label="Main navigation"><Link href="/#about">About</Link><Link href="/#experience">Experience</Link><Link href="/blog">Writing</Link><Link className="nav-contact" href="/#contact">Let’s talk <ArrowUpRight size={15}/></Link></nav></div></header></>;
}
