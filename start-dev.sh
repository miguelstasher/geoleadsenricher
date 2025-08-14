#!/bin/bash

echo "🚀 Starting GeoLeads Enricher on localhost:3000"

# Kill any processes running on port 3000
echo "📡 Checking for existing processes on port 3000..."
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "⚠️  Port 3000 is in use. Terminating existing processes..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 2
fi

# Kill any existing Next.js dev processes
echo "🔄 Stopping any existing Next.js processes..."
pkill -f "next dev" 2>/dev/null || true
sleep 1

# Clear Next.js cache
echo "🧹 Clearing Next.js cache..."
rm -rf .next 2>/dev/null || true

# Start the development server
echo "✨ Starting development server on port 3000..."
npm run dev 