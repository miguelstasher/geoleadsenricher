// Google Maps API utility functions
// Based on the Airtable automation scripts

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCWLWBJJeNyMsV1ieKMQl53OJuzZLOYP-k';

export interface SearchPoint {
  lat: number;
  lng: number;
}

export interface SearchArea {
  point: SearchPoint;
  radius: number;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  category?: string;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  website?: string;
  formatted_phone_number?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface CitySearchParams {
  city: string;
  country: string;
  categories: string[];
}

// Function to sleep for some time
function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// Generate unique ID from place_id (same as Airtable script)
export function generateIdFromPlaceId(placeId: string): string {
  let hash = 0;
  for (let i = 0; i < placeId.length; i++) {
    const char = placeId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `ID${Math.abs(hash)}`;
}

// Function to fetch places from Google Places Text Search API with pagination
export async function fetchPlacesFromTextSearch(googleMapsUrl: string): Promise<GooglePlace[]> {
  let places: GooglePlace[] = [];
  let nextPageToken: string | null = null;
  
  do {
    let responseUrl = googleMapsUrl;
    if (nextPageToken) {
      responseUrl += `&pagetoken=${nextPageToken}`;
      // Pause to give time for the token to become valid
      await sleep(2000);
    }

    const response = await fetch(responseUrl);
    const data = await response.json();

    console.log('API Response:', data);
    console.log('+++++++++++++++++++++++++++++++++++++++++');

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Error fetching data from Google Maps: ${data.status}`);
    }

    places = places.concat(data.results);
    nextPageToken = data.next_page_token || null;
  } while (nextPageToken);

  return places;
}

// City search implementation using 9-directional strategy
export async function performCitySearch(
  searchParams: CitySearchParams,
  progressCallback?: (current: number, total: number, message: string) => void
): Promise<GooglePlace[]> {
  const { city, country, categories } = searchParams;
  
  // Define the 9 directional search areas
  const searchDirections = [
    { name: 'center', location: `Center of ${city}` },
    { name: 'north', location: `North of ${city}` },
    { name: 'south', location: `South of ${city}` },
    { name: 'east', location: `East of ${city}` },
    { name: 'west', location: `West of ${city}` },
    { name: 'northEast', location: `North East of ${city}` },
    { name: 'southEast', location: `South East of ${city}` },
    { name: 'northWest', location: `North West of ${city}` },
    { name: 'southWest', location: `South West of ${city}` }
  ];

  let allPlaces: GooglePlace[] = [];
  let currentStep = 0;
  const totalSteps = searchDirections.length + 1; // +1 for aggregation step

  // Step 1-9: Search each direction
  for (const direction of searchDirections) {
    currentStep++;
    progressCallback?.(currentStep, totalSteps, `Fetching ${direction.name} point places`);
    
    console.log(`\n=== Searching ${direction.name.toUpperCase()} of ${city} ===`);
    
    // Search all categories for this direction
    for (const category of categories) {
      const searchQuery = `${category} in ${direction.location}, ${country}`;
      const googleMapsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`;
      
      console.log(`Fetching places for category "${category}" in ${direction.location}`);
      console.log(`Search URL: ${googleMapsUrl}`);
      
      try {
        const places = await fetchPlacesFromTextSearch(googleMapsUrl);
        console.log(`Found ${places.length} places for category ${category}`);
        
        // Add category information to each place
        const placesWithCategory = places.map(place => ({ ...place, category }));
        allPlaces = allPlaces.concat(placesWithCategory);
        
        // Small delay between API calls to avoid rate limiting
        await sleep(500);
      } catch (error) {
        console.error(`Error searching ${category} in ${direction.location}:`, error);
        // Continue with next category even if one fails
      }
    }
  }

  // Step 10: Aggregate and deduplicate
  currentStep++;
  progressCallback?.(currentStep, totalSteps, 'Aggregating and removing duplicates');
  
  console.log(`\n=== AGGREGATION PHASE ===`);
  console.log(`Total places found across all directions: ${allPlaces.length}`);
  
  // Remove duplicate places based on place_id
  const uniquePlaces = Array.from(new Set(allPlaces.map(p => p.place_id))).map(id => {
    return allPlaces.find(p => p.place_id === id)!;
  });

  console.log(`Total unique places found: ${uniquePlaces.length}`);
  console.log(`Removed ${allPlaces.length - uniquePlaces.length} duplicates`);
  
  return uniquePlaces;
}

// Step 1: Calculate all search points from center coordinates and radius
export function calculateSearchPoints(center: SearchPoint, radius: number): { [key: string]: SearchArea } {
  const earthRadiusKm = 6371;
  const distanceKm = (radius / 2) / 1000;

  // Convert latitude and longitude from degrees to radians
  const latRad = center.lat * (Math.PI / 180);

  // Calculate the north and south coordinates
  const northLat = Number((center.lat + (distanceKm / earthRadiusKm) * (180 / Math.PI)).toFixed(6));
  const southLat = Number((center.lat - (distanceKm / earthRadiusKm) * (180 / Math.PI)).toFixed(6));

  // Calculate the east and west coordinates
  const longitudeChange = (distanceKm / earthRadiusKm) * (180 / Math.PI) / Math.cos(latRad);
  const eastLng = Number((center.lng + longitudeChange).toFixed(6));
  const westLng = Number((center.lng - longitudeChange).toFixed(6));

  return {
    center: { point: center, radius: radius },
    north: { point: { lat: northLat, lng: center.lng }, radius: radius / 2 },
    south: { point: { lat: southLat, lng: center.lng }, radius: radius / 2 },
    east: { point: { lat: center.lat, lng: eastLng }, radius: radius / 2 },
    west: { point: { lat: center.lat, lng: westLng }, radius: radius / 2 },
    northEast: { point: { lat: northLat, lng: eastLng }, radius: radius / 2 },
    southEast: { point: { lat: southLat, lng: eastLng }, radius: radius / 2 },
    northWest: { point: { lat: northLat, lng: westLng }, radius: radius / 2 },
    southWest: { point: { lat: southLat, lng: westLng }, radius: radius / 2 }
  };
}

// Step 2: Fetch places from Google Maps API with pagination
export async function fetchPlacesFromPoint(
  searchArea: SearchArea, 
  categories: string[]
): Promise<GooglePlace[]> {
  let allPlaces: GooglePlace[] = [];

  for (const category of categories) {
    const googleMapsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchArea.point.lat},${searchArea.point.lng}&radius=${searchArea.radius}&keyword=${encodeURIComponent(category)}&key=${GOOGLE_API_KEY}`;
    
    console.log(`Fetching places with URL: ${googleMapsUrl}`);
    
    let places: GooglePlace[] = [];
    let nextPageToken: string | null = null;
    
    do {
      let responseUrl = googleMapsUrl;
      if (nextPageToken) {
        responseUrl += `&pagetoken=${nextPageToken}`;
        // Pause to give time for the token to become valid
        await sleep(2000);
      }

      const response = await fetch(responseUrl);
      const data = await response.json();

      console.log('API Response:', data);
      console.log('+++++++++++++++++++++++++++++++++++++++++');

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Error fetching data from Google Maps: ${data.status}`);
      }

      places = places.concat(data.results);
      nextPageToken = data.next_page_token || null;
    } while (nextPageToken);

    console.log(`Found ${places.length} places for category ${category}`);
    allPlaces = allPlaces.concat(places.map(place => ({ ...place, category })));
  }

  return allPlaces;
}

