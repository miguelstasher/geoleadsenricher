'use client';

import dynamic from 'next/dynamic';

// Dynamically import the client component to avoid SSR issues
const LeadsClient = dynamic(() => import('./LeadsClient'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>
  ),
});

export default function LeadsPage() {
  return <LeadsClient />;
}