'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the client component to avoid SSR issues
const LeadsClient = dynamic(() => import('./LeadsClient'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col justify-center items-center h-64 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span className="text-gray-600 text-lg">Loading leads...</span>
      <p className="text-gray-500 text-sm">Please wait while we fetch your data</p>
    </div>
  ),
});

export default function LeadsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="text-gray-600 text-lg">Loading leads...</span>
        <p className="text-gray-500 text-sm">Please wait while we fetch your data</p>
      </div>
    }>
      <LeadsClient />
    </Suspense>
  );
}