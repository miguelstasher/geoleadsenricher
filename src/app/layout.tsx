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
        <link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOEI1Q0Y2O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjUwJSIgc3R5bGU9InN0b3AtY29sb3I6I0VDNDg5OTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojM0I4MkY2O3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0idXJsKCNncmFkaWVudCkiLz4KICA8cGF0aCBkPSJNMTYgNkMxMi42ODYgNiAxMCA4LjY4NiAxMCAxMkMxMCAxNyAxNiAyNiAxNiAyNlMyMiAxNyAyMiAxMkMyMiA4LjY4NiAxOS4zMTQgNiAxNiA2Wk0xNiAxNUMxNC4zNDMgMTUgMTMgMTMuNjU3IDEzIDEyQzEzIDEwLjM0MyAxNC4zNDMgOSAxNiA5QzE3LjY1NyA5IDE5IDEwLjM0MyAxOSAxMkMxOSAxMy42NTcgMTcuNjU3IDE1IDE2IDE1WiIgZmlsbD0id2hpdGUiLz4KICA8Y2lyY2xlIGN4PSI4IiBjeT0iOCIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC44Ii8+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSI4IiByPSIxLjUiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjgiLz4KICA8Y2lyY2xlIGN4PSI4IiBjeT0iMjQiIHI9IjEuNSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuOCIvPgogIDxjaXJjbGUgY3g9IjI0IiBjeT0iMjQiIHI9IjEuNSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K" type="image/svg+xml" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style dangerouslySetInnerHTML={{
          __html: `
            /* MINIMAL CSS - ONLY DASHBOARD WHITE BACKGROUND */
            /* Dashboard page white background */
            main .min-h-screen.bg-white {
              background: #ffffff !important;
            }
            
            /* Dashboard text should be dark on white */
            main .min-h-screen.bg-white * {
              color: #111827 !important;
            }
          `
        }} />
      </head>
      <body className={`${inter.className} bg-white`}>
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
/* Force deployment - Wed Oct 22 15:06:03 BST 2025 */
/* DEPLOY LATEST - Wed Oct 22 15:13:04 BST 2025 */
/* TRIGGER NEW DEPLOYMENT - Wed Oct 22 15:25:00 BST 2025 */
/* FORCE DEPLOYMENT - 2025-10-22 15:33:25 */
/* EMERGENCY DEPLOYMENT TRIGGER - 2025-10-22 15:35:28 */
/* FORCE WHITE BACKGROUND - URGENT */
/* Test deployment - Wed Oct 22 15:42:02 BST 2025 */
