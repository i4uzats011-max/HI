import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Books Match - Multi-Branch Accounting & Party Ledger Reconciliation',
  description: 'Tally DayBook Multi-Branch & Multi-Company Ledger Reconciliation System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased touch-manipulation">
        {children}
      </body>
    </html>
  );
}
