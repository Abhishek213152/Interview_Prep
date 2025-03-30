# Vercel Deployment Guide

## Prerequisites

1. Node.js and npm installed
2. Vercel CLI installed: `npm i -g vercel`
3. A Vercel account

## Deployment Steps

### Step 1: Login to Vercel

```bash
vercel login
```

Follow the instructions to authenticate.

### Step 2: Deploy the Project

Navigate to the Ser3 directory and run:

```bash
vercel
```

During the deployment process, Vercel will ask you some questions:

- Set up and deploy: **Yes**
- Link to existing project: Choose **No** for new deployment
- Project name: Enter your project name or accept the default
- Directory: Enter `.` (current directory)
- Override settings: Choose **No**

### Step 3: Set Environment Variables

After deployment, go to your Vercel dashboard:

1. Select your project
2. Go to "Settings" > "Environment Variables"
3. Add the following environment variables:
   - Key: `GEMINI_API_KEY`, Value: Your Google Gemini API key

### Step 4: Redeploy to Apply Environment Variables

```bash
vercel --prod
```

### Step 5: Update Client-Side Configuration

Update your React client (in the client folder) to point to your new deployment URL:

1. Create a `.env` file in the client project if it doesn't exist
2. Add the following line:
   ```
   VITE_API_URL=https://your-vercel-deployment-url.vercel.app
   ```
3. Rebuild and deploy your client application

## Troubleshooting

If you encounter issues with the deployment:

1. Check the Vercel logs in the dashboard
2. Verify all environment variables are set correctly
3. Ensure your `requirements.txt` includes all dependencies
4. Check that the Python version in `runtime.txt` is supported by Vercel
