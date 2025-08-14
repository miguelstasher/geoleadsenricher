import Link from 'next/link';

export default function EnrichLeadsPage() {
  // Sample data - in a real app this would come from an API or database
  const leads = [
    {
      id: 1,
      name: 'Oceanview Hotel',
      type: 'Hotel',
      location: 'Miami, FL',
      website: 'oceanviewhotel.com',
      email: 'Unknown',
      status: 'Not Verified'
    },
    {
      id: 2,
      name: 'Urban Coffee Shop',
      type: 'Cafe',
      location: 'New York, NY',
      website: 'urbancoffee.com',
      email: 'Unknown',
      status: 'Not Verified'
    },
    {
      id: 3,
      name: 'Tech Workspace',
      type: 'Office Space',
      location: 'San Francisco, CA',
      website: 'techworkspace.com',
      email: 'Unknown',
      status: 'Not Verified'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Enrich Leads</h1>
        <Link 
          href="/leads" 
          className="text-blue-600 hover:underline"
        >
          Back to Leads
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Data Enrichment Options</h2>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="emailEnrichment"
              name="emailEnrichment"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              defaultChecked
            />
            <label htmlFor="emailEnrichment" className="ml-2 block text-sm text-gray-700">
              Find and verify email addresses
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              id="linkedinEnrichment"
              name="linkedinEnrichment"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              defaultChecked
            />
            <label htmlFor="linkedinEnrichment" className="ml-2 block text-sm text-gray-700">
              Find LinkedIn profiles
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              id="facebookEnrichment"
              name="facebookEnrichment"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              defaultChecked
            />
            <label htmlFor="facebookEnrichment" className="ml-2 block text-sm text-gray-700">
              Find Facebook pages
            </label>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-md font-medium mb-2">API Services to Use</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="hunterIo"
                name="hunterIo"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                defaultChecked
              />
              <label htmlFor="hunterIo" className="ml-2 block text-sm text-gray-700">
                Hunter.io (Email finding and verification)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="snovIo"
                name="snovIo"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                defaultChecked
              />
              <label htmlFor="snovIo" className="ml-2 block text-sm text-gray-700">
                Snov.io (Additional email finding)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="customScraper"
                name="customScraper"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                defaultChecked
              />
              <label htmlFor="customScraper" className="ml-2 block text-sm text-gray-700">
                Custom Website Scraper (Fall-back method)
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Selected Leads to Enrich</h2>
          <button
            type="button"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Start Enrichment
          </button>
        </div>
        
        {leads.length > 0 ? (
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
                    Website
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Status
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
                      {lead.website}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">No leads selected for enrichment. Please go back and select leads first.</p>
            <Link 
              href="/leads" 
              className="inline-block mt-4 text-blue-600 hover:underline"
            >
              Select Leads
            </Link>
          </div>
        )}
      </div>
      
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">About the Enrichment Process</h2>
        <p className="text-yellow-700 mb-4">
          The enrichment process attempts to find business contact details through multiple methods:
        </p>
        <ol className="list-decimal pl-5 text-yellow-700 space-y-2">
          <li>First, we search for email addresses using Hunter.io's database</li>
          <li>If unsuccessful, we try using Snov.io's service to find business emails</li>
          <li>As a last resort, our custom scraper visits the business website to extract contact information</li>
          <li>All found emails are verified to ensure deliverability</li>
          <li>The system also attempts to find relevant social media profiles</li>
        </ol>
        <p className="mt-4 text-yellow-700">
          <strong>Note:</strong> This process may take several minutes depending on the number of leads selected.
        </p>
      </div>
    </div>
  );
} 