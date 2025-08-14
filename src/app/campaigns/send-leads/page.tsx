import Link from 'next/link';

export default function SendLeadsPage() {
  // Sample data - in a real app this would come from an API or database based on query params
  const campaignId = 'camp_123';
  const campaignName = 'Hotel Outreach - Q2';
  
  // Sample leads that would be selected
  const leads = [
    {
      id: 1,
      name: 'Oceanview Hotel',
      type: 'Hotel',
      location: 'Miami, FL',
      website: 'oceanviewhotel.com',
      email: 'info@oceanviewhotel.com',
      status: 'Verified'
    },
    {
      id: 2,
      name: 'Urban Coffee Shop',
      type: 'Cafe',
      location: 'New York, NY',
      website: 'urbancoffee.com',
      email: 'hello@urbancoffee.com',
      status: 'Verified'
    },
    {
      id: 3,
      name: 'Tech Workspace',
      type: 'Office Space',
      location: 'San Francisco, CA',
      website: 'techworkspace.com',
      email: 'info@techworkspace.com',
      status: 'Verified'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Send Leads to Campaign</h1>
        <Link 
          href="/campaigns" 
          className="text-blue-600 hover:underline"
        >
          Back to Campaigns
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Campaign Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Campaign ID</p>
            <p className="font-medium">{campaignId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Campaign Name</p>
            <p className="font-medium">{campaignName}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Selected Leads</h2>
            <p className="text-sm text-gray-500">{leads.length} leads selected</p>
          </div>
          <button
            type="button"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send to Campaign
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input type="checkbox" className="mr-2" defaultChecked /> Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="font-medium text-gray-900">{lead.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex justify-center space-x-4">
        <button
          type="button"
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          type="button"
          className="bg-blue-600 text-white px-8 py-2 rounded hover:bg-blue-700"
        >
          Send Leads to Campaign
        </button>
      </div>
      
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h2 className="text-lg font-semibold text-green-800 mb-2">What Happens Next?</h2>
        <p className="text-green-700 mb-4">
          When you send leads to an Instantly campaign:
        </p>
        <ol className="list-decimal pl-5 text-green-700 space-y-2">
          <li>The selected leads will be added to the campaign in Instantly</li>
          <li>Each lead will be marked as "Contacted" in your database</li>
          <li>You'll be able to track which leads were sent to which campaigns</li>
          <li>Your email outreach sequence will begin according to your Instantly campaign settings</li>
        </ol>
        <p className="mt-4 text-green-700">
          <strong>Important:</strong> Make sure all selected leads have verified email addresses to ensure delivery.
        </p>
      </div>
    </div>
  );
} 