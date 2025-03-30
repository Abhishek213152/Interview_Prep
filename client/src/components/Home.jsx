import React, { useEffect, useState } from "react";
import {
  FaRobot,
  FaUserTie,
  FaFileAlt,
  FaSearch,
  FaLaptopCode,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import Button from "./Button";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  // Fetch profile image from MongoDB
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Set user data with UID
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
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setProfileImage(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfileImage(null);
      setMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen">
      <header className="flex flex-wrap justify-between items-center p-3 sm:p-4 md:p-6 bg-gray-900 shadow-lg">
        <div className="flex items-center">
          <div className="mr-2 sm:mr-3 bg-blue-600 p-1 sm:p-2 rounded-lg">
            <FaLaptopCode className="text-white text-lg sm:text-2xl" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">AI Placement Prep</h1>
        </div>

        {user ? (
          <div className="relative">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-base sm:text-lg font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">{user.email}</p>
              </div>
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-600 rounded-full flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FaUserTie className="text-white text-base sm:text-xl" />
                )}
              </div>
            </div>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 text-white rounded-lg shadow-lg z-10">
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                  onClick={() => {
                    navigate("/profile");
                    setMenuOpen(false);
                  }}
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
            className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 py-1 sm:py-2 text-sm sm:text-base"
            onClick={() => navigate("/login")}
          >
            Login
          </Button>
        )}
      </header>

      <section className="text-center py-8 sm:py-10 md:py-12 px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
          AI-Powered Placement Preparation
        </h1>
        <p className="text-base sm:text-lg text-gray-300 mt-4 max-w-3xl mx-auto px-2">
          Prepare for your dream job with AI-driven coding practice and resume
          analysis.
        </p>

        <div className="mt-8 sm:mt-10 md:mt-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-4">
          <div className="bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden transform hover:-translate-y-1 duration-300">
            <div className="h-1 bg-blue-500"></div>
            <div className="p-4 sm:p-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <FaFileAlt className="text-white text-xl sm:text-2xl" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">
                Coding Assessment
              </h3>
              <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
                Practice algorithmic challenges across various difficulty levels
                to improve your problem-solving skills.
              </p>
              <Link to="/difficulty" className="block">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors duration-300 flex items-center justify-center text-sm sm:text-base">
                  Get Started
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5 ml-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </Link>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden transform hover:-translate-y-1 duration-300">
            <div className="h-1 bg-green-500"></div>
            <div className="p-4 sm:p-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <FaSearch className="text-white text-xl sm:text-2xl" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">
                Scan Resume
              </h3>
              <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
                Get personalized AI feedback to improve your resume and boost
                your chances of landing interviews with top companies.
              </p>
              <Link to="/upload" className="block">
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors duration-300 flex items-center justify-center text-sm sm:text-base">
                  Upload Resume
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5 ml-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </Link>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden transform hover:-translate-y-1 duration-300">
            <div className="h-1 bg-purple-500"></div>
            <div className="p-4 sm:p-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <FaRobot className="text-white text-xl sm:text-2xl" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">
                AI Interview
              </h3>
              <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
                Practice with our AI interviewer to gain confidence and improve
                your technical interview skills with real-time feedback.
              </p>
              <Link to="/interview" className="block">
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors duration-300 flex items-center justify-center text-sm sm:text-base">
                  Start Interview
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5 ml-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {user && (
        <section className="py-8 px-4 sm:px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
            Your Progress
          </h2>
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <FeatureCard
                icon={<FaLaptopCode className="text-blue-400" />}
                title="Coding Challenges"
                desc={`${user.totalQuestionsAttempted || 0} completed`}
              />
              <FeatureCard
                icon={<FaRobot className="text-purple-400" />}
                title="AI Interviews"
                desc={`${user.interviewsCompleted || 0} sessions`}
              />
              <FeatureCard
                icon={<FaSearch className="text-green-400" />}
                title="Resume Scans"
                desc={`${user.resumeAnalysisCount || 0} analyses`}
              />
              <FeatureCard
                icon={<FaUserTie className="text-amber-400" />}
                title="Your Profile"
                desc={
                  <button
                    onClick={() => navigate("/profile")}
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    View details
                  </button>
                }
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="flex items-center p-3 sm:p-4 bg-gray-700 rounded-lg">
    <div className="mr-3 text-2xl sm:text-3xl">{icon}</div>
    <div>
      <h3 className="font-medium text-base sm:text-lg">{title}</h3>
      <p className="text-gray-400 text-sm sm:text-base">{desc}</p>
    </div>
  </div>
);

export default Home;
