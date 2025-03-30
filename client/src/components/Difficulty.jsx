import React, { useState, useEffect } from "react";
import { FaUserTie, FaLaptopCode } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

const Difficulty = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data());
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

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const difficultyOptions = [
    { level: "Easy", count: 3 },
    { level: "Easy", count: 6 },
    { level: "Medium", count: 3 },
    { level: "Medium", count: 6 },
    { level: "Hard", count: 3 },
    { level: "Hard", count: 6 },
  ];

  const handleSelect = (level, count) => {
    setSelectedDifficulty({ level, count });
  };

  const handleStartPractice = () => {
    // Store selected difficulty and count in localStorage
    localStorage.setItem(
      "selectedDifficulty",
      JSON.stringify(selectedDifficulty)
    );

    // Reset the assessment data if any exists
    localStorage.removeItem("codingAssessmentScore");
    localStorage.removeItem("codingQuestionsAttempted");
    localStorage.removeItem("codingQuestionsTotal");

    // Reset and store the new assessment difficulty
    localStorage.removeItem("assessmentDifficulty");
    localStorage.setItem(
      "assessmentDifficulty",
      selectedDifficulty.level.toLowerCase()
    );

    // Navigate to coding page
    navigate("/coding");
  };

  return (
    <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen">
      {/* Responsive Header */}
      <header className="flex justify-between items-center p-3 sm:p-4 md:p-6 bg-gray-900 shadow-lg">
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
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-600 rounded-full flex items-center justify-center cursor-pointer"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <FaUserTie className="text-white text-base sm:text-xl" />
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
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700 border-t border-gray-600"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 py-1 sm:py-2 rounded text-sm sm:text-base"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        )}
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 sm:py-10 md:py-16 px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">
            Select Challenge Difficulty
          </h2>
          <p className="text-gray-300 text-sm sm:text-base md:text-lg">
            Choose the difficulty level and number of questions for your coding
            practice
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {difficultyOptions.map((item, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 sm:p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedDifficulty &&
                selectedDifficulty.level === item.level &&
                selectedDifficulty.count === item.count
                  ? "bg-blue-900 border-blue-500"
                  : "bg-gray-800 border-gray-700"
              }`}
              onClick={() => handleSelect(item.level, item.count)}
            >
              <div
                className={`text-lg sm:text-xl font-semibold mb-2 sm:mb-3 ${
                  item.level === "Easy"
                    ? "text-green-400"
                    : item.level === "Medium"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {item.level}
              </div>

              <div className="text-gray-300 text-base sm:text-lg">
                {item.count} question{item.count !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>

        {selectedDifficulty && (
          <div className="mt-6 sm:mt-8 flex justify-center">
            <button
              className="bg-blue-600 hover:bg-blue-700 px-6 sm:px-8 py-2 sm:py-3 rounded-lg text-base sm:text-lg font-medium transition-all"
              onClick={handleStartPractice}
            >
              Start Practice
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Difficulty;
