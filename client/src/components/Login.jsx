import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import SigninwithGoogle from "./SigninWithGoogle";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/home"); // Redirect when user is logged in
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("User logged in Successfully", {
        position: "top-center",
      });
      navigate("/home");
    } catch (error) {
      console.error("Error during login:", error.code, error.message);
      
      if (error.code === "auth/user-not-found") {
        toast.error("User not found! Please sign up first.", {
          position: "bottom-center",
        });
      } else if (error.code === "auth/wrong-password") {
        toast.error("Incorrect password. Please try again.", {
          position: "bottom-center",
        });
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email format.", {
          position: "bottom-center",
        });
      } else {
        toast.error("Login failed. Please try again.", {
          position: "bottom-center",
        });
      }
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-black to-blue-900 p-6">
      <div className="w-full max-w-md bg-white bg-opacity-10 backdrop-blur-lg p-8 rounded-2xl shadow-lg text-white">
        <h3 className="text-3xl font-extrabold text-center text-blue-300 drop-shadow-md">
          Welcome Back!
        </h3>
        <p className="text-center text-gray-300 italic mt-2">
          Login to continue your journey
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div>
            <label className="block text-blue-200 font-medium">Email address</label>
            <input
              type="email"
              className="w-full mt-1 p-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-900 text-white"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-blue-200 font-medium">Password</label>
            <input
              type="password"
              className="w-full mt-1 p-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-900 text-white"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg shadow-md hover:bg-blue-700 transition text-lg font-semibold"
          >
            Login
          </button>
        </form>

        <p className="text-center text-gray-300 mt-4">
          New user?{" "}
          <a href="/signup" className="text-blue-400 hover:underline">
            Sign Up
          </a>
        </p>

        <div className="text-center my-4 text-gray-400">OR</div>

        <SigninwithGoogle />
      </div>
    </div>
  );
}

export default Login;


