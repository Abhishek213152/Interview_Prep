# Vercel Deployment Guide for AI Coding Questions API

This guide walks you through deploying the AI Coding Questions API (Ser2) to Vercel.

## Prerequisites

1. Node.js and npm installed on your development machine
2. Vercel CLI installed: `npm i -g vercel`
3. A Vercel account (create one at [vercel.com](https://vercel.com))
4. Google Gemini API key

## Step 1: Prepare Your Project

Ensure your project directory (Ser2) contains the following files:

- `backend.py` - Main application code
- `requirements.txt` - Python dependencies
- `vercel.json` - Vercel configuration
- `runtime.txt` - Python version specification
- `.env` - Environment variables (local development only)
- `wsgi.py` - WSGI entry point

## Step 2: Login to Vercel

```bash
vercel login
```

Follow the authentication instructions in your browser.

## Step 3: Deploy to Vercel

Navigate to your project directory and run:

```bash
cd Ser2
vercel
```

During the deployment process, Vercel will ask you a series of questions:

- **Set up and deploy?** - Select **Yes**
- **Link to existing project?** - Select **No** for a new deployment
- **Project name** - Enter your preferred name or accept the default
- **In which directory is your code located?** - Enter `.` (current directory)
- **Want to override the settings?** - Select **No**

## Step 4: Configure Environment Variables

After the initial deployment, you need to configure your API key:

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your newly created project
3. Navigate to **Settings** > **Environment Variables**
4. Add a new environment variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Google Gemini API Key
5. Click **Save**

## Step 5: Redeploy with Environment Variables

To apply the environment variables, redeploy your application:

```bash
vercel --prod
```

## Step 6: Test Your Deployment

Test your deployment by visiting your Vercel deployment URL. You should see a JSON response from the root endpoint confirming the API is running.

Example:

```json
{
  "status": "running",
  "service": "AI Coding Questions API",
  "version": "1.0.0"
}
```

## Step 7: Update Client-Side Configuration

Update your React client (in the client folder) to point to your new Vercel URL:

1. Find your deployment URL in the Vercel dashboard or from the CLI output
2. In your client's `.env` file, update the API endpoint:
   ```
   VITE_CODING_API_URL=https://your-vercel-deployment-url.vercel.app
   ```

## Troubleshooting

If you encounter issues with your deployment:

1. **Check Vercel Logs:**

   - Go to your project in the Vercel dashboard
   - Click on the latest deployment
   - Select the "Functions" tab
   - Click on the function to view logs

2. **Function Execution Timeout:**

   - If functions time out, consider optimizing your code or implementing caching
   - Vercel Hobby tier has a 10-second execution limit for serverless functions

3. **File System Access:**

   - Vercel's serverless environment has a read-only filesystem except for the `/tmp` directory
   - Modify your code to use in-memory storage or external databases instead of local file storage

4. **Environment Variables Not Working:**
   - Verify they are set correctly in the Vercel dashboard
   - Ensure you're using `os.environ.get()` to access them
   - Redeploy with `vercel --prod` after changing environment variables
