const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Create Image Schema
const imageSchema = new mongoose.Schema({
  userId: String,
  fileName: String,
  contentType: String,
  imageData: String, // Base64 encoded image
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Image = mongoose.model("Image", imageSchema);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

app.get("/", (req, res) => {
  res.send("Hello from Vercel!");
});

// API Routes
// Upload profile image - Updated to handle JSON data directly
app.post("/api/upload-profile-image", async (req, res) => {
  try {
    const { userId, imageData, fileName, contentType } = req.body;

    // Validate required fields
    if (!userId || !imageData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(
      `Received upload request for user: ${userId}, filename: ${fileName}`
    );

    // Create new image document
    const newImage = new Image({
      userId,
      fileName: fileName || "unknown",
      contentType: contentType || "image/jpeg",
      imageData, // Store base64 data
    });

    // Save to MongoDB
    await newImage.save();
    console.log(`Image saved to MongoDB with ID: ${newImage._id}`);

    // Return the image ID
    res.status(200).json({
      success: true,
      imageId: newImage._id,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get profile image
app.get("/api/get-profile-image/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!imageId) {
      return res.status(400).json({ error: "Image ID is required" });
    }

    // Find image in MongoDB
    const image = await Image.findById(imageId);

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Return the image data
    res.status(200).json({
      imageData: image.imageData,
      contentType: image.contentType,
      fileName: image.fileName,
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete profile image
app.delete("/api/delete-profile-image/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    const { userId } = req.body;

    if (!imageId) {
      return res.status(400).json({ error: "Image ID is required" });
    }

    // Find and delete image in MongoDB
    const image = await Image.findOneAndDelete({ _id: imageId, userId });

    if (!image) {
      return res
        .status(404)
        .json({ error: "Image not found or not authorized to delete" });
    }

    // Return success
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add a test endpoint
app.get("/api/test", (req, res) => {
  console.log("Test endpoint hit");
  res.status(200).json({ message: "Server is running correctly" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
