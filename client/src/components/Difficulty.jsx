import React, { useState, useEffect } from "react";
import { FaUserTie } from "react-icons/fa";
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
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 text-white rounded-lg shadow-lg z-10">
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

      <div className="max-w-4xl mx-auto py-16 px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Select Challenge Difficulty
          </h2>
          <p className="text-gray-300 text-lg">
            Choose the difficulty level and number of questions for your coding
            practice
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {difficultyOptions.map((item, index) => (
            <div
              key={index}
              className={`border rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedDifficulty &&
                selectedDifficulty.level === item.level &&
                selectedDifficulty.count === item.count
                  ? "bg-blue-900 border-blue-500"
                  : "bg-gray-800 border-gray-700"
              }`}
              onClick={() => handleSelect(item.level, item.count)}
            >
              <div
                className={`text-xl font-semibold mb-3 ${
                  item.level === "Easy"
                    ? "text-green-400"
                    : item.level === "Medium"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {item.level}
              </div>

              <div className="text-gray-300 text-lg">
                {item.count} question{item.count !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>

        {selectedDifficulty && (
          <div className="mt-8 flex justify-center">
            <button
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg text-lg font-medium transition-all"
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