// Step 3: Remove duplicates and aggregate all places
export function aggregateAndDeduplicatePlaces(allPointsResults: GooglePlace[]): GooglePlace[] {
  // Filter duplicate places based on place_id
  const uniquePlaces = Array.from(new Set(allPointsResults.map(p => p.place_id))).map(id => {
    return allPointsResults.find(p => p.place_id === id)!;
  });

  console.log(`Total unique places found: ${uniquePlaces.length}`);
  return uniquePlaces;
}

// Step 4: Get detailed place information
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}&language=en`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Error fetching place details from Google Maps: ${data.status}`);
  }

  return data.result;
}

// Step 5: Format place data for database insertion
export function formatPlaceForDatabase(details: PlaceDetails, businessType: string, additionalData?: any) {
  const city = details.address_components.find(component => 
    component.types.includes('locality') || 
    component.types.includes('postal_town') || 
    component.types.includes('administrative_area_level_3')
  )?.long_name || '';
  
  const country = details.address_components.find(component => 
    component.types.includes('country')
  )?.long_name || '';

  const currentTime = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/(\d+)\/(\d+)\/(\d+),\s*(\d+):(\d+)/, '$3-$2-$1 $4:$5');

  return {
    // Use place_id as unique identifier - this prevents duplicates
    external_id: details.place_id,
    name: details.name,
    address: details.vicinity || details.formatted_address || '',
    location: `${details.geometry.location.lat}, ${details.geometry.location.lng}`,
    website: details.website || null,
    phone: details.formatted_phone_number || null,
    city: city || null,
    country: country || null,
    business_type: businessType.charAt(0).toUpperCase() + businessType.slice(1),
    email_status: 'unverified',
    created_at: currentTime,
    last_modified: currentTime,
    // Additional fields from search context
    currency: additionalData?.currency || null,
    record_owner: additionalData?.created_by || null,
    source: 'Google Maps API'
  };
}

// Main coordination search function
export async function performCoordinatesSearch(
  center: SearchPoint,
  radius: number,
  categories: string[],
  progressCallback?: (current: number, total: number, message: string) => void
): Promise<GooglePlace[]> {
  // Step 1: Calculate all search points
  const searchPoints = calculateSearchPoints(center, radius);
  progressCallback?.(1, 11, 'Calculated search points');

  // Step 2: Search all points
  const allResults: GooglePlace[] = [];
  const pointNames = Object.keys(searchPoints);
  
  for (let i = 0; i < pointNames.length; i++) {
    const pointName = pointNames[i];
    const searchArea = searchPoints[pointName];
    
    progressCallback?.(i + 2, 11, `Searching ${pointName} point`);
    
    const places = await fetchPlacesFromPoint(searchArea, categories);
    allResults.push(...places);
    
    // Small delay between API calls
    await sleep(500);
  }

  // Step 3: Aggregate and deduplicate
  progressCallback?.(11, 11, 'Aggregating and removing duplicates');
  const uniquePlaces = aggregateAndDeduplicatePlaces(allResults);
  
  return uniquePlaces;
} 