import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import NavBar from '@/components/Navigation/NavBar';
import Breadcrumb from '@/components/Navigation/Breadcrumb';
import ScrollToTop from '@/components/Navigation/ScrollToTop';
import { ToastProvider } from '@/components/Feedback/ToastContext';
import LoadingBar from '@/components/Feedback/LoadingBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Insight Engine',
  description: 'CRM analytics and insights generation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-50 text-neutral-900`}>
        <Providers>
          <ToastProvider>
            <LoadingBar />
            <NavBar />
            <main className="min-h-screen p-4 md:p-8">
              <div className="max-w-7xl mx-auto">
                <Breadcrumb />
                {children}
              </div>
            </main>
            <ScrollToTop />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}