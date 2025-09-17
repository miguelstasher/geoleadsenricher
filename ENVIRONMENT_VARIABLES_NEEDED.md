# Environment Variables Required for Cloud Deployment

## 🔑 **CRITICAL API KEYS NEEDED IN VERCEL:**

### **1. Google Maps API**
```bash
GOOGLE_MAPS_API_KEY=AIzaSyCWLWBJJeNyMsV1ieKMQl53OJuzZLOYP-k
```
- **Used for**: Lead extraction from Google Maps
- **File**: `src/utils/googleMapsScraper.ts`
- **Status**: ✅ Already hardcoded (working)

### **2. Email Enrichment APIs**
```bash
# Hunter.io API Key
HUNTER_API_KEY=your_hunter_io_api_key

# Snov.io API Keys  
SNOV_USER_ID=your_snov_user_id
SNOV_SECRET=your_snov_secret

# AWS Lambda Function URL
AWS_LAMBDA_FUNCTION_URL=https://your-lambda-function-url.amazonaws.com/
```
- **Used for**: Waterfall email enrichment (Hunter → Snov → AWS Lambda)
- **Files**: `src/utils/emailEnrichment.ts`, `src/utils/emailEnrichmentOptimized.ts`
- **Status**: ❌ **MISSING** - Will cause enrichment failures

### **3. Social Media Search API**
```bash
SERP_API_KEY=3e12634045d6b5edd5cf314df831aaadebd1d7c5c4c5e4114ef3b4be35a75de8
```
- **Used for**: LinkedIn and Facebook URL search
- **Files**: `src/app/api/enrich-linkedin/route.ts`, `src/app/api/enrich-facebook/route.ts`
- **Status**: ✅ Already hardcoded (working)

### **4. Campaign Integration API**
```bash
# Instantly.ai API Keys (if using campaign upload to external service)
INSTANTLY_API_KEY=your_instantly_api_key
INSTANTLY_API_URL=https://api.instantly.ai/
```
- **Used for**: Uploading leads to external campaign platforms
- **Files**: `src/app/api/campaigns/upload/route.ts`
- **Status**: ❓ **UNKNOWN** - May be using Lambda function

### **5. Already Configured (Supabase)**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
- **Status**: ✅ **WORKING** - Already configured in Vercel

## 🚨 **IMMEDIATE ACTIONS REQUIRED:**

1. **Add missing API keys to Vercel environment variables**
2. **Test each system individually after adding keys**
3. **Verify waterfall enrichment works end-to-end**
4. **Test LinkedIn/Facebook URL search functionality**
5. **Confirm campaign upload to external platforms works**

## 📋 **VERIFICATION CHECKLIST:**

- [ ] Google Maps extraction working (✅ confirmed)
- [ ] Hunter.io enrichment working (❌ needs API key)
- [ ] Snov.io enrichment working (❌ needs API keys)
- [ ] AWS Lambda enrichment working (❌ needs function URL)
- [ ] LinkedIn URL search working (✅ confirmed - uses hardcoded key)
- [ ] Facebook URL search working (✅ confirmed - uses hardcoded key)
- [ ] Campaign send functionality working (✅ confirmed)
- [ ] Campaign upload to external platform working (❓ needs verification)
