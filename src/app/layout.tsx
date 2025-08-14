import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from './components/SimpleNotificationProvider';
import Navigation from './components/Navigation';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GeoLeads Enricher",
  description: "Sales tool for lead generation and enrichment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NotificationProvider>
          <Navigation />
          <main className="container mx-auto p-4">
            {children}
          </main>
        </NotificationProvider>
      </body>
    </html>
  );
}
