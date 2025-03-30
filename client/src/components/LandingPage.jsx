import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaLaptopCode,
  FaRegLightbulb,
  FaChartLine,
  FaUserTie,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "react-toastify";

const LandingPage = () => {
  const navigate = useNavigate();

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const features = [
    {
      icon: <FaRegLightbulb className="text-yellow-300 text-2xl" />,
      title: "Personalized Feedback",
      description:
        "Receive tailored insights to improve your interview performance",
    },
    {
      icon: <FaChartLine className="text-green-400 text-2xl" />,
      title: "Track Progress",
      description: "Monitor your improvement across different interview types",
    },
    {
      icon: <FaUserTie className="text-blue-300 text-2xl" />,
      title: "Industry-Specific",
      description: "Practice with questions tailored to your target industry",
    },
  ];

  // Guest login function that directly uses the provided credentials
  const handleGuestLogin = async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        "abhishekjha@gmail.com",
        "123456"
      );
      toast.success("Logged in as Guest", {
        position: "top-center",
      });
      navigate("/home");
    } catch (error) {
      console.error("Guest login error:", error.code, error.message);

      // Display appropriate error messages
      if (error.code === "auth/user-not-found") {
        toast.error("Guest account not found!", {
          position: "bottom-center",
        });
      } else if (error.code === "auth/wrong-password") {
        toast.error("Invalid guest credentials", {
          position: "bottom-center",
        });
      } else if (error.code === "auth/network-request-failed") {
        toast.error("Network error. Please check your connection.", {
          position: "bottom-center",
        });
      } else {
        toast.error(`Guest login failed: ${error.message}`, {
          position: "bottom-center",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-indigo-900 flex flex-col items-center justify-between p-6 text-white font-sans">
      <header className="w-full max-w-6xl flex items-center justify-center py-6 px-4">
        <div className="flex items-center">
          <div className="mr-3 bg-blue-600 p-2 rounded-lg shadow-lg">
            <FaLaptopCode className="text-white text-2xl" />
          </div>
          <h1 className="text-3xl font-bold">AI Placement Prep</h1>
        </div>
      </header>

      <main className="w-full max-w-6xl flex flex-col items-center justify-center flex-grow">
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300 leading-tight">
            Master Your Interview Skills
          </h2>
          <p className="mt-6 text-gray-300 text-xl max-w-2xl mx-auto leading-relaxed">
            Get ready for your dream job with AI-powered mock interviews and
            personalized feedback to boost your confidence and performance.
          </p>
        </motion.div>

        <motion.div
          className="w-full max-w-4xl bg-white bg-opacity-5 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-gray-700 border-opacity-25"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center p-6 rounded-xl bg-gradient-to-b from-white/10 to-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <div className="bg-blue-900/50 p-4 rounded-full mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-blue-200 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-300 text-center">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <motion.button
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 rounded-lg shadow-lg hover:shadow-blue-500/20 font-medium text-lg transition-all duration-300 flex items-center justify-center"
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Log In</span>
            </motion.button>
            <motion.button
              className="bg-transparent border-2 border-blue-400 text-white px-8 py-4 rounded-lg shadow-lg hover:bg-blue-900/30 font-medium text-lg transition-all duration-300 flex items-center justify-center"
              onClick={() => navigate("/signup")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Sign Up</span>
            </motion.button>
          </div>

          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-blue-950 bg-opacity-50 px-4 text-sm text-gray-400">
                  or try without an account
                </span>
              </div>
            </div>

            <motion.button
              className="mt-6 bg-purple-700 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-purple-600 font-medium text-lg transition-all duration-300"
              onClick={handleGuestLogin}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Try as Guest</span>
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-blue-300 text-lg font-semibold">
            Trusted by over 10,000 job seekers
          </p>
          <div className="flex justify-center space-x-8 mt-4 opacity-70">
            {/* Company logos would go here */}
            <div className="h-8 w-24 bg-white/20 rounded"></div>
            <div className="h-8 w-24 bg-white/20 rounded"></div>
            <div className="h-8 w-24 bg-white/20 rounded"></div>
          </div>
        </motion.div>
      </main>

      <footer className="w-full max-w-6xl mt-12 py-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
        <div className="text-gray-400 text-sm">
          &copy; 2025 AI Placement Prep. All rights reserved.
        </div>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <a href="#terms" className="text-gray-400 hover:text-white text-sm">
            Terms
          </a>
          <a href="#privacy" className="text-gray-400 hover:text-white text-sm">
            Privacy
          </a>
          <a href="#contact" className="text-gray-400 hover:text-white text-sm">
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
