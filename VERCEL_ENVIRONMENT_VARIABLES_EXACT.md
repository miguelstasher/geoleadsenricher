# 🔧 EXACT VERCEL ENVIRONMENT VARIABLES TO ADD

## **Copy and paste these EXACT variable names and values into Vercel:**

### **Email Enrichment APIs:**
```
HUNTER_API_KEY=d5872c0d46ca867af0f53d823247c3be37b5446a

SNOV_API_USER_ID=9d6ecb9c93134a23a9fd4a052072783c
SNOV_API_SECRET=45aeaed702300aca97ff732a14e53132

AWS_LAMBDA_EMAIL_SCRAPER_URL=https://7sd6o8pk79.execute-api.eu-north-1.amazonaws.com/Working/EmailBusinessScraper
AWS_LAMBDA_AUTH_TOKEN=b24be261-f07b-4adf-a33c-cf87084b889b
```

### **Campaign Management:**
```
INSTANTLY_API_KEY=Tb5OWIKAEMen7IrvsJxOBPnEgWnLG
```

---

## 🚀 **DEPLOYMENT STEPS:**

### **1. Add Environment Variables to Vercel:**
1. Go to: https://vercel.com/dashboard
2. Select: **geoleadsenricher** project
3. Click: **Settings** → **Environment Variables**
4. For each variable above:
   - Click **"Add New"**
   - **Name**: Copy the exact name (e.g., `HUNTER_API_KEY`)
   - **Value**: Copy the exact value (e.g., `d5872c0d46ca867af0f53d823247c3be37b5446a`)
   - **Environments**: Select **Production**, **Preview**, **Development**
   - Click **Save**

### **2. Redeploy:**
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait 2-3 minutes for deployment to complete

### **3. Test Systems:**
1. Visit: `https://geoleadsenricher.vercel.app/api/test-system`
2. Should show all systems as "working" or "configured"

---

## 🎯 **EXPECTED RESULT:**
**100% of localhost functionality will work in cloud:**

✅ **Google Maps Extraction** (9-point strategy, background jobs)
✅ **Email Enrichment Waterfall** (Hunter.io → Snov.io → AWS Lambda)
✅ **LinkedIn/Facebook URL Search** (SerpAPI integration)
✅ **Campaign Upload to Instantly.ai** (AWS Lambda integration)
✅ **User Authentication & Multi-user System**
✅ **Cold Calling Leads Management**
✅ **Real-time Progress Tracking**
✅ **Advanced Filtering & Custom Filters**

**The sophisticated system you built locally will work identically in the cloud!** 🚀
