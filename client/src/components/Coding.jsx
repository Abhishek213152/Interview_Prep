import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import { FaLaptopCode, FaUserTie } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

// Register languages for syntax highlighting
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("python", python);

// API base URL - update this after Vercel deployment
const API_URL =
  "https://codingserverproject-30l4il85v-abhisheks-projects-b6b1354b.vercel.app";

const Coding = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [isAccepted, setIsAccepted] = useState(false);
  const [code, setCode] = useState({
    java: "",
    cpp: "",
    python: "",
  });
  const [language, setLanguage] = useState("java");
  const [question, setQuestion] = useState({
    id: 0,
    title: "Loading...",
    difficulty: "",
    description: "Loading question...",
    examples: [],
    constraints: [],
    function_signature: {
      java: "",
      cpp: "",
      python: "",
    },
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [runningTest, setRunningTest] = useState(null);
  const [allTestsRun, setAllTestsRun] = useState(false);
  const editorRef = useRef(null);

  // Assessment tracking states
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [score, setScore] = useState(0);
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  // Map language names to Monaco editor language identifiers
  const languageMap = {
    java: "java",
    cpp: "cpp",
    python: "python",
  };

  // Check for user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
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
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/"); // Redirect to landing page
  };

  // ... existing code ...

  // Function to determine color class based on difficulty
  const difficultyColorClass = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "hard":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Responsive Header */}
      <header className="flex justify-between items-center p-3 sm:p-4 md:p-6 bg-gray-800 shadow-lg">
        <div className="flex items-center">
          <div className="mr-2 sm:mr-3 bg-blue-600 p-1 sm:p-2 rounded-lg">
            <FaLaptopCode className="text-white text-lg sm:text-2xl" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">Coding Challenge</h1>
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
              <div className="absolute right-0 mt-2 w-40 bg-gray-700 text-white rounded-lg shadow-lg z-10">
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-600"
                  onClick={() => {
                    navigate("/profile");
                    setMenuOpen(false);
                  }}
                >
                  Profile
                </button>
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-600 border-t border-gray-600"
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

      {/* Main content */}
      <div className="flex flex-col md:flex-row p-2 sm:p-4 gap-4 h-[calc(100vh-4rem)]">
        {/* Question Box */}
        <div className="w-full md:w-2/5 bg-gray-800 rounded-lg shadow-lg overflow-y-auto p-3 sm:p-4 md:p-5 h-[40vh] md:h-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gray-700 px-2 py-1 rounded">
                <span className="text-xs sm:text-sm font-bold">
                  Question {questionsAttempted + 1}/{totalQuestions}
                </span>
              </div>
              <div className="bg-purple-600 px-2 py-1 rounded">
                <span className="text-xs sm:text-sm font-bold">
                  Score: {score} points
                </span>
              </div>
            </div>
            {questionsAttempted >= totalQuestions - 1 ? (
              <button
                onClick={submitAll}
                className="bg-green-500 text-gray-900 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-semibold"
              >
                Submit All
              </button>
            ) : (
              <button
                onClick={fetchQuestion}
                className="bg-purple-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-semibold"
              >
                {loading ? "Loading..." : "New Question"}
              </button>
            )}
          </div>

          <hr className="border-gray-600 mb-4" />

          {loading ? (
            <div className="text-center p-4">
              <p>Loading question...</p>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <h2 className="text-pink-500 text-lg sm:text-xl mb-1">
                  {question.title}
                </h2>
                <span
                  className="px-2 py-1 rounded text-xs font-bold"
                  style={{
                    backgroundColor: difficultyColor(question.difficulty),
                  }}
                >
                  {question.difficulty}
                </span>
              </div>

              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line mb-4">
                {question.description}
              </p>

              {/* Examples with Run Test buttons */}
              <h2 className="text-cyan-400 text-base sm:text-lg mt-4 mb-2">
                🔹 Examples:
              </h2>
              {question.examples &&
                question.examples.map((example, index) => (
                  <div
                    key={index}
                    className="text-xs sm:text-sm mb-3 bg-gray-700 p-2 sm:p-3 rounded"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <strong>Example {index + 1}:</strong>
                      <div className="flex items-center gap-2">
                        {testResults[index] && (
                          <span
                            className={
                              testResults[index].passed
                                ? "text-green-400"
                                : "text-red-400 text-lg"
                            }
                          >
                            {testResults[index].passed ? "✅" : "❌"}
                          </span>
                        )}
                        <button
                          onClick={() => runTestCase(index)}
                          disabled={loading || runningTest !== null}
                          className={`text-xs px-2 py-1 rounded font-bold ${
                            runningTest === index
                              ? "bg-gray-600"
                              : "bg-cyan-400 text-gray-900 hover:bg-cyan-300"
                          } ${
                            loading || runningTest !== null
                              ? "cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                        >
                          {runningTest === index ? "Running..." : "Run Test"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <strong>Input:</strong>{" "}
                      {typeof example.input === "string"
                        ? example.input.replace(/^["'`]+|["'`]+$/g, "")
                        : JSON.stringify(example.input)}{" "}
                      <br />
                      <strong>Output:</strong>{" "}
                      {typeof example.output === "string"
                        ? example.output.replace(/^["'`]+|["'`]+$/g, "")
                        : JSON.stringify(example.output)}
                      {example.explanation && (
                        <>
                          <br />
                          <strong>Explanation:</strong> {example.explanation}
                        </>
                      )}
                    </div>

                    {/* Test case result */}
                    {testResults[index] && testResults[index].explanation && (
                      <div
                        className={`mt-2 p-2 rounded text-xs ${
                          testResults[index].passed
                            ? "bg-green-500 bg-opacity-10"
                            : "bg-red-500 bg-opacity-10"
                        }`}
                      >
                        <div>
                          <strong>Your Output:</strong>{" "}
                          {typeof testResults[index].actual_output === "string"
                            ? testResults[index].actual_output.replace(
                                /^["'`]+|["'`]+$/g,
                                ""
                              )
                            : JSON.stringify(testResults[index].actual_output)}
                        </div>
                        {!testResults[index].passed && (
                          <div>
                            <strong>Why it failed:</strong>{" "}
                            {testResults[index].explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

              {/* Constraints */}
              {question.constraints && question.constraints.length > 0 && (
                <>
                  <h2 className="text-cyan-400 text-base sm:text-lg mt-4 mb-2">
                    🔹 Constraints:
                  </h2>
                  <ul className="pl-5 list-disc text-xs sm:text-sm">
                    {question.constraints.map((constraint, index) => (
                      <li key={index} className="mb-1">
                        {constraint}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {/* Assessment completed section */}
          {assessmentComplete && (
            <div className="mt-4 p-4 bg-gray-700 rounded text-center">
              <h3 className="text-green-400 text-lg sm:text-xl mb-2">
                Assessment Completed!
              </h3>
              <p className="mb-3 text-sm">
                You have completed all {totalQuestions} questions.
              </p>
              <p className="text-base sm:text-lg font-bold mb-4">
                Final Score: {score}/{totalQuestions}
              </p>
              <button
                onClick={endAssessment}
                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded font-bold"
              >
                End Assessment
              </button>
            </div>
          )}
        </div>

        {/* Coding Box */}
        <div className="w-full md:w-3/5 bg-gray-700 rounded-lg shadow-lg p-3 sm:p-4 flex flex-col h-[calc(60vh-1rem)] md:h-full">
          {/* Language Buttons */}
          <div className="mb-2">
            {["java", "cpp", "python"].map((lang) => (
              <button
                key={lang}
                className={`mr-2 px-3 py-1 rounded font-bold text-xs sm:text-sm ${
                  language === lang
                    ? "bg-green-400 text-gray-900"
                    : "bg-gray-600 text-white hover:bg-gray-500"
                }`}
                onClick={() => setLanguage(lang)}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Monaco Code Editor */}
          <div className="border border-gray-600 rounded flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={languageMap[language]}
              value={code[language]}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              options={{
                scrollBeyondLastLine: false,
                minimap: { enabled: true },
                fontFamily: "'Fira Code', 'Consolas', monospace",
                fontSize: 16,
                lineNumbers: "on",
                matchBrackets: "always",
                automaticLayout: true,
                tabSize: 4,
              }}
            />
          </div>

          {/* Test Feedback Overview */}
          {testResults.length > 0 && (
            <div className="mt-2 p-2 bg-gray-800 rounded flex justify-between items-center text-xs sm:text-sm">
              <div>
                <span>Test Cases: </span>
                {question.examples.map((_, index) => (
                  <span
                    key={index}
                    className={`mr-2 font-bold ${
                      testResults[index]
                        ? testResults[index].passed
                          ? "text-green-400"
                          : "text-red-400"
                        : "text-gray-600"
                    }`}
                  >
                    {testResults[index]
                      ? testResults[index].passed
                        ? "✅"
                        : "❌"
                      : "•"}
                  </span>
                ))}
              </div>
              <div className="font-bold">
                {testResults.filter((result) => result && result.passed).length}
                /{testResults.filter((result) => result).length} passed
              </div>
            </div>
          )}

          {/* Submit & Next Question Buttons */}
          <div className="flex gap-2 mt-2">
            {isAccepted ? (
              <button
                onClick={moveToNextQuestion}
                className="flex-1 bg-green-400 hover:bg-green-500 text-gray-900 py-2 rounded font-bold text-sm sm:text-base flex items-center justify-center"
              >
                {questionsAttempted >= totalQuestions
                  ? "Complete Assessment"
                  : "Next Question →"}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || submitting || !allTestsRun}
                className={`flex-1 py-2 rounded font-bold text-sm sm:text-base ${
                  loading || submitting || !allTestsRun
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                }`}
              >
                {submitting ? "Submitting..." : "Submit Solution"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Coding;
