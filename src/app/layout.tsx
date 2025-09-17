import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from './components/SimpleNotificationProvider';
import ConditionalNavigation from './components/ConditionalNavigation';
import AuthWrapper from './components/AuthWrapper';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GeoLeads Enricher",
  description: "Professional sales tool for lead generation and enrichment",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <NotificationProvider>
          <AuthWrapper>
            <ConditionalNavigation>
              {children}
            </ConditionalNavigation>
          </AuthWrapper>
        </NotificationProvider>
      </body>
    </html>
  );
}
