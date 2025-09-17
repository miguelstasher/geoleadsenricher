import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    systems: {} as any
  };

  // Test Google Maps API
  try {
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCWLWBJJeNyMsV1ieKMQl53OJuzZLOYP-k';
    const testUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=51.5074,-0.1278&radius=500&type=restaurant&key=${googleApiKey}`;
    const response = await fetch(testUrl);
    const data = await response.json();
    
    results.systems.googleMaps = {
      status: response.ok && data.results ? 'working' : 'error',
      hasApiKey: !!googleApiKey,
      resultCount: data.results?.length || 0,
      error: data.error_message || null
    };
  } catch (error) {
    results.systems.googleMaps = {
      status: 'error',
      hasApiKey: false,
      error: 'Failed to test Google Maps API'
    };
  }

  // Test Hunter.io API
  try {
    const hunterApiKey = process.env.HUNTER_API_KEY;
    if (hunterApiKey && hunterApiKey !== 'your_hunter_io_api_key') {
      const testUrl = `https://api.hunter.io/v2/domain-search?domain=example.com&api_key=${hunterApiKey}`;
      const response = await fetch(testUrl);
      const data = await response.json();
      
      results.systems.hunterIO = {
        status: response.ok ? 'working' : 'error',
        hasApiKey: true,
        requestsRemaining: data.meta?.requests?.remaining || 'unknown',
        error: data.errors?.[0]?.details || null
      };
    } else {
      results.systems.hunterIO = {
        status: 'missing_api_key',
        hasApiKey: false,
        error: 'HUNTER_API_KEY not configured'
      };
    }
  } catch (error) {
    results.systems.hunterIO = {
      status: 'error',
      hasApiKey: !!process.env.HUNTER_API_KEY,
      error: 'Failed to test Hunter.io API'
    };
  }

  // Test Snov.io API
  try {
    const snovUserId = process.env.SNOV_USER_ID;
    const snovSecret = process.env.SNOV_SECRET;
    
    if (snovUserId && snovSecret && snovUserId !== 'your_snov_user_id') {
      results.systems.snovIO = {
        status: 'configured',
        hasApiKey: true,
        userId: snovUserId.substring(0, 8) + '...',
        error: null
      };
    } else {
      results.systems.snovIO = {
        status: 'missing_api_key',
        hasApiKey: false,
        error: 'SNOV_USER_ID or SNOV_SECRET not configured'
      };
    }
  } catch (error) {
    results.systems.snovIO = {
      status: 'error',
      hasApiKey: false,
      error: 'Failed to check Snov.io configuration'
    };
  }

  // Test AWS Lambda
  try {
    const lambdaUrl = process.env.AWS_LAMBDA_FUNCTION_URL;
    if (lambdaUrl && lambdaUrl !== 'https://your-lambda-function-url.amazonaws.com/') {
      // Just check if URL is configured, don't actually call it
      results.systems.awsLambda = {
        status: 'configured',
        hasUrl: true,
        url: lambdaUrl.substring(0, 30) + '...',
        error: null
      };
    } else {
      results.systems.awsLambda = {
        status: 'missing_url',
        hasUrl: false,
        error: 'AWS_LAMBDA_FUNCTION_URL not configured'
      };
    }
  } catch (error) {
    results.systems.awsLambda = {
      status: 'error',
      hasUrl: false,
      error: 'Failed to check AWS Lambda configuration'
    };
  }

  // Test SerpAPI (for LinkedIn/Facebook)
  try {
    const serpApiKey = '3e12634045d6b5edd5cf314df831aaadebd1d7c5c4c5e4114ef3b4be35a75de8';
    const testUrl = `https://serpapi.com/search.json?api_key=${serpApiKey}&q=test&num=1`;
    const response = await fetch(testUrl);
    const data = await response.json();
    
    results.systems.serpAPI = {
      status: response.ok && !data.error ? 'working' : 'error',
      hasApiKey: true,
      searchesLeft: data.search_metadata?.total_time_taken ? 'available' : 'unknown',
      error: data.error || null
    };
  } catch (error) {
    results.systems.serpAPI = {
      status: 'error',
      hasApiKey: true,
      error: 'Failed to test SerpAPI'
    };
  }

  // Overall system status
  const workingSystems = Object.values(results.systems).filter(
    (system: any) => system.status === 'working' || system.status === 'configured'
  ).length;
  const totalSystems = Object.keys(results.systems).length;

  results.summary = {
    workingSystems,
    totalSystems,
    overallStatus: workingSystems === totalSystems ? 'all_systems_operational' : 
                   workingSystems > 0 ? 'partial_systems_operational' : 'systems_need_configuration',
    readyForProduction: workingSystems >= 3 // Google Maps, SerpAPI, and at least one enrichment API
  };

  return NextResponse.json(results);
}
