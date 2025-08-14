'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Campaign {
  id: string;
  name: string;
  instantly_id: string;
  status: string;
  created_at: string;
  last_updated: string;
  description?: string;
  target_audience?: string;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/campaigns/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setCampaign(data);
        } else {
          setError('Campaign not found');
        }
      } catch (err) {
        setError('Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCampaign();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 p-4 rounded-lg mb-4">
            <p className="text-red-600">{error || 'Campaign not found'}</p>
          </div>
          <button
            onClick={() => router.push('/campaigns')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                <p className="text-sm text-gray-500 mt-1">Campaign ID: {campaign.id}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  campaign.status === 'Live' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {campaign.status}
                </span>
                <button
                  onClick={() => router.push('/campaigns')}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  ← Back to Campaigns
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Instantly Campaign ID</label>
                <p className="mt-1 text-sm text-gray-900">{campaign.instantly_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1 text-sm text-gray-900">{campaign.status}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(campaign.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(campaign.last_updated).toLocaleString()}
                </p>
              </div>
              {campaign.description && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{campaign.description}</p>
                </div>
              )}
              {campaign.target_audience && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                  <p className="mt-1 text-sm text-gray-900">{campaign.target_audience}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://app.instantly.ai/app/campaign/${campaign.instantly_id}/analytics`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center space-x-2"
              >
                <span>📊</span>
                <span>View in Instantly</span>
              </a>
              <button
                onClick={() => router.push('/leads?campaign=' + encodeURIComponent(campaign.name))}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <span>👥</span>
                <span>View Campaign Leads</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 