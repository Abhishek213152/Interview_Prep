import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserTie,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaTrophy,
} from "react-icons/fa";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Results = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    // Retrieve score and assessment completion data from localStorage
    const storedScore = localStorage.getItem("codingAssessmentScore");
    const questionsAttempted = localStorage.getItem("codingQuestionsAttempted");

    if (storedScore !== null) {
      setScore(parseInt(storedScore));
    }

    if (questionsAttempted !== null) {
      setQuestionsAttempted(parseInt(questionsAttempted));
    }

    setLoading(false);

    // Check for user authentication
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

  const goToHome = () => {
    navigate("/home");
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#50fa7b"; // Green for high scores
    if (score >= 60) return "#f1fa8c"; // Yellow for medium scores
    return "#ff5555"; // Red for low scores
  };

  const getScoreText = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  const handleStartNewAssessment = () => {
    // Clear assessment data
    localStorage.removeItem("codingAssessmentScore");
    localStorage.removeItem("codingQuestionsAttempted");
    localStorage.removeItem("assessmentDifficulty");
    navigate("/difficulty");
  };

  // Show loading state
  if (loading) {
    return (
      <div
        style={{
          background: "linear-gradient(to right, #000000, #130f40)",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "white",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              width: "48px",
              height: "48px",
              border: "4px solid rgba(255, 255, 255, 0.3)",
              borderTop: "4px solid #8be9fd",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "16px",
            }}
          ></div>
          <p style={{ fontSize: "1.25rem" }}>Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(to right, #000000, #130f40)",
        minHeight: "100vh",
        color: "white",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            backgroundColor: "#282a36",
            borderRadius: "12px",
            padding: "30px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          }}
        >
          <h1
            style={{
              fontSize: "2rem",
              textAlign: "center",
              marginBottom: "30px",
              color: "#bd93f9",
            }}
          >
            Coding Assessment Results
          </h1>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                border: `10px solid ${getScoreColor(score)}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#44475a",
                padding: "15px",
                boxSizing: "border-box",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: score < 10 ? "3rem" : "2.8rem",
                  fontWeight: "bold",
                  color: getScoreColor(score),
                  marginBottom: "5px",
                }}
              >
                {score}
              </span>
              <span
                style={{
                  color: getScoreColor(score),
                  fontSize: "1.1rem",
                  fontWeight: "500",
                  wordBreak: "break-word",
                  lineHeight: "1.2",
                }}
              >
                {getScoreText(score)}
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#44475a",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "30px",
            }}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                marginBottom: "16px",
                color: "#8be9fd",
              }}
            >
              Assessment Summary
            </h2>
            <div style={{ marginBottom: "10px" }}>
              <span style={{ color: "#f8f8f2" }}>Questions Attempted:</span>
              <span style={{ float: "right", fontWeight: "bold" }}>
                {questionsAttempted}
              </span>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <span style={{ color: "#f8f8f2" }}>Points Earned:</span>
              <span style={{ float: "right", fontWeight: "bold" }}>
                {score}
              </span>
            </div>
            <div>
              <span style={{ color: "#f8f8f2" }}>Performance Level:</span>
              <span
                style={{
                  float: "right",
                  fontWeight: "bold",
                  color: getScoreColor(score),
                }}
              >
                {getScoreText(score)}
              </span>
            </div>
          </div>

          <div
            style={{ display: "flex", justifyContent: "center", gap: "20px" }}
          >
            <button
              onClick={goToHome}
              style={{
                backgroundColor: "#6272a4",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
            >
              Return Home
            </button>
            <button
              onClick={handleStartNewAssessment}
              style={{
                backgroundColor: "#ff79c6",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
            >
              Start New Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
