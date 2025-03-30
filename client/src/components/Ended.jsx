import React from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";

const Ended = () => {
  const navigate = useNavigate();

  const startNewInterview = () => {
    // Clear localStorage items related to the interview
    localStorage.removeItem("interviewAssessment");
    localStorage.removeItem("interviewSessionId");

    // Navigate to the interview page
    navigate("/interview");
  };

  return (
    <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden max-w-md mx-auto text-center p-8">
        <div className="flex flex-col items-center">
          <div className="text-green-500 text-6xl mb-4">
            <FaCheckCircle />
          </div>
          <h2 className="text-3xl font-bold text-center mb-2">
            Interview Completed
          </h2>
          <p className="text-xl text-gray-300 text-center mb-8">
            Thank you for completing your AI interview session!
          </p>
          <button
            onClick={startNewInterview}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
          >
            Start New Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default Ended;
