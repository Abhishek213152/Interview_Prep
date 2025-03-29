import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaArrowLeft,
  FaUserTie,
  FaLaptopCode,
} from "react-icons/fa";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Ended = () => {
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state
  const [error, setError] = useState(null); // Add error state

  // Check for user authentication
  useEffect(() => {
    console.log("Ended component mounted");

    try {
      // Try to load assessment data from localStorage
      const savedAssessment = localStorage.getItem("interviewAssessment");
      console.log("Saved assessment:", savedAssessment);

      if (savedAssessment) {
        try {
          const parsedAssessment = JSON.parse(savedAssessment);
          console.log("Parsed assessment:", parsedAssessment);
          setAssessment(parsedAssessment);
        } catch (error) {
          console.error("Error parsing assessment data:", error);
          setError("Failed to parse assessment data");
        }
      }

      // Auth listener
      const unsubscribe = onAuthStateChanged(
        auth,
        async (currentUser) => {
          console.log("Auth state changed:", currentUser?.email);
          try {
            if (currentUser) {
              try {
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
              } catch (dbError) {
                console.error("Error fetching user data:", dbError);
                setUser({
                  firstName: "Guest",
                  lastName: "",
                  email: currentUser?.email || "guest@example.com",
                });
              }
            } else {
              setUser(null);
            }
          } catch (authError) {
            console.error("Auth error:", authError);
          } finally {
            setLoading(false);
          }
        },
        (authError) => {
          console.error("Auth observer error:", authError);
          setLoading(false);
          setError("Authentication error");
        }
      );

      return () => {
        console.log("Ended component unmounting");
        unsubscribe(); // Cleanup listener
      };
    } catch (error) {
      console.error("General error in useEffect:", error);
      setLoading(false);
      setError("An unexpected error occurred");
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // Redirect to landing page
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const goBackToInterview = () => {
    // Clear the interview assessment data
    localStorage.removeItem("interviewAssessment");
    localStorage.removeItem("interviewSessionId");
    navigate("/interview");
  };

  // Function to format the assessment data
  const formatAssessment = () => {
    if (!assessment) return null;

    try {
      if (assessment.text_assessment) {
        return (
          <p className="text-gray-200 text-lg">{assessment.text_assessment}</p>
        );
      }

      return (
        <div className="space-y-6">
          {Object.entries(assessment).map(([key, value]) => (
            <div key={key} className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-xl font-bold text-blue-400 mb-2">
                {key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </h3>
              {typeof value === "string" ? (
                <p className="text-gray-200">{value}</p>
              ) : (
                <ul className="space-y-2">
                  {Object.entries(value).map(([subKey, subValue]) => (
                    <li key={subKey} className="bg-gray-700 p-3 rounded">
                      <strong className="text-blue-300">
                        {subKey.replace(/_/g, " ")}:
                      </strong>{" "}
                      <span className="text-gray-200">{String(subValue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );
    } catch (error) {
      console.error("Error formatting assessment:", error);
      return <p className="text-red-400">Error displaying assessment data</p>;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid mb-4"></div>
          <p className="text-xl">Loading results...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate("/interview")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Return to Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen">
      <header className="flex justify-between items-center p-6 bg-gray-900 shadow-lg">
        <div className="flex items-center">
          <div className="mr-3 bg-blue-600 p-2 rounded-lg">
            <FaLaptopCode className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold">Interview Results</h1>
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
          <button
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        )}
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden max-w-4xl mx-auto">
          <div className="bg-gray-900 p-6 flex flex-col items-center border-b border-gray-700">
            <div className="text-green-500 text-6xl mb-4">
              <FaCheckCircle />
            </div>
            <h2 className="text-3xl font-bold text-center mb-2">
              Interview Completed
            </h2>
            <p className="text-xl text-gray-300 text-center">
              Thank you for completing your AI interview session!
            </p>
          </div>

          <div className="p-6">
            <h3 className="text-2xl font-bold text-blue-400 mb-6">
              Your Assessment
            </h3>

            {assessment ? (
              formatAssessment()
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No assessment data available.</p>
              </div>
            )}

            <div className="mt-10 flex justify-center">
              <button
                onClick={goBackToInterview}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                <FaArrowLeft className="mr-2" />
                Start New Interview
              </button>
            </div>
          </div>

          <div className="bg-gray-900 p-6 border-t border-gray-700">
            <p className="text-center text-gray-400">
              Your interview results are for your reference only and will not be
              shared with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ended;
