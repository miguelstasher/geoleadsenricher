# Sales Tool Deployment Guide

## Environment Variables Required for Vercel

When deploying to Vercel, you need to set these environment variables in your Vercel project settings:

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL` = https://zrgmktqkvnywsatxyfdt.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZ21rdHFrdm55d3NhdHh5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzcwNjYsImV4cCI6MjA2NTY1MzA2Nn0.4fcMzip7BrHqWSjp9r52kHIyKmlCPEID4Qwe0rtMamo

### Email Enrichment APIs
- `INSTANTLY_API_KEY` = Tb5OWIKAEMen7IrvsJxOBPnEgWnLG
- `HUNTER_API_KEY` = d5872c0d46ca867af0f53d823247c3be37b5446a
- `SNOV_API_USER_ID` = 9d6ecb9c93134a23a9fd4a052072783c
- `SNOV_API_SECRET` = 45aeaed702300aca97ff732a14e53132

### AWS Lambda Configuration
- `AWS_LAMBDA_EMAIL_SCRAPER_URL` = https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper
- `AWS_LAMBDA_AUTH_TOKEN` = b24be261-f07b-4adf-a33c-cf87084b889b

## Deployment Steps

1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Add environment variables in Vercel
4. Deploy and test

## Important Notes

- All environment variables must be set in Vercel for the app to work
- The Supabase database is already configured and working
- The cold_calling_leads table should be created in Supabase before deployment
