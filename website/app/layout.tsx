import type { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Gedson Silva — Engineer & AI Solutions Architect', template: '%s | Gedson Silva' }, description: 'Engineer-first architecture. Gedson Silva writes about AI systems, distributed software and building technology that teams can operate and evolve.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Header />{children}<Footer /></body></html>; }
