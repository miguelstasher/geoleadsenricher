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
  uploadedLeadsCount?: number;
}

interface InstantlyCampaignData {
  id: string;
  name: string;
  pl_value: number | null;
  status: number;
  status_display: string;
  is_evergreen: boolean | null;
  campaign_schedule: any;
  campaign_schedule_formatted: any;
  sequences: any[];
  timestamp_created: string;
  timestamp_created_formatted: string;
  timestamp_updated: string;
  timestamp_updated_formatted: string;
  email_gap: number | null;
  random_wait_max: number | null;
  text_only: boolean | null;
  email_list: string[];
  daily_limit: number | null;
  stop_on_reply: boolean | null;
  email_tag_list: string[];
  link_tracking: boolean | null;
  open_tracking: boolean | null;
  stop_on_auto_reply: boolean | null;
  daily_max_leads: number | null;
  prioritize_new_leads: boolean | null;
  auto_variant_select: any;
  match_lead_esp: boolean | null;
  stop_for_company: boolean | null;
  insert_unsubscribe_header: boolean | null;
  allow_risky_contacts: boolean | null;
  disable_bounce_protect: boolean | null;
  cc_list: string[];
  bcc_list: string[];
  organization: string | null;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [instantlyData, setInstantlyData] = useState<InstantlyCampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        // Fetch basic campaign data
        const response = await fetch(`/api/campaigns/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setCampaign(data);
          
          // Fetch detailed Instantly.ai data
          try {
            console.log('Fetching Instantly data for campaign:', params.id);
            const instantlyResponse = await fetch(`/api/campaigns/${params.id}/instantly`);
            console.log('Instantly response status:', instantlyResponse.status);
            
            if (instantlyResponse.ok) {
              const instantlyData = await instantlyResponse.json();
              console.log('Instantly data received:', instantlyData);
              setInstantlyData(instantlyData);
            } else {
              const errorData = await instantlyResponse.text();
              console.log('Could not fetch Instantly data:', instantlyResponse.status, errorData);
            }
          } catch (instantlyErr) {
            console.log('Error fetching Instantly data:', instantlyErr);
          }
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

        {/* Instantly.ai Campaign Details */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Instantly.ai Campaign Details</h2>
            
            {instantlyData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Basic Info */}
                <div className="md:col-span-2 lg:col-span-3">
                  <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Instantly Status</label>
                      <p className="mt-1 text-sm text-gray-900 font-medium">{instantlyData.status_display}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Positive Lead Value</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.pl_value ? `$${instantlyData.pl_value}` : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Evergreen Campaign</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.is_evergreen ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Text Only</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.text_only ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                {instantlyData.campaign_schedule_formatted && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Campaign Schedule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Start Date</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {instantlyData.campaign_schedule_formatted.start_date_formatted || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">End Date</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {instantlyData.campaign_schedule_formatted.end_date_formatted || 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Settings */}
                <div className="md:col-span-2 lg:col-span-3">
                  <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Email Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Email Gap (minutes)</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.email_gap || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Random Wait Max (minutes)</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.random_wait_max || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Daily Limit</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.daily_limit || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Daily Max Leads</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.daily_max_leads || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Stop on Reply</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.stop_on_reply ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Stop on Auto Reply</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.stop_on_auto_reply ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tracking & Behavior */}
                <div className="md:col-span-2 lg:col-span-3">
                  <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Tracking & Behavior</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Link Tracking</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.link_tracking ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Open Tracking</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.open_tracking ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Prioritize New Leads</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.prioritize_new_leads ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Match Lead ESP</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.match_lead_esp ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Stop for Company</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.stop_for_company ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Allow Risky Contacts</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.allow_risky_contacts ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email Lists */}
                {(instantlyData.email_list?.length > 0 || instantlyData.cc_list?.length > 0 || instantlyData.bcc_list?.length > 0) && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Email Lists</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {instantlyData.email_list?.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600">From Emails ({instantlyData.email_list.length})</label>
                          <div className="mt-1 text-sm text-gray-900">
                            {instantlyData.email_list.slice(0, 3).map((email, index) => (
                              <div key={index} className="truncate">{email}</div>
                            ))}
                            {instantlyData.email_list.length > 3 && (
                              <div className="text-gray-500">+{instantlyData.email_list.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      )}
                      {instantlyData.cc_list?.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600">CC List ({instantlyData.cc_list.length})</label>
                          <div className="mt-1 text-sm text-gray-900">
                            {instantlyData.cc_list.slice(0, 3).map((email, index) => (
                              <div key={index} className="truncate">{email}</div>
                            ))}
                            {instantlyData.cc_list.length > 3 && (
                              <div className="text-gray-500">+{instantlyData.cc_list.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      )}
                      {instantlyData.bcc_list?.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600">BCC List ({instantlyData.bcc_list.length})</label>
                          <div className="mt-1 text-sm text-gray-900">
                            {instantlyData.bcc_list.slice(0, 3).map((email, index) => (
                              <div key={index} className="truncate">{email}</div>
                            ))}
                            {instantlyData.bcc_list.length > 3 && (
                              <div className="text-gray-500">+{instantlyData.bcc_list.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="md:col-span-2 lg:col-span-3">
                  <h3 className="text-md font-medium text-gray-700 mb-3 border-b pb-2">Timestamps</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Created in Instantly</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.timestamp_created_formatted}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Last Updated in Instantly</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {instantlyData.timestamp_updated_formatted}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Unable to load Instantly.ai data</h3>
                <p className="text-sm text-gray-500">
                  The campaign details from Instantly.ai could not be loaded. This might be due to API authentication issues or network problems.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Check the browser console for more details.
                </p>
              </div>
            )}
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
              <div>
                <label className="block text-sm font-medium text-gray-700">Uploaded Leads</label>
                <p className="mt-1 text-sm text-gray-900">
                  <span className="font-semibold text-green-600">
                    {campaign.uploadedLeadsCount || 0}
                  </span>
                  <span className="text-gray-500 ml-1">leads successfully uploaded to Instantly</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Only counts leads that were actually uploaded (excludes skipped, blocklisted, invalid, or duplicate leads)
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