import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TeleNexus — Telegram Personal Intelligence & CRM',
  description: 'TeleNexus: Telegram Personal Intelligence & Contact Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="ltr" className="dark">
      <body className="h-screen w-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
