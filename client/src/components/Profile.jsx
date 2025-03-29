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
        "http://localhost:5000/api/upload-profile-image",
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
        `http://localhost:5000/api/delete-profile-image/${user.profileImage}`,
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
        `http://localhost:5000/api/get-profile-image/${imageId}`
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

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mb-4"></div>
          <p className="text-xl">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen">
      {/* Header */}
      <header className="flex justify-between items-center p-6 bg-gray-900 shadow-lg">
        <div className="flex items-center">
          <div className="mr-3 bg-blue-600 p-2 rounded-lg">
            <FaLaptopCode className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold">User Profile</h1>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/home")}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FaHome />
            <span className="hidden sm:inline">Home</span>
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FaSignOutAlt />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-blue-800 to-purple-800 p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="relative w-32 h-32 group">
                {editMode ? (
                  <div className="relative w-32 h-32 overflow-hidden rounded-full border-4 border-gray-600">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center">
                        <FaUserCircle className="text-gray-400 text-6xl" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />

                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => fileInputRef.current.click()}
                          className="p-2 bg-blue-600 rounded-full"
                        >
                          <FaCamera className="text-white" />
                        </button>

                        {imagePreview && (
                          <button
                            onClick={removeProfileImage}
                            className="p-2 bg-red-600 rounded-full"
                          >
                            <FaTrash className="text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-600">
                    {user?.displayImage ? (
                      <img
                        src={user.displayImage}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center">
                        <FaUserCircle className="text-gray-400 text-6xl" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-blue-300">{user?.email}</p>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 mx-auto md:mx-0"
                  >
                    <FaUserEdit />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-6">
              {editMode ? (
                <div className="bg-gray-700 p-6 rounded-lg mb-8">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">
                    Edit Profile
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-300 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={userData.firstName}
                        onChange={handleChange}
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={userData.lastName}
                        onChange={handleChange}
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={userData.email}
                      disabled
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-gray-400 text-sm mt-1">
                      Email cannot be changed
                    </p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2">Bio</label>
                    <textarea
                      name="bio"
                      value={userData.bio}
                      onChange={handleChange}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white h-24"
                      placeholder="Tell us about yourself..."
                    ></textarea>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2"
                    >
                      <FaTimes />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={saveChanges}
                      disabled={uploadingImage}
                      className={`${
                        uploadingImage
                          ? "bg-gray-500"
                          : "bg-green-600 hover:bg-green-700"
                      } text-white px-4 py-2 rounded flex items-center gap-2`}
                    >
                      {uploadingImage ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <FaSave />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {user?.bio && (
                    <div className="bg-gray-700 p-6 rounded-lg mb-8">
                      <h3 className="text-xl font-bold text-blue-400 mb-4">
                        About Me
                      </h3>
                      <p className="text-gray-300 whitespace-pre-line">
                        {user.bio}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="bg-gray-700 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-blue-400 mb-6">
                  Activity Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-green-900 to-green-800 p-4 rounded-lg text-center">
                    <p className="text-gray-300 mb-2">Coding Assessments</p>
                    <div className="text-3xl font-bold">
                      {stats.assessmentsCompleted || 0}
                    </div>
                    <p className="text-gray-400 text-sm">Completed</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-4 rounded-lg text-center">
                    <p className="text-gray-300 mb-2">Coding Assessments</p>
                    <div className="text-3xl font-bold">
                      {stats.codingScore || 0}
                    </div>
                    <p className="text-gray-400 text-sm">Score</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-4 rounded-lg text-center">
                    <p className="text-gray-300 mb-2">AI Interviews</p>
                    <div className="text-3xl font-bold">
                      {stats.interviewsCompleted}
                    </div>
                    <p className="text-gray-400 text-sm">Completed</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-4 rounded-lg text-center">
                    <p className="text-gray-300 mb-2">Resume Analysis</p>
                    <div className="text-3xl font-bold">
                      {stats.resumeAnalysisCount}
                    </div>
                    <p className="text-gray-400 text-sm">Analyses</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-blue-300 mb-4">
                    Quick Actions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => navigate("/difficulty")}
                      className="p-4 rounded-lg bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600 flex items-center gap-3"
                    >
                      <div className="p-3 rounded-full bg-blue-900">
                        <FaLaptopCode className="text-blue-300" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-green-400">
                          Start Coding Assessment
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Practice coding challenges
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/upload")}
                      className="p-4 rounded-lg bg-gradient-to-r from-purple-800 to-purple-700 hover:from-purple-700 hover:to-purple-600 flex items-center gap-3"
                    >
                      <div className="p-3 rounded-full bg-purple-900">
                        <FaUserTie className="text-purple-300" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-green-400">
                          Analyze Your Resume
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Get AI feedback on your resume
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
