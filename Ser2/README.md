# AI Coding Questions API

Backend API for generating and evaluating coding problems using Gemini AI.

## Features

- Generates unique DSA (Data Structures & Algorithms) questions
- Supports multiple difficulty levels: Easy, Medium, Hard
- Caches generated questions to prevent duplicates
- Provides sample test cases and function signatures
- Supports multiple programming languages (Java, C++, Python)

## API Endpoints

- `GET /` - Health check endpoint
- `GET /get_question` - Get a random coding question
- `POST /run_test_case` - Run and validate test cases
- `POST /submit_solution` - Submit and evaluate a complete solution

## Deployment on Vercel

### Prerequisites

1. Node.js and npm installed
2. Vercel CLI installed: `npm i -g vercel`
3. A Vercel account

### Deployment Steps

1. **Login to Vercel:**

   ```bash
   vercel login
   ```

2. **Deploy:**

   ```bash
   cd Ser2
   vercel
   ```

3. **Set Environment Variables:**

   After deployment, go to the Vercel dashboard:

   - Select your project
   - Go to "Settings" > "Environment Variables"
   - Add:
     - Key: `GEMINI_API_KEY`, Value: Your Google Gemini API key

4. **Redeploy to Apply Environment Variables:**
   ```bash
   vercel --prod
   ```

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file with your API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Run the app:
   ```bash
   python backend.py
   ```
