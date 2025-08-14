# GeoLeads Enricher

GeoLeads Enricher is a powerful tool designed to automate the process of extracting and enriching business data from Google Maps. It enables you to find, verify, and contact businesses in specific geographic areas.

## Features

- **Google Maps Data Extraction**: Search for businesses by city or coordinates with category filtering
- **Email Finding and Verification**: Automatically discover and verify business email addresses
- **Social Media Profile Discovery**: Find LinkedIn and Facebook profiles for businesses
- **Campaign Management**: Organize and manage outreach campaigns
- **Lead Database**: Store and filter all your business leads in one place

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- A web browser (Chrome recommended)

### Installation

1. Clone this repository:
```
git clone https://github.com/yourusername/geoleads-enricher.git
cd geoleads-enricher
```

2. Install dependencies:
```
npm install
```

3. Run the development server:
```
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## How to Use

### Extracting Leads

1. Navigate to the "Extract Leads" page
2. Choose your search method (City or Coordinates)
3. Enter location details (city/country or coordinates)
4. Select business categories (up to 4)
5. Enter required information (currency, created by)
6. Click "Start Search" and wait for results
7. Review found businesses and click "Import Selected Businesses"

### Enriching Leads

1. On the "Leads" page, select businesses to enrich
2. Click "Enrich Selected" at the top of the page
3. Choose enrichment options (email, LinkedIn, Facebook)
4. Select API services to use (Hunter.io, Snov.io, custom scraper)
5. Click "Start Enrichment" and wait for the process to complete

### Managing Campaigns

1. Go to the "Campaigns" page
2. Connect your Instantly account using your API key
3. View and manage campaigns synchronized from Instantly
4. Select leads from your database and send them to campaigns

## API Integration

To fully utilize all features, you'll need to set up the following API integrations:

- **Google Maps**: For business data extraction
- **Hunter.io**: For email discovery and verification
- **Snov.io**: For additional email finding capabilities
- **Instantly**: For campaign management and email outreach

API keys and configuration can be set in the application settings.

## Data Privacy and Usage

- Ensure you comply with all applicable laws when collecting and using business data
- Respect email marketing regulations such as CAN-SPAM, GDPR, etc.
- Use the tool responsibly and ethically

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please contact [support@geoleadsenricher.com](mailto:support@geoleadsenricher.com).
