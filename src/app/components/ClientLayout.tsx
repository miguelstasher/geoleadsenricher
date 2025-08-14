'use client';

import { NotificationProvider } from './NotificationProvider';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
} 