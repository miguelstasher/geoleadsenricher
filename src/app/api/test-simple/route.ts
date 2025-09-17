import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'working',
    timestamp: new Date().toISOString(),
    message: 'API is responding correctly'
  });
}

export async function POST() {
  return NextResponse.json({
    status: 'working',
    timestamp: new Date().toISOString(),
    message: 'API POST is responding correctly'
  });
}
// Deployment trigger Wed Sep 17 20:32:56 BST 2025
