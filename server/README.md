# Profile Image Server

This is a simple Express server that handles profile image uploads, storage, and retrieval using MongoDB.

## Setup

1. Make sure you have Node.js installed
2. Install dependencies:
   ```
   npm install
   ```

## Running the Server

To start the server in development mode with auto-reload:

```
npm run dev
```

To start the server in production mode:

```
npm start
```

## API Endpoints

- `POST /api/upload-profile-image` - Upload a profile image
- `GET /api/get-profile-image/:imageId` - Get a profile image by ID
- `DELETE /api/delete-profile-image/:imageId` - Delete a profile image
- `GET /api/test` - Test endpoint to verify server is running

## Testing the Server

You can test if the server is running by visiting:

```
https://mongodbinterviewprojectforimage-fee4qdmo8.vercel.app/api/test
```

This should return:

```json
{
  "message": "Server is running correctly"
}
```

## Troubleshooting

If you're having issues with image uploads:

1. Check the MongoDB connection string in server.js
2. Ensure MongoDB Atlas IP whitelist includes your IP
3. Check the server console for detailed error messages
4. Make sure the client is connecting to the correct URL (http://localhost:5000)
