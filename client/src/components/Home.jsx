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
      <header className="flex justify-between items-center p-6 bg-gray-900 shadow-lg">
        <div className="flex items-center">
          <div className="mr-3 bg-blue-600 p-2 rounded-lg">
            <FaLaptopCode className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold">AI Placement Prep</h1>
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

      <section className="text-center py-12 px-6">
        <h1 className="text-5xl font-bold">AI-Powered Placement Preparation</h1>
        <p className="text-lg text-gray-300 mt-4 max-w-3xl mx-auto">
          Prepare for your dream job with AI-driven coding practice and resume
          analysis.
        </p>

        <div className="mt-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          <div className="bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden transform hover:-translate-y-1 duration-300">
            <div className="h-1 bg-blue-500"></div>
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-6">
                <FaFileAlt className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-3">Coding Assessment</h3>
              <p className="text-gray-400 mb-6">
                Practice algorithmic challenges across various difficulty levels
                to improve your problem-solving skills.
              </p>
              <Link to="/difficulty" className="block">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center">
                  Get Started
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-2"
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
            <div className="p-6">
              <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-6">
                <FaSearch className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-3">Scan Resume</h3>
              <p className="text-gray-400 mb-6">
                Get personalized AI feedback to improve your resume and boost
                your chances of landing interviews with top companies.
              </p>
              <button
                onClick={() => navigate("/resume")}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center"
              >
                Analyze Now
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2"
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
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden transform hover:-translate-y-1 duration-300">
            <div className="h-1 bg-purple-500"></div>
            <div className="p-6">
              <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-6">
                <FaRobot className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Voice Interview</h3>
              <p className="text-gray-400 mb-6">
                Simulate technical interviews with our AI interviewer and get
                real-time feedback to boost your confidence.
              </p>
              <button
                onClick={() => navigate("/interview")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center"
              >
                Start Interview
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2"
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
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 text-center">
        <h2 className="text-3xl font-semibold mb-8">
          Why Use Our AI Placement Platform?
        </h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all border-t-4 border-blue-500">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-blue-500/10 rounded-full">
              <FaRobot className="text-blue-500 text-2xl" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">
              AI Resume Analysis
            </h3>
            <p className="text-gray-400">
              Our AI scans your resume, identifies key strengths and weaknesses,
              and provides actionable improvements.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all border-t-4 border-green-500">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-green-500/10 rounded-full">
              <FaSearch className="text-green-500 text-2xl" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">
              Skill-Based Practice
            </h3>
            <p className="text-gray-400">
              Customize your practice sessions with difficulty levels that match
              your current experience and learning goals.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-lg shadow-lg hover:shadow-xl transition-all border-t-4 border-purple-500">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-purple-500/10 rounded-full">
              <FaFileAlt className="text-purple-500 text-2xl" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">
              Performance Tracking
            </h3>
            <p className="text-gray-400">
              Track your progress over time with detailed analytics and receive
              personalized improvement recommendations.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
    <div className="text-blue-500 text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold">{title}</h3>
    <p className="text-gray-400 mt-2">{desc}</p>
  </div>
);

export default Home;
