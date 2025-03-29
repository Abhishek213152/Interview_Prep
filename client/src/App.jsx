import { Routes, Route } from "react-router-dom";
import React from "react";
import Home from "./components/Home";
import Sidebar from "./components/Sidebar";
import Coding from "./components/Coding";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Interview from "./components/Interview";
import Difficulty from "./components/Difficulty";
import Ended from "./components/Ended";
import Result from "./components/Result";
import Results from "./components/Results";
import Profile from "./components/Profile";

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/resume" element={<Sidebar />} />
        <Route path="/coding" element={<Coding />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/difficulty" element={<Difficulty />} />
        <Route path="/ended" element={<Ended />} />
        <Route path="/result" element={<Result />} />
        <Route path="/results" element={<Results />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
};

export default App;
