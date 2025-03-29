import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("✅ User Created:", user);

      // Store user info in Firestore
      await setDoc(doc(db, "Users", user.uid), {
        email: user.email,
        firstName: fname,
        lastName: lname,
        photo: "",
      });

      console.log("✅ User added to Firestore");

      toast.success("Signup Successful! Redirecting...", { position: "top-center" });

      // Redirect immediately after signup
      navigate("/home");
    } catch (error) {
      console.error("❌ Signup Error:", error);
      toast.error(error.message, { position: "bottom-center" });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-black to-blue-900">
      <div className="w-full max-w-md bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-lg shadow-xl border border-gray-500">
        <h3 className="text-3xl font-bold text-center text-white mb-6">Sign Up</h3>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-gray-300 font-medium">First Name</label>
            <input
              type="text"
              className="w-full mt-1 p-3 border border-gray-400 rounded-lg bg-gray-900 bg-opacity-50 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="First name"
              value={fname}
              onChange={(e) => setFname(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium">Last Name</label>
            <input
              type="text"
              className="w-full mt-1 p-3 border border-gray-400 rounded-lg bg-gray-900 bg-opacity-50 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Last name"
              value={lname}
              onChange={(e) => setLname(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium">Email Address</label>
            <input
              type="email"
              className="w-full mt-1 p-3 border border-gray-400 rounded-lg bg-gray-900 bg-opacity-50 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium">Password</label>
            <input
              type="password"
              className="w-full mt-1 p-3 border border-gray-400 rounded-lg bg-gray-900 bg-opacity-50 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold shadow-md"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center text-gray-300 mt-4">
          Already registered?{" "}
          <a href="/login" className="text-blue-400 hover:underline">
            Login Here
          </a>
        </p>
      </div>
    </div>
  );
}

export default Signup;

