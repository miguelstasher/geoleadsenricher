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
            /* CACHE BUST - FORCE RELOAD - ${Date.now()} */
            /* NUCLEAR WHITE BACKGROUND - DEPLOY NOW - ${Date.now()} */
            html, body, #__next, main {
              background: #ffffff !important;
              background-color: #ffffff !important;
            }
            
            /* ULTRA-AGGRESSIVE WHITE BACKGROUND - FORCE EVERYWHERE */
            body, html, #__next, main, div, section, article, aside, header, footer {
              background: #ffffff !important;
              background-color: #ffffff !important;
            }
            
            /* NUCLEAR OPTION - FORCE WHITE ON EVERYTHING */
            *, *::before, *::after {
              background: #ffffff !important;
              background-color: #ffffff !important;
            }
            
            /* Override any dark themes completely */
            .dark, [data-theme="dark"], .bg-gray-900, .bg-gray-800, .bg-black, .bg-slate-900, .bg-slate-800 {
              background: #ffffff !important;
              background-color: #ffffff !important;
            }
            
            /* Force white background on ALL page containers */
            .space-y-6, .min-h-screen, .bg-gray-50, .bg-gray-100 {
              background: #ffffff !important;
            }
            
            /* Override any dark theme classes */
            .dark, [data-theme="dark"], .bg-gray-900, .bg-gray-800, .bg-black {
              background: #ffffff !important;
            }
            
            /* Override any dark backgrounds */
            .bg-gray-900, .bg-gray-800, .bg-black {
              background: #ffffff !important;
            }
            
            /* Force white background on extract page specifically */
            .space-y-6 {
              background: #ffffff !important;
            }
            
            /* Force white background on all divs */
            div {
              background: #ffffff !important;
            }
            
            /* Exception for navigation and buttons */
            nav, button, .bg-blue-600, .bg-blue-700, .bg-green-600, .bg-red-600 {
              background: inherit !important;
            }
            
            /* Force white background on main content area */
            main {
              background: #ffffff !important;
              background-color: #ffffff !important;
            }
            
            /* Force white background on the extract page container */
            .space-y-6 > div {
              background: #ffffff !important;
            }
            
            /* Fix ONLY the specific white text in the columns modal */
            .bg-white .font-medium.text-gray-600 {
              color: #171717 !important;
            }
            
            /* Fix white titles on dashboard */
            .text-2xl.font-bold.text-gray-900,
            .text-xl.font-semibold.text-gray-900 {
              color: #171717 !important;
            }
            
            /* Fix extract page title */
            h1.text-2xl.font-bold {
              color: #171717 !important;
            }
            
            /* ULTRA-AGGRESSIVE DASHBOARD FIXES */
            /* Force white background on dashboard */
            .space-y-6, .min-h-screen {
              background: #ffffff !important;
            }
            
            /* Fix dashboard card text - make it black on white */
            .bg-white, .bg-white * {
              color: #111827 !important;
            }
            
            /* Fix dashboard statistics text */
            .text-3xl, .text-2xl, .text-xl, .text-lg {
              color: #111827 !important;
            }
            
            /* Fix dashboard titles */
            h1, h2, h3, h4, h5, h6 {
              color: #111827 !important;
            }
            
            /* NUCLEAR DASHBOARD FIX - ELIMINATE ALL BLACK */
            .space-y-6, .min-h-screen, main, body, html {
              background: #ffffff !important;
              background-color: #ffffff !important;
            }
            
            /* FORCE WHITE BACKGROUND ON ALL PAGE CONTAINERS */
            .min-h-screen, .space-y-6, .space-y-8 {
              background: #ffffff !important;
              background-color: #ffffff !important;
            }
            
            /* OVERRIDE GRAY BACKGROUNDS */
            .bg-gray-50, .bg-gray-100, .bg-slate-50, .bg-slate-100 {
              background: #ffffff !important;
              background-color: #ffffff !important;
            }
            
            /* Force white on all dashboard containers */
            .bg-white, .bg-gray-50, .bg-gray-100, .bg-slate-50, .bg-slate-100 {
              background: #ffffff !important;
            }
            
            /* Override any remaining dark backgrounds */
            .bg-gray-900, .bg-gray-800, .bg-black, .bg-slate-900, .bg-slate-800, .bg-zinc-900, .bg-zinc-800 {
              background: #ffffff !important;
            }
            
           /* Fix placeholder text visibility */
           *::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           input::placeholder,
           textarea::placeholder,
           select::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           input, textarea, select {
             color: #111827 !important;
           }
           
           /* Specific fixes for extract page placeholders */
           input[placeholder="Enter city name"]::placeholder,
           input[placeholder="Enter city name (e.g. London)"]::placeholder,
           input[placeholder="e.g 500"]::placeholder,
           input[placeholder="In this format: 56.39283, -9.83748"]::placeholder,
           input[placeholder="e.g Hotel, Co-working, Bike Rental"]::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* ULTRA-AGGRESSIVE placeholder fixes */
           input[type="text"]::placeholder,
           input[type="number"]::placeholder,
           select::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* Force all input placeholders to be dark */
           input::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* Override any Tailwind placeholder classes */
           .placeholder-gray-400::placeholder,
           .placeholder-slate-400::placeholder,
           .placeholder-gray-300::placeholder,
           .placeholder-slate-300::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* ULTRA-AGGRESSIVE placeholder fixes for extract page */
           input[type="text"]::placeholder,
           input[type="number"]::placeholder,
           input[type="email"]::placeholder,
           textarea::placeholder,
           select::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* Force ALL placeholders to be dark gray */
           *::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* Target specific classes used in extract page */
           .shadow-sm::placeholder,
           .border-gray-300::placeholder,
           .block::placeholder,
           .w-full::placeholder,
           .sm\\:text-sm::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* Force all form elements to have dark placeholders */
           form input::placeholder,
           form select::placeholder,
           form textarea::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* NUCLEAR OPTION - Force ALL placeholders to be dark - CACHE BUST 2024-01-15 */
           *::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* Force all input and select elements to have dark placeholders */
           input::placeholder,
           select::placeholder,
           textarea::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* SIMPLE COLOR SYSTEM - COMMON SENSE */
           /* WHITE BACKGROUNDS = DARK TEXT */
           .bg-white,
           .bg-gray-50,
           .bg-gray-100,
           main {
             color: #111827 !important;
           }
           
           .bg-white *,
           .bg-gray-50 *,
           .bg-gray-100 *,
           main * {
             color: #111827 !important;
           }
           
           /* COLORED BACKGROUNDS = WHITE TEXT */
           nav,
           .bg-blue-600,
           .bg-blue-700,
           .bg-gradient-to-r,
           .bg-purple-600,
           .bg-green-600,
           .bg-red-600,
           .bg-yellow-600,
           .bg-indigo-600,
           .bg-pink-600 {
             color: white !important;
           }
           
           nav *,
           .bg-blue-600 *,
           .bg-blue-700 *,
           .bg-gradient-to-r *,
           .bg-purple-600 *,
           .bg-green-600 *,
           .bg-red-600 *,
           .bg-yellow-600 *,
           .bg-indigo-600 *,
           .bg-pink-600 * {
             color: white !important;
           }
           
           /* FORM ELEMENTS = DARK TEXT */
           input,
           textarea,
           select,
           label {
             color: #111827 !important;
           }
           
           /* PLACEHOLDER TEXT = VISIBLE GRAY */
           input::placeholder,
           textarea::placeholder,
           select::placeholder {
             color: #374151 !important;
             opacity: 1 !important;
           }
           
           /* DROPDOWN MENUS = DARK TEXT ON WHITE BACKGROUND */
           .dropdown,
           [class*="dropdown"],
           .absolute,
           .relative .absolute {
             color: #111827 !important;
           }
           
           .dropdown *,
           [class*="dropdown"] *,
           .absolute *,
           .relative .absolute * {
             color: #111827 !important;
           }
           
           /* SPECIFIC DROPDOWN FIXES */
           .bg-white .dropdown,
           .bg-white [class*="dropdown"],
           .bg-white .absolute {
             color: #111827 !important;
           }
           
           .bg-white .dropdown *,
           .bg-white [class*="dropdown"] *,
           .bg-white .absolute * {
             color: #111827 !important;
           }
           
           /* Fix select option text */
           option {
             color: #111827 !important;
             background-color: #ffffff !important;
           }
           
           /* Fix select placeholder options */
           select option[value=""] {
             color: #6b7280 !important;
           }
           
           /* NOTIFICATION FIXES - Ensure notifications are always visible */
           .fixed.top-4.right-4 {
             background-color: #ffffff !important;
             color: #111827 !important;
           }
           
           .fixed.top-4.right-4 * {
             color: #111827 !important;
           }
           
           .bg-red-50 {
             background-color: #fef2f2 !important;
             color: #991b1b !important;
           }
           
           .bg-green-50 {
             background-color: #f0fdf4 !important;
             color: #166534 !important;
           }
           
           .bg-blue-50 {
             background-color: #eff6ff !important;
             color: #1e40af !important;
           }
           
           .bg-yellow-50 {
             background-color: #fefce8 !important;
             color: #a16207 !important;
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
