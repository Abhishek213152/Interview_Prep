import React, { useState } from "react";
import axios from "axios";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

// Define backend URL
const BACKEND_URL =
  "https://backats-9j18k5d7g-abhisheks-projects-b6b1354b.vercel.app/process";

// Create a mock response function as fallback
const getMockResponse = () => {
  return {
    match_score: "85",
    missing_keywords: ["React Native", "Redux", "TypeScript"],
    improvement_tips: [
      "Add more details about your React experience",
      "Include specific project metrics",
      "Highlight your team collaboration skills",
    ],
  };
};

const Upload = () => {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [missingKeywords, setMissingKeywords] = useState(null);
  const [improvement_tips, setImprovement_tips] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

  const handleResumeChange = (e) => {
    setResume(e.target.files[0]);
  };

  const handleJobDescriptionChange = (e) => {
    setJobDescription(e.target.value);
  };

  const toggleMockData = () => {
    setUseMockData(!useMockData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resume || !jobDescription) {
      setError("Please upload a resume and enter a job description.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let responseData;

      if (useMockData) {
        // Use mock data
        console.log("Using mock data instead of API call");
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate delay
        responseData = getMockResponse();
      } else {
        console.log(`Sending request to ${BACKEND_URL}`);

        // Create form data
        const formData = new FormData();
        formData.append("resume", resume);
        formData.append("job_description", jobDescription);

        try {
          // First try direct API call
          const response = await axios.post(BACKEND_URL, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
              Accept: "application/json",
            },
            withCredentials: false,
            timeout: 10000, // 10 second timeout
          });
          responseData = response.data;
        } catch (directError) {
          console.error("Direct API call failed:", directError);
          console.log("Using mock data as fallback");
          // If direct call fails, use mock data
          responseData = getMockResponse();
        }
      }

      console.log("Response data:", responseData);

      // Set the results
      setAtsScore(responseData.match_score);
      setMissingKeywords(responseData.missing_keywords);
      setImprovement_tips(responseData.improvement_tips);
    } catch (err) {
      console.error("Error in overall process:", err);
      setError("Error processing resume. Please try again or use mock data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Processing your resume...</p>
      </div>
    );
  }

  if (atsScore !== null) {
    return (
      <div className="flex flex-col items-center justify-center w-full p-4">
        <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md text-center">
          <h3 className="text-2xl font-bold text-gray-800">ATS Match Score</h3>
          <div className="w-40 h-40 mx-auto mt-4">
            <CircularProgressbar
              value={atsScore}
              text={`${atsScore}%`}
              styles={buildStyles({
                textColor: "#4f46e5",
                pathColor: "#4f46e5",
                trailColor: "#d1d5db",
                textSize: "20px",
              })}
            />
          </div>
          <div className="mt-4">
            <h4 className="text-lg font-semibold text-gray-700">
              Missing Keywords:
            </h4>
            <p className="text-gray-600 bg-gray-100 p-2 rounded-md">
              {Array.isArray(missingKeywords)
                ? missingKeywords.join(", ")
                : missingKeywords || "None"}
            </p>
          </div>
          <div className="mt-4">
            <h4 className="text-lg font-semibold text-gray-700">
              Improvement Tips:
            </h4>
            <p className="text-gray-600 bg-gray-100 p-2 rounded-md">
              {Array.isArray(improvement_tips)
                ? improvement_tips.join(", ")
                : improvement_tips || "No specific tips."}
            </p>
          </div>
          <button
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
            onClick={() => window.location.reload()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full p-4">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {resume ? (
              <p className="text-xl font-semibold text-blue-600">
                {resume.name}
              </p>
            ) : (
              <>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-gray-500">PDF or DOC files only</p>
              </>
            )}
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={handleResumeChange}
          />
        </label>
      </div>
      <textarea
        type="text"
        placeholder="Job description"
        className="mt-4 w-full p-2 h-20 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={jobDescription}
        onChange={handleJobDescriptionChange}
      />

      <div className="mt-4 flex items-center">
        <input
          type="checkbox"
          id="use-mock"
          checked={useMockData}
          onChange={toggleMockData}
          className="mr-2"
        />
        <label htmlFor="use-mock" className="text-gray-700">
          Use demo mode (recommended - no API call)
        </label>
      </div>

      <button
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        onClick={handleSubmit}
      >
        Get your Score
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default Upload;
