import React, { useEffect, useState } from "react";
import { FaRobot, FaUserTie, FaFileAlt, FaSearch } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import Button from "./Button";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data()); // Update state with user details
        } else {
          setUser({
            firstName: "Guest",
            lastName: "",
            email: currentUser.email,
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/"); // Redirect to landing page
  };

  return (
    <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen">
      <header className="flex justify-between items-center p-6 bg-gray-900 shadow-lg">
        <h1 className="text-2xl font-bold">AI Placement Prep</h1>

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
                className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center cursor-pointer"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <FaUserTie className="text-white text-xl" />
              </div>
            </div>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 text-white rounded-lg shadow-lg">
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
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<FaRobot />}
            title="AI Resume Analysis"
            desc="Get instant AI feedback on your resume to improve your chances."
          />
          <FeatureCard
            icon={<FaSearch />}
            title="Skill-Based Practice"
            desc="Get personalized questions based on your skillset."
          />
          <FeatureCard
            icon={<FaFileAlt />}
            title="Performance Tracking"
            desc="Monitor your progress and improve with AI insights."
          />
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
