import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";

// Register languages for syntax highlighting
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("python", python);

// API base URL - update this after Vercel deployment
const API_URL = "http://127.0.0.1:5000";

const Coding = () => {
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

  useEffect(() => {
    // Try to load assessment progress from localStorage
    const savedScore = localStorage.getItem("codingAssessmentScore");
    const savedAttempted = localStorage.getItem("codingQuestionsAttempted");
    const savedTotal = localStorage.getItem("codingQuestionsTotal");

    if (savedScore && savedAttempted && savedTotal) {
      setScore(parseInt(savedScore));
      setQuestionsAttempted(parseInt(savedAttempted));
      setTotalQuestions(parseInt(savedTotal));

      // Check if assessment is complete
      if (parseInt(savedAttempted) >= parseInt(savedTotal)) {
        setAssessmentComplete(true);
      } else {
        // Continue with assessment
        fetchQuestion();
      }
    } else {
      // Get selected difficulty from localStorage
      const difficultyData = localStorage.getItem("selectedDifficulty");
      if (difficultyData) {
        const { level, count } = JSON.parse(difficultyData);
        setTotalQuestions(count);
        localStorage.setItem("codingQuestionsTotal", count.toString());
        fetchQuestion(level.toLowerCase());
      } else {
        // No difficulty selected, use default
        setTotalQuestions(3);
        localStorage.setItem("codingQuestionsTotal", "3");
        fetchQuestion("easy");
      }
    }
  }, []);

  // Reset test results when changing language
  useEffect(() => {
    setTestResults([]);
    setAllTestsRun(false);
  }, [language]);

  const fetchQuestion = (difficultyLevel) => {
    // Calculate and add points from current question before loading a new one
    if (testResults.length > 0) {
      let pointsEarned = 0;
      testResults.forEach((result) => {
        if (result && result.passed) {
          pointsEarned += 5; // 5 points per passing test
        }
      });

      // Update score
      const newScore = score + pointsEarned;
      setScore(newScore);
      localStorage.setItem("codingAssessmentScore", newScore.toString());
    }

    setLoading(true);
    setResults(null);
    setTestResults([]);
    setIsAccepted(false); // Reset the accepted state
    setAllTestsRun(false);

    // If this is a new question in an active assessment, update the attempt count
    if (!assessmentComplete && questionsAttempted < totalQuestions) {
      const newQuestionsAttempted = questionsAttempted + 1;
      setQuestionsAttempted(newQuestionsAttempted);
      localStorage.setItem(
        "codingQuestionsAttempted",
        newQuestionsAttempted.toString()
      );

      // Check if assessment is complete after this question
      if (newQuestionsAttempted >= totalQuestions) {
        setAssessmentComplete(true);
      }
    }

    // Get difficulty from localStorage if not provided
    let selectedDifficulty = difficultyLevel;
    if (!selectedDifficulty) {
      const difficultyData = localStorage.getItem("selectedDifficulty");
      if (difficultyData) {
        const { level } = JSON.parse(difficultyData);
        selectedDifficulty = level.toLowerCase();
      } else {
        selectedDifficulty = "easy";
      }
    }

    // Store the difficulty in localStorage to ensure consistency
    if (!localStorage.getItem("assessmentDifficulty")) {
      localStorage.setItem("assessmentDifficulty", selectedDifficulty);
    } else {
      // Always use the stored assessment difficulty to maintain consistency
      selectedDifficulty = localStorage.getItem("assessmentDifficulty");
    }

    fetch(`${API_URL}/get_question?difficulty=${selectedDifficulty}`)
      .then((response) => response.json())
      .then((data) => {
        // Ensure the question matches our selected difficulty
        if (
          data.difficulty &&
          data.difficulty.toLowerCase() !== selectedDifficulty
        ) {
          console.log(
            `Received ${data.difficulty} question instead of ${selectedDifficulty}, retrying...`
          );
          fetchQuestion(selectedDifficulty);
          return;
        }

        setQuestion(data);
        // Initialize code editor with function signatures using LeetCode templates
        const javaTemplate = data.function_signature?.java
          ? `class Solution {
    ${data.function_signature.java.replace(
      /\/\/.*?}/,
      `
        // Write your code here
    }
}`
    )}`
          : `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        
    }
}`;

        const newCode = {
          java: javaTemplate,
          cpp: data.function_signature?.cpp
            ? `class Solution {
public:
    ${data.function_signature.cpp.replace(
      /\/\/.*?}/,
      "\n    // Write your code here\n    }"
    )}
};`
            : `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your code here
        
    }
};`,
          python: data.function_signature?.python
            ? `class Solution:
    ${data.function_signature.python
      .replace(/#.*$/gm, "")
      .trim()
      .replace(/pass/, "        # Write your code here\n        pass")}`
            : `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your code here
        pass
        `,
        };

        setCode(newCode);
        setLoading(false);

        // Save question and code to localStorage
        localStorage.setItem("codingQuestion", JSON.stringify(data));
        localStorage.setItem("codingCode", JSON.stringify(newCode));
      })
      .catch((error) => {
        console.error("Error fetching question:", error);
        setLoading(false);
      });
  };

  const moveToNextQuestion = () => {
    // Note: Don't update questionsAttempted here, since it's now handled in fetchQuestion

    // Fetch next question with the same difficulty level as current assessment
    const storedDifficulty = localStorage.getItem("assessmentDifficulty");
    if (storedDifficulty) {
      fetchQuestion(storedDifficulty);
    } else {
      // If no stored difficulty (shouldn't happen), check selectedDifficulty
      const difficultyData = localStorage.getItem("selectedDifficulty");
      if (difficultyData) {
        const { level } = JSON.parse(difficultyData);
        const difficulty = level.toLowerCase();
        // Store it for future consistency
        localStorage.setItem("assessmentDifficulty", difficulty);
        fetchQuestion(difficulty);
      } else {
        // Fallback to easy as default
        localStorage.setItem("assessmentDifficulty", "easy");
        fetchQuestion("easy");
      }
    }
  };

  const updateScore = (testResults) => {
    // Calculate score based on test cases - 5 points per passing test
    let scoreForThisQuestion = 0;
    testResults.forEach((result) => {
      if (result && result.passed) {
        scoreForThisQuestion += 5;
      }
    });

    // Update total score
    const newScore = score + scoreForThisQuestion;
    setScore(newScore);
    localStorage.setItem("codingAssessmentScore", newScore.toString());
    return scoreForThisQuestion;
  };

  const endAssessment = () => {
    // Calculate any remaining points from current test results
    if (testResults.length > 0) {
      let pointsEarned = 0;
      testResults.forEach((result) => {
        if (result && result.passed) {
          pointsEarned += 5; // 5 points per passing test
        }
      });

      // Update the final score
      const newScore = score + pointsEarned;
      setScore(newScore);
      localStorage.setItem("codingAssessmentScore", newScore.toString());
    }

    // Mark assessment as complete
    setAssessmentComplete(true);
    localStorage.setItem("codingQuestionsAttempted", totalQuestions.toString());

    // Navigate to the results page
    window.location.href = "/results";
  };

  const submitAll = () => {
    // Calculate final score if there are any unscored test results
    if (testResults.length > 0) {
      let pointsEarned = 0;
      testResults.forEach((result) => {
        if (result && result.passed) {
          pointsEarned += 5; // 5 points per passing test
        }
      });

      // Update score
      const newScore = score + pointsEarned;
      setScore(newScore);
      localStorage.setItem("codingAssessmentScore", newScore.toString());
    }

    // Set assessment as complete
    setAssessmentComplete(true);
    localStorage.setItem("codingQuestionsAttempted", totalQuestions.toString());

    // Navigate to results page
    window.location.href = "/results";
  };

  const handleSubmit = () => {
    // Check if all test cases have been run
    if (!allTestsRun) {
      alert("Please run all test cases before submitting your solution.");
      return;
    }

    setSubmitting(true);
    setResults(null);

    fetch(`${API_URL}/submit_solution`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_description: question.description,
        examples: question.examples,
        language: language,
        code: code[language],
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        setResults(data);
        setSubmitting(false);

        // Set isAccepted to true if all tests passed
        if (data.success === true) {
          setIsAccepted(true);
          // Update score based on test results
          updateScore(testResults);
        }
      })
      .catch((error) => {
        console.error("Error submitting code:", error);
        setSubmitting(false);
        setResults({
          success: false,
          error: "Failed to submit solution. Please try again.",
        });
      });
  };

  // Function to handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Set editor options
    editor.updateOptions({
      scrollBeyondLastLine: false,
      minimap: { enabled: true },
      fontFamily: "'Fira Code', 'Consolas', monospace",
      fontSize:
        language === "java" || language === "cpp" || language === "python"
          ? 16
          : 14, // Bigger font for all languages
      lineNumbers: "on",
      matchBrackets: "always",
      automaticLayout: true,
      tabSize: 4,
    });

    // Add auto bracket closing
    monaco.editor.defineTheme("customDracula", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#282a36",
        "editor.foreground": "#f8f8f2",
        "editor.lineHighlightBackground": "#44475a",
        "editorCursor.foreground": "#f8f8f2",
        "editor.selectionBackground": "#44475a",
        "editor.inactiveSelectionBackground": "#44475a70",
      },
    });

    monaco.editor.setTheme("customDracula");
  };

  const handleCodeChange = (value) => {
    const updatedCode = { ...code, [language]: value };
    setCode(updatedCode);
    // Save updated code to localStorage
    localStorage.setItem("codingCode", JSON.stringify(updatedCode));
    // Clear test results when code changes
    setTestResults([]);
    setAllTestsRun(false);
  };

  const runTestCase = (index) => {
    const testCase = question.examples[index];
    setRunningTest(index);

    fetch(`${API_URL}/run_test_case`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: language,
        code: code[language],
        test_case: testCase,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Store the result with the test index
        const newTestResults = [...testResults];
        newTestResults[index] = data;
        setTestResults(newTestResults);
        setRunningTest(null);

        // Check if all test cases have been run
        const allRun = question.examples.every((_, i) => newTestResults[i]);
        setAllTestsRun(allRun);
      })
      .catch((error) => {
        console.error("Error running test case:", error);
        setRunningTest(null);

        // Store the error with the test index
        const newTestResults = [...testResults];
        newTestResults[index] = {
          passed: false,
          error: "Failed to run test case. Please try again.",
        };
        setTestResults(newTestResults);
      });
  };

  // Helper function to convert difficulty to color
  const difficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "#5cb85c"; // green
      case "medium":
        return "#f0ad4e"; // yellow
      case "hard":
        return "#d9534f"; // red
      default:
        return "#6272a4";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        padding: "10px",
        gap: "10px",
        backgroundColor: "#1e1e2e",
        color: "#ffffff",
        flexDirection: window.innerWidth < 768 ? "column" : "row", // Responsive layout
      }}
    >
      {/* Question Box */}
      <div
        style={{
          width: window.innerWidth < 768 ? "100%" : "40%",
          background: "#282a36",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
          overflowY: "auto",
          maxHeight: window.innerWidth < 768 ? "40vh" : "100vh",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginRight: "auto",
            }}
          >
            <div
              style={{
                backgroundColor: "#44475a",
                padding: "6px 10px",
                borderRadius: "4px",
                marginRight: "10px",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                Question {questionsAttempted + 1}/{totalQuestions}
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#bd93f9",
                padding: "6px 10px",
                borderRadius: "4px",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                Score: {score} points
              </span>
            </div>
          </div>
          {questionsAttempted >= totalQuestions - 1 ? (
            <button
              onClick={submitAll}
              style={{
                backgroundColor: "#50fa7b",
                color: "#282a36",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              Submit All
            </button>
          ) : (
            <button
              onClick={fetchQuestion}
              style={{
                backgroundColor: "#bd93f9",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              {loading ? "Loading..." : "New Question"}
            </button>
          )}
        </div>

        <hr style={{ borderColor: "#6272a4" }} />

        {loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p>Loading question...</p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginBottom: "10px",
              }}
            >
              <h2
                style={{
                  color: "#ff79c6",
                  fontSize: "20px",
                  marginBottom: "5px",
                }}
              >
                {question.title}
              </h2>
              <span
                style={{
                  backgroundColor: difficultyColor(question.difficulty),
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {question.difficulty}
              </span>
            </div>

            <p
              style={{
                fontSize: "16px",
                lineHeight: "1.6",
                whiteSpace: "pre-line",
              }}
            >
              {question.description}
            </p>

            {/* Display Examples with Run Test buttons */}
            <h2
              style={{ color: "#8be9fd", fontSize: "18px", marginTop: "15px" }}
            >
              🔹 Examples:
            </h2>
            {question.examples &&
              question.examples.map((example, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.6",
                    marginBottom: "15px",
                    backgroundColor: "#353746",
                    padding: "10px",
                    borderRadius: "5px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "5px",
                    }}
                  >
                    <strong>Example {index + 1}:</strong>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {testResults[index] && (
                        <span
                          style={{
                            color: testResults[index].passed
                              ? "#50fa7b"
                              : "#ff5555",
                            fontSize: "18px",
                          }}
                        >
                          {testResults[index].passed ? "✅" : "❌"}
                        </span>
                      )}
                      <button
                        onClick={() => runTestCase(index)}
                        disabled={loading || runningTest !== null}
                        style={{
                          backgroundColor:
                            runningTest === index ? "#6272a4" : "#8be9fd",
                          color: "#282a36",
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          cursor:
                            loading || runningTest !== null
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
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

                  {/* Display test case result */}
                  {testResults[index] && testResults[index].explanation && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px",
                        backgroundColor: testResults[index].passed
                          ? "rgba(80, 250, 123, 0.1)"
                          : "rgba(255, 85, 85, 0.1)",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
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

            {/* Display Constraints */}
            {question.constraints && question.constraints.length > 0 && (
              <>
                <h2
                  style={{
                    color: "#8be9fd",
                    fontSize: "18px",
                    marginTop: "15px",
                  }}
                >
                  🔹 Constraints:
                </h2>
                <ul style={{ paddingLeft: "20px", margin: "5px 0" }}>
                  {question.constraints.map((constraint, index) => (
                    <li
                      key={index}
                      style={{ fontSize: "14px", marginBottom: "5px" }}
                    >
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
          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              backgroundColor: "#44475a",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                color: "#50fa7b",
                fontSize: "20px",
                marginBottom: "10px",
              }}
            >
              Assessment Completed!
            </h3>
            <p style={{ marginBottom: "15px" }}>
              You have completed all {totalQuestions} questions.
            </p>
            <p
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "20px",
              }}
            >
              Final Score: {score}/{totalQuestions}
            </p>
            <button
              onClick={endAssessment}
              style={{
                backgroundColor: "#ff79c6",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              End Assessment
            </button>
          </div>
        )}
      </div>

      {/* Coding Box */}
      <div
        style={{
          width: window.innerWidth < 768 ? "100%" : "60%",
          background: "#44475a",
          padding: "20px",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Language Buttons */}
        <div>
          {["java", "cpp", "python"].map((lang) => (
            <button
              key={lang}
              style={{
                marginRight: "5px",
                backgroundColor: language === lang ? "#50fa7b" : "#6272a4",
                color: language === lang ? "#282a36" : "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
              onClick={() => setLanguage(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Monaco Code Editor */}
        <div
          style={{
            marginTop: "10px",
            height: "calc(100vh - 300px)",
            border: "1px solid #6272a4",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
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
              fontSize:
                language === "java" ||
                language === "cpp" ||
                language === "python"
                  ? 16
                  : 14, // Bigger font for all languages
              lineNumbers: "on",
              matchBrackets: "always",
              automaticLayout: true,
              tabSize: 4,
              formatOnType: true,
              formatOnPaste: true,
              bracketPairColorization: {
                enabled: true,
              },
              suggest: {
                showMethods: true,
                showFunctions: true,
                showConstructors: true,
                showFields: true,
                showVariables: true,
                showClasses: true,
                showStructs: true,
                showInterfaces: true,
                showEnums: true,
                showEnumMembers: true,
              },
            }}
          />
        </div>

        {/* Test Feedback Overview */}
        {testResults.length > 0 && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: "#282a36",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span>Test Cases: </span>
              {question.examples.map((_, index) => (
                <span
                  key={index}
                  style={{
                    marginRight: "10px",
                    color: testResults[index]
                      ? testResults[index].passed
                        ? "#50fa7b"
                        : "#ff5555"
                      : "#6272a4",
                    fontWeight: "bold",
                  }}
                >
                  {testResults[index]
                    ? testResults[index].passed
                      ? "✅"
                      : "❌"
                    : "•"}
                </span>
              ))}
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>
                {testResults.filter((result) => result && result.passed).length}
                /{testResults.filter((result) => result).length} passed
              </span>
            </div>
          </div>
        )}

        {/* Submit & Next Question Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          {isAccepted ? (
            <button
              onClick={moveToNextQuestion}
              style={{
                flex: 1,
                marginTop: "10px",
                backgroundColor: "#50fa7b",
                color: "#282a36",
                border: "none",
                padding: "10px 15px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {questionsAttempted >= totalQuestions
                ? "Complete Assessment"
                : "Next Question →"}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || submitting || !allTestsRun}
              style={{
                flex: 1,
                marginTop: "10px",
                backgroundColor:
                  loading || submitting
                    ? "#6272a4"
                    : !allTestsRun
                    ? "#6272a4"
                    : testResults.some((result) => result && !result.passed)
                    ? "#FFA500"
                    : "#50fa7b",
                color:
                  testResults.some((result) => result && !result.passed) &&
                  !loading &&
                  !submitting &&
                  allTestsRun
                    ? "#000000"
                    : "#f8f8f2",
                border: "none",
                padding: "10px 15px",
                borderRadius: "4px",
                cursor:
                  loading || submitting || !allTestsRun
                    ? "not-allowed"
                    : "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {submitting
                ? "Evaluating..."
                : !allTestsRun
                ? "Run All Tests First"
                : testResults.some((result) => result && !result.passed)
                ? `❌ Wrong Answer - Submit Your Code (${
                    testResults.filter((result) => result && result.passed)
                      .length
                  }/${testResults.length} passed)`
                : "✅ Correct Answer - Submit Solution"}
            </button>
          )}

          {!assessmentComplete && (
            <button
              onClick={endAssessment}
              style={{
                marginTop: "10px",
                backgroundColor: "#ff5555",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              End Assessment
            </button>
          )}
        </div>

        {/* Results Section */}
        {results && (
          <div
            style={{
              marginTop: "15px",
              backgroundColor: "#282a36",
              padding: "15px",
              borderRadius: "8px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                color: results.success ? "#50fa7b" : "#ff5555",
                marginTop: 0,
                marginBottom: "10px",
              }}
            >
              {results.success
                ? "✅ All Tests Passed!"
                : "❌ Some Tests Failed"}
            </h3>

            {results.test_results && (
              <div>
                <p style={{ fontSize: "14px", marginBottom: "10px" }}>
                  Passed {results.passed_tests} of {results.total_tests} tests
                </p>

                {results.test_results.map((test, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: test.passed ? "#2d4e39" : "#4e2d2d",
                      padding: "10px",
                      borderRadius: "5px",
                      marginBottom: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Test {test.test_number}</span>
                      <span
                        style={{ color: test.passed ? "#50fa7b" : "#ff5555" }}
                      >
                        {test.passed ? "Passed ✓" : "Failed ✗"}
                      </span>
                    </div>
                    {!test.passed && (
                      <div style={{ marginTop: "5px" }}>
                        <div>
                          <strong>Input:</strong>{" "}
                          {typeof test.input === "string"
                            ? test.input.replace(/^["'`]+|["'`]+$/g, "")
                            : JSON.stringify(test.input)}
                        </div>
                        <div>
                          <strong>Expected:</strong>{" "}
                          {typeof test.expected_output === "string"
                            ? test.expected_output.replace(
                                /^["'`]+|["'`]+$/g,
                                ""
                              )
                            : JSON.stringify(test.expected_output)}
                        </div>
                        <div>
                          <strong>Your Output:</strong>{" "}
                          {typeof test.actual_output === "string"
                            ? test.actual_output.replace(/^["'`]+|["'`]+$/g, "")
                            : JSON.stringify(test.actual_output)}
                        </div>
                        {test.explanation && (
                          <div>
                            <strong>Error:</strong> {test.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {results.error && (
              <div style={{ color: "#ff5555" }}>
                <p>{results.error}</p>
              </div>
            )}

            {results.execution_time && (
              <div style={{ marginTop: "10px", fontSize: "14px" }}>
                <p>
                  <strong>Execution Time:</strong> {results.execution_time} ms
                </p>
                <p>
                  <strong>Memory Usage:</strong> {results.memory_usage} MB
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Coding;
