# Coding Challenge Backend

This is a serverless backend for the Coding Challenge application. It provides endpoints for fetching coding questions, running test cases, and submitting solutions.

## Deployment to Vercel

1. Install the Vercel CLI:

   ```
   npm install -g vercel
   ```

2. Login to Vercel:

   ```
   vercel login
   ```

3. Deploy to Vercel:

   ```
   vercel
   ```

4. For production deployment:
   ```
   vercel --prod
   ```

## Project Structure

- `api/index.py` - Main Flask application with serverless handler
- `vercel.json` - Vercel configuration file
- `requirements.txt` - Python dependencies

## API Endpoints

- `GET /api/get_question` - Returns a random coding question
- `POST /api/run_test_case` - Runs a test case with provided code
- `POST /api/submit_solution` - Submits a solution for evaluation
- `GET /api/status` - Returns the server status

## Note

This is a simplified version of the backend that doesn't execute code on the server. In a real production environment, you would need a sandboxed environment to safely execute user-submitted code.

## Integration with Frontend

Update the API_URL in the frontend code to point to your Vercel deployment URL.
