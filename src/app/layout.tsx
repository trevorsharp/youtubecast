import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'YouTubeCast',
  description: 'Create podcast feeds from YouTube channels',
  icons: {
    icon: { rel: 'icon', url: '/favicon.ico' },
    apple: { rel: 'icon', url: '/apple-touch-icon.png' },
  },
};

export const viewport: Viewport = {
  themeColor: '#ED0000',
};

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <html lang="en" className="text-base tiny:text-tiny mobile:text-mobile normal:text-normal">
      <body className="bg-youtube">
        <main className="bg-white text-neutral-800 dark:bg-neutral-900 dark:text-white">
          {children}
        </main>
      </body>
    </html>
  );
};

export default Layout;
export const fetchCache = 'default-no-store';
