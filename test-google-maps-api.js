#!/usr/bin/env node

/**
 * Test Google Maps API and 9-point logic
 * This script tests if the Google Maps API is working in Vercel
 */

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCWLWBJJeNyMsV1ieKMQl53OJuzZLOYP-k';

console.log('🧪 Testing Google Maps API...');
console.log('🔑 API Key available:', !!GOOGLE_API_KEY);
console.log('🔑 API Key (first 10 chars):', GOOGLE_API_KEY ? GOOGLE_API_KEY.substring(0, 10) + '...' : 'MISSING');

// Test coordinates (London)
const testLat = 51.5074;
const testLng = -0.1278;
const testRadius = 1000; // 1km

console.log(`📍 Test coordinates: ${testLat}, ${testLng}`);
console.log(`📏 Test radius: ${testRadius}m`);

// Generate 9-point search strategy (same as the script)
function generateSearchPoints(center, radius) {
  const latOffset = radius / 111000; // roughly 111km per degree latitude
  const lngOffset = radius / (111000 * Math.cos(center.lat * Math.PI / 180)); // adjust for longitude
  
  return [
    { lat: center.lat, lng: center.lng, radius }, // center
    { lat: center.lat + latOffset, lng: center.lng, radius }, // north
    { lat: center.lat - latOffset, lng: center.lng, radius }, // south
    { lat: center.lat, lng: center.lng + lngOffset, radius }, // east
    { lat: center.lat, lng: center.lng - lngOffset, radius }, // west
    { lat: center.lat + latOffset/2, lng: center.lng + lngOffset/2, radius }, // northeast
    { lat: center.lat + latOffset/2, lng: center.lng - lngOffset/2, radius }, // northwest
    { lat: center.lat - latOffset/2, lng: center.lng + lngOffset/2, radius }, // southeast
    { lat: center.lat - latOffset/2, lng: center.lng - lngOffset/2, radius }, // southwest
  ];
}

const center = { lat: testLat, lng: testLng };
const searchPoints = generateSearchPoints(center, testRadius);

console.log(`🎯 Generated ${searchPoints.length} search points:`);
searchPoints.forEach((point, index) => {
  console.log(`  ${index + 1}. ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)} (radius: ${point.radius}m)`);
});

// Test Google Maps API call
async function testGoogleMapsAPI() {
  try {
    const testPoint = searchPoints[0]; // Use center point
    const testType = 'restaurant'; // Test with restaurants
    
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${testPoint.lat},${testPoint.lng}&radius=${testPoint.radius}&type=${testType}&key=${GOOGLE_API_KEY}`;
    
    console.log(`🔍 Testing API call: ${url.substring(0, 100)}...`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log(`✅ Google Maps API working! Found ${data.results.length} results`);
      console.log(`📊 API Status: ${data.status}`);
      if (data.results.length > 0) {
        console.log(`🏪 First result: ${data.results[0].name}`);
        console.log(`📍 Location: ${data.results[0].vicinity}`);
      }
    } else {
      console.log(`❌ Google Maps API error: ${data.status}`);
      console.log(`📊 Error details:`, data);
    }
  } catch (error) {
    console.log(`❌ Network error:`, error.message);
  }
}

// Run the test
testGoogleMapsAPI();
