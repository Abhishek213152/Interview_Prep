import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth, db, storage } from "../firebase";
import {
  FaUserCircle,
  FaLaptopCode,
  FaSignOutAlt,
  FaHome,
  FaUserEdit,
  FaSave,
  FaTimes,
  FaCamera,
  FaTrash,
  FaUserTie,
} from "react-icons/fa";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    bio: "",
    profileImage: "",
  });
  const [stats, setStats] = useState({
    completedAssessments: 0,
    interviewsCompleted: 0,
    resumeAnalysisCount: 0,
    totalQuestionsAttempted: 0,
    codingScore: 0,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();

            // Check if profile image is a Firestore ID
            let profileImageUrl = data.profileImage || "";
            if (profileImageUrl) {
              // Fetch the actual image data from MongoDB
              const imageData = await fetchProfileImage(profileImageUrl);
              if (imageData) {
                // Use the base64 data directly
                profileImageUrl = imageData;
              }
            }

            setUser({
              uid: currentUser.uid,
              ...data,
              // Store the actual image data/URL for display
              displayImage: profileImageUrl,
            });

            setUserData({
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email || currentUser.email,
              bio: data.bio || "",
              profileImage: data.profileImage || "",
            });

            // Set image preview if user has a profile image
            if (profileImageUrl) {
              setImagePreview(profileImageUrl);
            }

            // Get activity stats from Firestore
            setStats({
              codingScore: data.codingScore || 0,
              assessmentsCompleted: data.assessmentsCompleted || 0,
              interviewsCompleted: data.interviewsCompleted || 0,
              resumeAnalysisCount: data.resumeAnalysisCount || 0,
              totalQuestionsAttempted: data.totalQuestionsAttempted || 0,
            });
          } else {
            // Create a new user document if it doesn't exist
            const newUserData = {
              uid: currentUser.uid,
              firstName: "Guest",
              lastName: "",
              email: currentUser.email,
              bio: "",
              profileImage: "",
              // Initialize activity stats
              codingScore: 0,
              assessmentsCompleted: 0,
              interviewsCompleted: 0,
              resumeAnalysisCount: 0,
              totalQuestionsAttempted: 0,
              createdAt: new Date(),
            };

            // Save the new user data to Firestore
            await setDoc(doc(db, "Users", currentUser.uid), newUserData);

            setUser(newUserData);
            setUserData({
              firstName: "Guest",
              lastName: "",
              email: currentUser.email,
              bio: "",
              profileImage: "",
            });
            setStats({
              codingScore: 0,
              assessmentsCompleted: 0,
              interviewsCompleted: 0,
              resumeAnalysisCount: 0,
              totalQuestionsAttempted: 0,
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData({
      ...userData,
      [name]: value,
    });
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];

      // Check file type
      if (!file.type.match("image.*")) {
        alert("Please select an image file");
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      setImageFile(file);

      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile || !user?.uid) return null;

    setUploadingImage(true);
    try {
      // Read the file as a base64 string
      const base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imageFile);
      });

      // Instead of FormData, use JSON for the request
      const imageData = {
        userId: user.uid,
        fileName: imageFile.name,
        contentType: imageFile.type,
        imageData: base64Image,
      };

      // Send the image to your server API
      const response = await fetch(
        "https://mongodbinterviewprojectforimage-fee4qdmo8.vercel.app/api/upload-profile-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(imageData),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Image upload successful:", result);

      // Return the MongoDB image ID from the server response
      return result.imageId;
    } catch (error) {
      console.error("Error storing image:", error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteExistingImage = async () => {
    if (!user?.uid || !user?.profileImage) return;

    try {
      // Delete the image from MongoDB via API
      const response = await fetch(
        `https://mongodbinterviewprojectforimage-fee4qdmo8.vercel.app/api/delete-profile-image/${user.profileImage}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user.uid }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      console.log("Previous profile image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const saveChanges = async () => {
    if (!user?.uid) return;

    try {
      console.log("Starting profile update...");
      // Upload new image if selected
      let profileImageId = userData.profileImage;
      let uploadError = null;

      if (imageFile) {
        console.log(
          `Attempting to upload image: ${imageFile.name} (${imageFile.size} bytes)`
        );
        try {
          const newImageId = await uploadImage();
          if (newImageId) {
            console.log(`Image upload successful! New ID: ${newImageId}`);
            // If we uploaded a new image and had an old one, try to delete the old one
            if (user.profileImage && user.profileImage !== profileImageId) {
              console.log(`Deleting previous image: ${user.profileImage}`);
              await deleteExistingImage();
            }
            profileImageId = newImageId;
          } else {
            // If upload returns null but no error was thrown
            uploadError = "Failed to store image data - no ID returned";
            console.error("Image upload failed: No ID returned from server");
          }
        } catch (err) {
          // Specific error for image upload
          uploadError = err.message || "Error uploading image";
          console.error("Image upload error details:", err);
        }
      }

      // If there was an upload error but we're not changing the profile image
      if (uploadError && imageFile) {
        console.warn(`Upload error occurred: ${uploadError}`);
        alert(
          `Image upload failed: ${uploadError}. Your profile info will be updated without the new image.`
        );
        // Continue with the update without changing the image
        profileImageId = user.profileImage;
      }

      console.log(
        `Updating user document with profile image ID: ${profileImageId}`
      );
      // Update user document in Firestore
      await updateDoc(doc(db, "Users", user.uid), {
        firstName: userData.firstName,
        lastName: userData.lastName,
        bio: userData.bio,
        profileImage: profileImageId,
      });

      console.log("Firestore update successful");
      // Update local state
      setUser({
        ...user,
        firstName: userData.firstName,
        lastName: userData.lastName,
        bio: userData.bio,
        profileImage: profileImageId,
      });

      setUserData({
        ...userData,
        profileImage: profileImageId,
      });

      // Reset edit state
      setEditMode(false);
      setImageFile(null);

      // Show success message
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(`Failed to update profile: ${error.message || "Unknown error"}`);
    }
  };

  const cancelEdit = () => {
    setUserData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      bio: user?.bio || "",
      profileImage: user?.profileImage || "",
    });
    setImagePreview(user?.profileImage || null);
    setImageFile(null);
    setEditMode(false);
  };

  const removeProfileImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setUserData({
      ...userData,
      profileImage: "",
    });
  };

  // Update this function to fetch image data from MongoDB
  const fetchProfileImage = async (imageId) => {
    if (!imageId) return null;

    try {
      // Get the image data from your MongoDB server API
      const response = await fetch(
        `https://mongodbinterviewprojectforimage-fee4qdmo8.vercel.app/api/get-profile-image/${imageId}`
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();

      // Return the base64 image data
      return data.imageData;
    } catch (error) {
      console.error("Error fetching image from MongoDB:", error);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-black to-blue-900 text-white">
      {/* Header */}
      <header className="flex justify-between items-center p-3 sm:p-4 md:p-6 bg-gray-900 shadow-lg">
        <div className="flex items-center">
          <div className="mr-2 sm:mr-3 bg-blue-600 p-1 sm:p-2 rounded-lg">
            <FaLaptopCode className="text-white text-lg sm:text-2xl" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">Profile</h1>
        </div>
        <div className="flex space-x-2 sm:space-x-4">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center px-2 sm:px-3 py-1 sm:py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm sm:text-base"
          >
            <FaHome className="mr-1 sm:mr-2" /> Home
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center px-2 sm:px-3 py-1 sm:py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm sm:text-base"
          >
            <FaSignOutAlt className="mr-1 sm:mr-2" /> Logout
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        </div>
      ) : (
        <div className="container mx-auto py-6 px-4 max-w-5xl">
          <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Profile Header */}
            <div className="p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Profile Image */}
              <div className="relative group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaUserCircle className="text-gray-500 w-full h-full" />
                  )}
                </div>
                {editMode && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full"></div>
                    <div className="flex flex-col items-center z-10 space-y-1">
                      <button
                        onClick={() => fileInputRef.current.click()}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-full"
                      >
                        <FaCamera className="text-lg" />
                      </button>
                      {imagePreview && (
                        <button
                          onClick={removeProfileImage}
                          className="bg-red-600 hover:bg-red-700 text-white p-1 rounded-full"
                        >
                          <FaTrash className="text-lg" />
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                {!editMode ? (
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-1">
                      {userData.firstName} {userData.lastName}
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-base mb-2">
                      {userData.email}
                    </p>
                    <p className="text-gray-300 text-sm sm:text-base mb-4 max-w-lg">
                      {userData.bio ||
                        "No bio available. Click edit to add one."}
                    </p>
                    <button
                      onClick={() => setEditMode(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 sm:py-2 sm:px-4 rounded-lg flex items-center text-sm sm:text-base"
                    >
                      <FaUserEdit className="mr-2" /> Edit Profile
                    </button>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={userData.firstName}
                          onChange={handleChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm font-medium mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={userData.lastName}
                          onChange={handleChange}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm font-medium mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={userData.email}
                        onChange={handleChange}
                        disabled
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm font-medium mb-1">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={userData.bio}
                        onChange={handleChange}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[80px]"
                        placeholder="Tell us about yourself..."
                      ></textarea>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={saveChanges}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              ></path>
                            </svg>
                            Saving...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <FaSave className="mr-2" /> Save Changes
                          </span>
                        )}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
                      >
                        <FaTimes className="mr-2" /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Section */}
            <div className="p-6 bg-gray-900 border-t border-gray-700">
              <h3 className="text-xl font-bold mb-4">Activity Stats</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  title="Coding Score"
                  value={stats.codingScore}
                  unit="/100"
                  color="blue"
                />
                <StatCard
                  title="Interviews Completed"
                  value={stats.interviewsCompleted}
                  color="purple"
                />
                <StatCard
                  title="Resume Analyses"
                  value={stats.resumeAnalysisCount}
                  color="green"
                />
                <StatCard
                  title="Questions Attempted"
                  value={stats.totalQuestionsAttempted}
                  color="yellow"
                />
                <StatCard
                  title="Account Created"
                  value={
                    user?.createdAt
                      ? new Date(user.createdAt.toDate()).toLocaleDateString()
                      : "N/A"
                  }
                  color="pink"
                  isDate
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 bg-gray-800">
              <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate("/interview")}
                  className="w-full py-3 px-4 bg-purple-700 hover:bg-purple-600 rounded-lg flex items-center justify-center"
                >
                  <FaUserTie className="mr-2" /> Start Interview
                </button>
                <button
                  onClick={() => navigate("/difficulty")}
                  className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-600 rounded-lg flex items-center justify-center"
                >
                  <FaLaptopCode className="mr-2" /> Practice Coding
                </button>
                <button
                  onClick={() => navigate("/upload")}
                  className="w-full py-3 px-4 bg-green-700 hover:bg-green-600 rounded-lg flex items-center justify-center"
                >
                  <FaUserEdit className="mr-2" /> Analyze Resume
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, unit = "", color, isDate = false }) => {
  const getColor = (color) => {
    const colors = {
      blue: "bg-blue-900/50 border-blue-500 text-blue-300",
      purple: "bg-purple-900/50 border-purple-500 text-purple-300",
      green: "bg-green-900/50 border-green-500 text-green-300",
      yellow: "bg-yellow-900/50 border-yellow-500 text-yellow-300",
      pink: "bg-pink-900/50 border-pink-500 text-pink-300",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div
      className={`p-4 rounded-lg border ${getColor(
        color
      )} flex flex-col items-center`}
    >
      <h4 className="text-sm font-medium mb-1">{title}</h4>
      <div className="text-xl sm:text-2xl font-bold">
        {isDate ? value : value + unit}
      </div>
    </div>
  );
};

export default Profile;
