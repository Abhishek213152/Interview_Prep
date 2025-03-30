# AI Interview Backend Server

This is the backend server for the AI Interview application, providing API endpoints for conducting AI-powered technical interviews.

## Features

- Automated technical interviews powered by Gemini AI
- Speech-to-text and text-to-speech capabilities
- Resume analysis and processing
- Interview assessment generation

## API Endpoints

- `/start_interview` - Start a new interview session
- `/interview_response` - Submit interview responses
- `/stream_audio` - Stream audio responses
- `/end_interview` - End interview and get assessment
- `/get_session_data` - Get current session data

## Deployment

This server is configured for deployment on Vercel.

### Deployment Steps

1. Create a Vercel account if you don't have one
2. Install Vercel CLI: `npm i -g vercel`
3. Run `vercel login` and authenticate
4. Navigate to the Ser3 directory
5. Run `vercel` to deploy

### Environment Variables

The following environment variables should be set in Vercel:

- `GEMINI_API_KEY` - Your Google Gemini API key

## Local Development

1. Install dependencies: `pip install -r requirements.txt`
2. Set up environment variables in `.env` file
3. Run the server: `python interview.py`
