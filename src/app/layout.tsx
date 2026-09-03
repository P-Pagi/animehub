import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { VisitorTracker } from '@/components/visitor-tracker';
import { NavigationProgressBar } from '@/components/navigation-progress-bar';
import { NextAuthProvider } from '@/components/next-auth-provider';
import { ReactQueryProvider } from '@/components/react-query-provider';
import { TrialBanner } from '@/components/trial-banner';
import { startBackgroundSync } from '@/lib/cache/scheduler';

// Start background worker for data sync & cache warming
startBackgroundSync();

const galanoFallback = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-galano-fallback',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AnimeHub - Streaming Anime Subtitle Indonesia',
    template: '%s - AnimeHub',
  },
  description:
    'Nonton streaming anime subtitle Indonesia terbaru secara gratis.',
  keywords: ['anime', 'streaming anime', 'sub indo', 'nonton anime', 'animehub'],
  authors: [{ name: 'AnimeHub Team' }],
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://animehub.local',
    siteName: 'AnimeHub',
    title: 'AnimeHub - Streaming Anime Subtitle Indonesia',
    description: 'Nonton streaming anime gratis subtitle Indonesia terbaru.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AnimeHub - Streaming Anime Subtitle Indonesia',
    description: 'Nonton streaming anime gratis subtitle Indonesia terbaru.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${galanoFallback.variable} font-sans bg-brand-dark text-slate-100 min-h-screen flex flex-col antialiased selection:bg-indigo-500 selection:text-white`}
      >
        <ReactQueryProvider>
          <NextAuthProvider>
            <NavigationProgressBar />
            <VisitorTracker />
            <Navbar />
            <TrialBanner />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer />
          </NextAuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
