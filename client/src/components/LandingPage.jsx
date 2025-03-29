import React from "react";
import { useNavigate } from "react-router-dom";
import { FaLaptopCode } from "react-icons/fa";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-r from-black to-blue-900 flex flex-col items-center justify-center p-6 text-white font-sans">
      <header className="w-full max-w-6xl text-center py-8">
        <div className="flex items-center justify-center">
          <div className="mr-3 bg-blue-600 p-2 rounded-lg">
            <FaLaptopCode className="text-white text-2xl" />
          </div>
          <h1 className="text-4xl font-bold">AI Placement Prep</h1>
        </div>
        <p className="text-lg mt-2 text-gray-300 italic">
          Master your interview skills with AI-driven mock sessions
        </p>
      </header>

      <main className="w-full max-w-4xl bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-lg p-8 text-center">
        <h2 className="text-3xl font-bold text-blue-200 drop-shadow-md">
          Practice for Your Dream Job
        </h2>
        <p className="mt-4 text-gray-200 leading-relaxed text-lg">
          Get ready for your placements with AI-powered mock interviews and
          real-time feedback. Our intelligent system helps you improve your
          answers, communication, and confidence. Whether it's technical rounds,
          HR interviews, or aptitude tests, we've got you covered!
        </p>
        <div className="mt-6 flex justify-center space-x-4">
          <button
            className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 font-medium text-lg"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-600 font-medium text-lg"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </button>
        </div>
      </main>

      <footer className="w-full max-w-6xl text-center py-6 mt-8 text-gray-400 text-sm">
        &copy; 2025 AI Placement Practice. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
