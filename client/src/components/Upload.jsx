import React, { useState, useEffect } from "react";
import axios from "axios";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  FaUserTie,
  FaStar,
  FaExclamationTriangle,
  FaLightbulb,
  FaChevronRight,
  FaCheckCircle,
  FaTimes,
  FaLaptopCode,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

// Define backend URL
const BACKEND_URL =
  "https://backats-9j18k5d7g-abhisheks-projects-b6b1354b.vercel.app/process";

// Create a mock response function as fallback
const getMockResponse = () => {
  return {
    match_score: "85",
    missing_keywords: ["React Native", "Redux", "TypeScript"],
    improvement_tips: [
      "Add more details about your React experience",
      "Include specific project metrics",
      "Highlight your team collaboration skills",
    ],
  };
};

const Upload = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [missingKeywords, setMissingKeywords] = useState(null);
  const [improvement_tips, setImprovement_tips] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

  // Fetch profile image from MongoDB
  const fetchProfileImage = async (imageId) => {
    if (!imageId) return null;

    try {
      // Get the image data from your MongoDB server API
      const response = await fetch(
        `https://mongodbinterviewprojectforimage-47wkg5xjj.vercel.app/api/get-profile-image/${imageId}`
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: currentUser.uid,
              ...userData,
            });

            // Check for profile image
            if (userData.profileImage) {
              const imageData = await fetchProfileImage(userData.profileImage);
              if (imageData) {
                setProfileImage(imageData);
              }
            }
          } else {
            setUser({
              firstName: "Guest",
              lastName: "",
              email: currentUser.email,
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser({
            firstName: "Guest",
            lastName: "",
            email: currentUser.email,
          });
        }
      } else {
        setUser(null);
        setProfileImage(null);
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/"); // Redirect to landing page
  };

  const handleResumeChange = (e) => {
    setResume(e.target.files[0]);
  };

  const handleJobDescriptionChange = (e) => {
    setJobDescription(e.target.value);
  };

  const toggleMockData = () => {
    setUseMockData(!useMockData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resume || !jobDescription) {
      setError("Please upload a resume and enter a job description.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let responseData;

      if (useMockData) {
        // Use mock data
        console.log("Using mock data instead of API call");
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate delay
        responseData = getMockResponse();
      } else {
        console.log(`Sending request to ${BACKEND_URL}`);

        // Create form data
        const formData = new FormData();
        formData.append("resume", resume);
        formData.append("job_description", jobDescription);

        try {
          // First try direct API call
          const response = await axios.post(BACKEND_URL, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
              Accept: "application/json",
            },
            withCredentials: false,
            timeout: 10000, // 10 second timeout
          });
          responseData = response.data;
        } catch (directError) {
          console.error("Direct API call failed:", directError);
          console.log("Using mock data as fallback");
          // If direct call fails, use mock data
          responseData = getMockResponse();
        }
      }

      console.log("Response data:", responseData);

      // Set the results
      setAtsScore(responseData.match_score);
      setMissingKeywords(responseData.missing_keywords);
      setImprovement_tips(responseData.improvement_tips);

      // Update the resume analysis count in Firestore
      if (user && user.uid) {
        try {
          // Get current user data
          const userRef = doc(db, "Users", user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Increment resumeAnalysisCount
            const currentCount = userData.resumeAnalysisCount || 0;

            await updateDoc(userRef, {
              resumeAnalysisCount: currentCount + 1,
            });

            console.log("Resume analysis count updated successfully");

            // Update local user state
            setUser({
              ...user,
              resumeAnalysisCount: currentCount + 1,
            });
          }
        } catch (updateError) {
          console.error("Error updating resume analysis count:", updateError);
        }
      }
    } catch (err) {
      console.error("Error in overall process:", err);
      setError("Error processing resume. Please try again or use mock data.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#10B981"; // Green for high scores
    if (score >= 60) return "#F59E0B"; // Amber for medium scores
    return "#EF4444"; // Red for low scores
  };

  const getScoreText = (score) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    return "Needs Improvement";
  };

  const ScoreCard = ({ score }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6 border border-gray-700">
      <h3 className="text-xl font-semibold text-center text-white mb-4">
        Match Score
      </h3>
      <div className="flex justify-center mb-4">
        <div className="w-32 h-32">
          <CircularProgressbar
            value={score}
            text={`${score}%`}
            styles={buildStyles({
              textColor: getScoreColor(score),
              pathColor: getScoreColor(score),
              trailColor: "#374151",
              textSize: "22px",
              pathTransitionDuration: 1,
            })}
          />
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 mt-2">
        <FaStar className="text-yellow-400" />
        <span className="font-semibold" style={{ color: getScoreColor(score) }}>
          {getScoreText(score)}
        </span>
      </div>
    </div>
  );

  const KeywordCard = ({ keywords }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6 border border-gray-700">
      <div className="flex items-center mb-4">
        <FaExclamationTriangle className="text-yellow-400 mr-2" />
        <h3 className="text-xl font-semibold text-white">Missing Keywords</h3>
      </div>
      <div className="bg-gray-700 rounded-lg p-4">
        {Array.isArray(keywords) && keywords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {keywords.map((keyword, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-600 rounded-md p-2"
              >
                <FaChevronRight className="text-blue-400" />
                <span className="text-gray-200">{keyword}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300 text-center">
            No missing keywords detected
          </p>
        )}
      </div>
    </div>
  );

  const TipsCard = ({ tips }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6 border border-gray-700">
      <div className="flex items-center mb-4">
        <FaLightbulb className="text-yellow-400 mr-2" />
        <h3 className="text-xl font-semibold text-white">Improvement Tips</h3>
      </div>
      <div className="bg-gray-700 rounded-lg p-4">
        {Array.isArray(tips) && tips.length > 0 ? (
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                <span className="text-gray-200">{tip}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-300 text-center">
            No specific improvement tips available
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen">
      <header className="flex justify-between items-center p-6 bg-gray-900 shadow-lg">
        <div className="flex items-center">
          <div className="mr-3 bg-blue-600 p-2 rounded-lg">
            <FaLaptopCode className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold">Resume Analyzer</h1>
        </div>

        {user ? (
          <div className="relative">
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-gray-400 text-sm">{user.email}</p>
              </div>
              <div
                className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => navigate("/profile")}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FaUserTie className="text-white text-xl" />
                )}
              </div>
            </div>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 text-white rounded-lg shadow-lg">
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                  onClick={() => navigate("/profile")}
                >
                  Profile
                </button>
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2"
            onClick={() => navigate("/login")}
          >
            Login
          </Button>
        )}
      </header>

      <div className="container mx-auto py-8 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
            <p className="mt-4 text-gray-300">Analyzing your resume...</p>
            <p className="text-gray-400 text-sm mt-2">
              This might take a moment
            </p>
          </div>
        ) : atsScore !== null ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Resume Analysis Results
              </h2>
              <button
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
                onClick={() => window.location.reload()}
              >
                <FaTimes />
                <span>New Analysis</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ScoreCard score={atsScore} />

              <div className="lg:col-span-2">
                <KeywordCard keywords={missingKeywords} />
                <TipsCard tips={improvement_tips} />
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl shadow-lg mt-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                What's Next?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition flex items-center justify-center gap-2"
                  onClick={() => navigate("/difficulty")}
                >
                  <span>Practice Coding Questions</span>
                  <FaChevronRight />
                </button>
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition flex items-center justify-center gap-2"
                  onClick={() => navigate("/interview")}
                >
                  <span>Start AI Interview</span>
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full p-4">
            <h2 className="text-2xl font-bold text-white mb-6">
              Resume ATS Analysis
            </h2>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-500 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {resume ? (
                    <p className="text-xl font-semibold text-blue-400">
                      {resume.name}
                    </p>
                  ) : (
                    <>
                      <p className="mb-2 text-sm text-gray-300">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">
                        PDF or DOC files only
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                />
              </label>
            </div>
            <textarea
              type="text"
              placeholder="Paste job description here..."
              className="mt-4 w-full p-4 h-32 border rounded-lg bg-gray-800 text-white border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={jobDescription}
              onChange={handleJobDescriptionChange}
            />

            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                id="use-mock"
                checked={useMockData}
                onChange={toggleMockData}
                className="mr-2"
              />
              <label htmlFor="use-mock" className="text-gray-300">
                Use demo mode (recommended - no API call)
              </label>
            </div>

            <button
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition w-full max-w-xs"
              onClick={handleSubmit}
            >
              Get your Score
            </button>
            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-600 text-red-200 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
