import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FaMicrophone,
  FaPause,
  FaFileUpload,
  FaSpinner,
  FaUserTie,
} from "react-icons/fa";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Interview = () => {
  // State variables
  const [name, setName] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const voiceMode = true;
  const [audioElement, setAudioElement] = useState(null);
  const [lastSpeechTime, setLastSpeechTime] = useState(null);
  const silenceTimerRef = useRef(null);
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // References
  const messagesEndRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const recognitionRef = useRef(null);

  const navigate = useNavigate();

  // API endpoint
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
  console.log("Using API URL:", API_URL); // Add logging to verify API URL

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

  // Auto-start listening when the interview begins and after AI speaks
  useEffect(() => {
    // This ensures the microphone activates at the beginning and after each AI response
    if (
      isInterviewStarted &&
      !isListening &&
      !isSpeaking &&
      messages.length > 0
    ) {
      console.log("Auto-starting speech recognition after AI message");
      // Small delay to ensure the UI has updated and the AI has finished speaking
      const timer = setTimeout(() => {
        if (!isSpeaking && recognitionRef.current) {
          startListening();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isInterviewStarted, isListening, isSpeaking, messages]);

  // Initialize speech recognition with silence detection
  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Use single recognition mode
      recognitionRef.current.interimResults = true; // Get interim results for better UX
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        // Get either final or interim result
        const isFinal = event.results[event.results.length - 1].isFinal;
        const transcript =
          event.results[event.results.length - 1][0].transcript;

        // Always update the input field with the latest transcript
        setUserInput(transcript);

        // Update last speech time whenever we get a result
        setLastSpeechTime(Date.now());

        // Clear any existing silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // Reset countdown
        setSilenceCountdown(0);

        // If we have text, start the silence detection countdown
        if (transcript && transcript.trim()) {
          // Start visual countdown from 100 to 0 over 4 seconds
          let countdown = 100;
          const countdownInterval = setInterval(() => {
            countdown -= 2.5; // Decrease by 2.5 every 100ms (40 steps for 4 seconds)
            if (countdown <= 0) {
              clearInterval(countdownInterval);
              countdown = 0;
            }
            setSilenceCountdown(countdown);
          }, 100);

          // Set the silence timer to send the message after 4 seconds
          silenceTimerRef.current = setTimeout(() => {
            clearInterval(countdownInterval);
            setSilenceCountdown(0);
            console.log("Silence detected for 4 seconds");
            if (transcript && transcript.trim() && isListening) {
              console.log("Auto-sending message after silence");
              sendResponse(transcript.trim());
            }
          }, 4000);
        }

        if (isFinal) {
          console.log("Final speech recognized:", transcript);
          // For final results, clear the countdown and send immediately
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          setSilenceCountdown(0);

          // Auto-send after final speech recognition
          setTimeout(() => {
            if (transcript && transcript.trim()) {
              console.log("Auto-sending message after speech completed");
              sendResponse(transcript.trim());
            }
          }, 300);
        }
      };

      recognitionRef.current.onstart = () => {
        console.log("Recognition started");
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        console.log("Recognition ended - restarting");
        setIsListening(false);

        // Restart speech recognition if interview is ongoing and not speaking
        if (isInterviewStarted && !isSpeaking) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              console.log("Auto-restarted speech recognition");
            } catch (e) {
              console.error("Failed to restart speech recognition:", e);
            }
          }, 300);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        // Restart after error (except aborted)
        if (event.error !== "aborted" && isInterviewStarted && !isSpeaking) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              console.log("Restarted speech recognition after error");
            } catch (e) {
              console.error(
                "Failed to restart speech recognition after error:",
                e
              );
            }
          }, 300);
        }
      };
    }

    return () => {
      // Clean up silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setSilenceCountdown(0);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isInterviewStarted, isSpeaking]);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size - limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit. Please upload a smaller file.");
        e.target.value = null; // Reset the input
        setResumeFile(null);
        return;
      }

      // Check file type
      const fileExtension = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase();
      const validTypes = [".pdf", ".doc", ".docx", ".txt", ".rtf"];
      if (!validTypes.includes(fileExtension)) {
        alert(
          "Invalid file type. Please upload PDF, DOC, DOCX, TXT or RTF files only."
        );
        e.target.value = null; // Reset the input
        setResumeFile(null);
        return;
      }

      console.log(
        "Resume file selected:",
        file.name,
        `(${Math.round(file.size / 1024)} KB)`
      );
    } else {
      console.log("No resume file selected");
    }
    setResumeFile(file);
  };

  // Start interview
  const startInterview = async (e) => {
    e.preventDefault();
    if (!name) {
      alert("Please enter your name");
      return;
    }

    // Check if browser supports speech recognition
    if (
      !("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      alert(
        "Your browser doesn't support speech recognition. Please use Chrome, Edge or Safari."
      );
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("voice_mode", "true");

      // Handle resume file upload
      if (resumeFile) {
        console.log("Adding resume file to form data:", resumeFile.name);
        // Use a specific filename rather than the original one
        formData.append(
          "resume",
          resumeFile,
          "candidate_resume" +
            resumeFile.name.substring(resumeFile.name.lastIndexOf("."))
        );
      }

      console.log("Sending request to:", `${API_URL}/start_interview`);
      console.log("Form data name:", name);
      console.log("Voice mode:", voiceMode);

      const response = await axios.post(
        `${API_URL}/start_interview`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          // Add timeout
          timeout: 60000, // 60 second timeout (increased for voice processing)
        }
      );

      if (response.data.success) {
        setSessionId(response.data.session_id);
        setMessages([
          {
            role: "assistant",
            content: response.data.message,
          },
        ]);
        setIsInterviewStarted(true);

        // If voice mode is enabled and audio URL is provided
        if (voiceMode && response.data.audio_url) {
          playServerAudio(response.data.audio_url);
        } else {
          // Fallback to browser TTS
          speakText(response.data.message);
        }
      } else {
        alert("Failed to start interview");
      }
    } catch (error) {
      console.error("Error starting interview:", error);

      // Detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code outside the 2xx range
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        console.error("Response headers:", error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
      } else {
        // Something happened in setting up the request
        console.error("Error message:", error.message);
      }

      alert(
        `Error starting interview: ${
          error.message || "Unknown error"
        }. Please check console for details.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Send response function (modify to accept an optional parameter)
  const sendResponse = async (manualInput = "") => {
    // Use either the provided input or the current userInput state
    const messageToSend = manualInput || userInput.trim();

    if (!messageToSend || !sessionId) return;

    setUserInput(""); // Clear input field

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: messageToSend,
      },
    ]);

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/interview_response`, {
        session_id: sessionId,
        message: messageToSend,
      });

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.data.message,
          },
        ]);

        // If voice mode is enabled and audio URL is provided
        if (voiceMode && response.data.audio_url) {
          playServerAudio(response.data.audio_url);
        } else {
          // Fallback to browser TTS
          speakText(response.data.message);
        }
      } else {
        alert("Failed to process response");
      }
    } catch (error) {
      console.error("Error sending response:", error);
      alert("Error processing your response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // End interview
  const endInterview = async () => {
    if (!sessionId) return;

    // Show confirmation dialog
    if (!confirm("Are you sure you want to end this interview?")) {
      return; // Exit if user cancels
    }

    setIsLoading(true);
    setIsEnding(true); // Show the ending loader

    try {
      const response = await axios.post(`${API_URL}/end_interview`, {
        session_id: sessionId,
      });

      if (response.data.success) {
        setAssessment(response.data.assessment);
        stopSpeech();
        stopListening();

        // Add a delay before redirecting to show the loader
        setTimeout(() => {
          // Store assessment data in localStorage before redirecting
          localStorage.setItem(
            "interviewAssessment",
            JSON.stringify(response.data.assessment)
          );
          localStorage.setItem("interviewSessionId", sessionId);

          // Use window.location.href for a full page reload to /ended
          window.location.href = "/ended";
        }, 2000); // 2 second delay for the loading animation
      } else {
        alert("Failed to end interview");
        setIsEnding(false);
      }
    } catch (error) {
      console.error("Error ending interview:", error);
      alert("Error ending the interview. Please try again.");
      setIsEnding(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the interview after viewing assessment
  const resetInterview = () => {
    // Reset all the interview-related states
    setIsInterviewStarted(false);
    setSessionId(null);
    setMessages([]);
    setAssessment(null);
    setUserInput("");
    // Stop any ongoing audio or speech
    stopSpeech();
    stopListening();
  };

  // Make sure the isSpeaking state properly controls the microphone
  useEffect(() => {
    // Stop listening when AI starts speaking
    if (isSpeaking && recognitionRef.current) {
      console.log("AI speaking - ensuring microphone is completely off");
      stopListening(); // Immediately stop listening when AI starts speaking
    }

    // Only start listening again when AI stops speaking and interview is active
    if (
      !isSpeaking &&
      !isListening &&
      isInterviewStarted &&
      messages.length > 0
    ) {
      console.log("AI stopped speaking - waiting before restarting microphone");
      // Add a longer delay to make sure the AI has completely finished
      const timer = setTimeout(() => {
        if (!isSpeaking) {
          // Double check AI is still not speaking
          console.log("Starting microphone after AI finished speaking");
          startListening();
        }
      }, 1500); // Longer delay to ensure AI audio is completely done

      return () => clearTimeout(timer);
    }
  }, [isSpeaking, isListening, isInterviewStarted, messages]);

  // Update playServerAudio to completely shut off microphone
  const playServerAudio = (audioUrl) => {
    stopSpeech();

    // Force stop listening before playing audio
    if (recognitionRef.current) {
      console.log("Stopping microphone before playing audio");
      stopListening();
    }

    // Debug log the audio URL
    console.log("Received audio URL:", audioUrl);

    let audio = audioElement;
    if (!audio) {
      audio = new Audio();
      setAudioElement(audio);
    }

    // Add more events for better debugging
    audio.onloadstart = () => console.log("Audio loading started");
    audio.onloadeddata = () => console.log("Audio data loaded");
    audio.oncanplay = () => console.log("Audio can now play");

    audio.onplay = () => {
      console.log("Audio started playing");
      setIsSpeaking(true);
      // Double-check microphone is definitely off when audio plays
      if (recognitionRef.current) {
        stopListening();
      }
    };

    audio.onended = () => {
      console.log("Audio playback completed");
      setIsSpeaking(false);
      // The useEffect will handle restarting the microphone after a delay
    };

    // Update error handling
    audio.onerror = (e) => {
      console.error("Audio error:", e);
      console.error(
        "Audio error code:",
        audio.error ? audio.error.code : "unknown"
      );
      console.error(
        "Audio error message:",
        audio.error ? audio.error.message : "unknown"
      );
      setIsSpeaking(false);

      // Delay handling the error to avoid immediate microphone activation
      setTimeout(() => {
        const currentMessage = messages[messages.length - 1]?.content;
        if (currentMessage) {
          console.log("Falling back to browser TTS due to audio error");
          speakText(currentMessage);
        }
      }, 500);
    };

    // Full URL with cachebuster to prevent caching issues
    const fullUrl = `${API_URL}${audioUrl}?t=${new Date().getTime()}`;
    console.log("Playing audio from URL:", fullUrl);

    // Set source and trigger load before playing
    audio.src = fullUrl;
    audio.load();

    // Play with retry with a longer delay
    setTimeout(() => {
      // Ensure microphone is still off before playing
      if (isListening) {
        stopListening();
      }

      console.log("Attempting to play audio...");
      audio.play().catch((error) => {
        console.error("Failed to play audio:", error);
        // Try again after a delay
        setTimeout(() => {
          // Ensure microphone is still off before retrying
          if (isListening) {
            stopListening();
          }

          console.log("Retrying audio playback...");
          audio.play().catch((retryError) => {
            console.error("Retry also failed:", retryError);
            // Delay the fallback to ensure microphone doesn't pick up TTS
            setTimeout(() => {
              // Fall back to browser TTS
              const currentMessage = messages[messages.length - 1]?.content;
              if (currentMessage) {
                console.log("Falling back to browser TTS after retry failure");
                speakText(currentMessage);
              }
            }, 500);
          });
        }, 1000);
      });
    }, 800); // Longer initial delay for more reliable audio playback
  };

  // Text-to-speech functionality (browser-based fallback)
  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      // Stop any ongoing speech
      stopSpeech();

      // Force stop listening before speaking
      if (recognitionRef.current) {
        console.log("Ensuring microphone is completely off before browser TTS");
        stopListening();
      }

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for better clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Get voices
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // If voices aren't loaded yet, wait for them
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          setVoice(voices);
        };
      } else {
        setVoice(voices);
      }

      function setVoice(voiceList) {
        // Just use any available voice
        const preferredVoice = voiceList[0];

        if (preferredVoice) {
          console.log("Using voice:", preferredVoice.name, preferredVoice.lang);
          utterance.voice = preferredVoice;
        }

        // Set events
        utterance.onstart = () => {
          console.log("Browser TTS started");
          setIsSpeaking(true);
          // Double-check microphone is definitely off when TTS starts
          if (recognitionRef.current) {
            stopListening();
          }

          // Set a periodic check to ensure mic stays off during speech
          const checkInterval = setInterval(() => {
            if (isListening && recognitionRef.current) {
              console.log(
                "Detected microphone activated during speech - stopping it"
              );
              stopListening();
            }
          }, 500);

          // Store the interval ID for cleanup
          utterance.checkIntervalId = checkInterval;
        };

        utterance.onend = () => {
          console.log("Browser TTS ended");
          // Clear the interval check
          if (utterance.checkIntervalId) {
            clearInterval(utterance.checkIntervalId);
          }

          setIsSpeaking(false);
          // The useEffect will handle restarting the microphone after delay
        };

        utterance.onerror = (e) => {
          console.error("Browser TTS error:", e);
          // Clear the interval check
          if (utterance.checkIntervalId) {
            clearInterval(utterance.checkIntervalId);
          }

          setIsSpeaking(false);
        };

        // Store reference and speak
        speechSynthesisRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const stopSpeech = () => {
    console.log("Stopping all speech output");

    // Stop browser speech synthesis
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.error("Error canceling speech synthesis:", e);
      }
    }

    // Stop audio playback if it exists
    if (audioElement) {
      try {
        console.log("Stopping current audio playback");
        audioElement.pause();
        audioElement.currentTime = 0;
      } catch (e) {
        console.error("Error stopping audio:", e);
      }
    }

    setIsSpeaking(false);
  };

  // Enhanced speech functions with silence timer cleanup
  const startListening = () => {
    if (!recognitionRef.current) return;

    // Don't start if AI is speaking
    if (isSpeaking) {
      console.log("Cannot start listening while AI is speaking");
      return;
    }

    // Clear the input when starting to listen
    setUserInput("");

    // Reset silence detection
    setLastSpeechTime(null);
    setSilenceCountdown(0);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    try {
      console.log("Starting speech recognition");
      recognitionRef.current.start();
      console.log("Successfully started speech recognition");
    } catch (e) {
      console.error("Error starting speech recognition:", e);
      // If already started, stop and restart
      if (e.message && e.message.includes("already started")) {
        try {
          recognitionRef.current.stop();
          console.log("Stopped already-running recognition");

          setTimeout(() => {
            try {
              recognitionRef.current.start();
              console.log("Restarted recognition after stopping");
            } catch (innerError) {
              console.error("Failed to restart recognition:", innerError);
            }
          }, 300);
        } catch (stopError) {
          console.error(
            "Error stopping already-running recognition:",
            stopError
          );
        }
      }
    }
  };

  const stopListening = () => {
    console.log("STOPPING SPEECH RECOGNITION");

    // Clear silence timer when stopping listening
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Set isListening to false immediately for immediate UI feedback
    setIsListening(false);

    if (!recognitionRef.current) {
      console.log("No recognition instance to stop");
      return;
    }

    try {
      // First attempt to abort
      try {
        recognitionRef.current.abort();
        console.log("Successfully aborted speech recognition");
      } catch (abortError) {
        console.log("Abort not available or failed:", abortError);
      }

      // Then try to stop
      try {
        recognitionRef.current.stop();
        console.log("Successfully stopped speech recognition");
      } catch (stopError) {
        console.error("Error stopping speech recognition:", stopError);
      }

      // If still having issues, try recreating the recognition object
      if (isListening) {
        console.log(
          "Recognition still active after stop attempts, recreating object"
        );
        try {
          const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = "en-US";

          // Reinitialize basic event handlers
          recognitionRef.current.onstart = () => setIsListening(true);
          recognitionRef.current.onend = () => setIsListening(false);

          console.log("Successfully recreated speech recognition object");
        } catch (e) {
          console.error("Failed to recreate speech recognition:", e);
        }
      }
    } catch (e) {
      console.error("Multiple errors stopping speech recognition:", e);
    }

    // Final check
    setTimeout(() => {
      if (isListening) {
        console.log(
          "WARNING: isListening still true after stopping - forcing to false"
        );
        setIsListening(false);
      }
    }, 100);
  };

  // Speech recognition toggle - update to automatically restart listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    if (isListening) {
      console.log("Toggling speech recognition OFF");
      stopListening();
    } else {
      console.log("Toggling speech recognition ON");
      startListening();
    }
  };

  // Format assessment for display
  const formatAssessment = () => {
    if (!assessment) return null;

    if (assessment.text_assessment) {
      return <p>{assessment.text_assessment}</p>;
    }

    return (
      <div className="assessment-container">
        {Object.entries(assessment).map(([key, value]) => (
          <div key={key} className="assessment-section">
            <h3>
              {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </h3>
            {typeof value === "string" ? (
              <p>{value}</p>
            ) : (
              <ul>
                {Object.entries(value).map(([subKey, subValue]) => (
                  <li key={subKey}>
                    <strong>{subKey.replace(/_/g, " ")}:</strong> {subValue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Show the silence countdown in the UI
  const renderSilenceIndicator = () => {
    if (silenceCountdown > 0 && userInput && isListening) {
      return (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all duration-100"
            style={{ width: `${silenceCountdown}%` }}
          ></div>
        </div>
      );
    }
    return null;
  };

  // Render the Interview interface
  return (
    <div className="bg-gradient-to-r from-black to-blue-900 text-white min-h-screen">
      {isEnding && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid mb-4"></div>
            <p className="text-xl font-bold text-white">Ending Interview...</p>
            <p className="text-gray-300 mt-2">Processing your results</p>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center p-6 bg-gray-900 shadow-lg">
        <h1 className="text-2xl font-bold">AI Interview Preparation</h1>

        {user ? (
          <div className="relative">
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-gray-400 text-sm">{user.email}</p>
              </div>
              <div
                className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center cursor-pointer"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <FaUserTie className="text-white text-xl" />
              </div>
            </div>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 text-white rounded-lg shadow-lg">
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        )}
      </header>

      {!isInterviewStarted ? (
        // Interview setup page
        <div className="container mx-auto w-full px-4 mt-10">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-6 text-center text-white">
              AI Technical Interview
            </h1>
            <form onSubmit={startInterview} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-white mb-1"
                >
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Upload Your Resume (Optional)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col rounded-lg border-2 border-dashed border-gray-600 w-full h-32 p-10 group text-center cursor-pointer hover:bg-gray-700">
                    <div className="h-full w-full text-center flex flex-col items-center justify-center">
                      <div className="flex flex-auto max-h-48 w-full mx-auto">
                        {resumeFile ? (
                          <p className="text-gray-300">
                            {resumeFile.name} (
                            {Math.round(resumeFile.size / 1024)} KB)
                          </p>
                        ) : (
                          <FaFileUpload className="mx-auto text-gray-400 text-3xl" />
                        )}
                      </div>
                      <p className="pointer-none text-gray-400 text-sm">
                        <span className="text-blue-500 hover:underline">
                          Click to upload
                        </span>{" "}
                        or drag and drop
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <FaSpinner className="animate-spin mr-2" />
                    Starting Interview...
                  </div>
                ) : (
                  "Start Interview"
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // Active interview UI
        <div className="container mx-auto w-full px-4 mt-6">
          <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                AI Technical Interview Session
              </h2>
              <button
                onClick={endInterview}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
              >
                End Interview
              </button>
            </div>

            {/* Interview chat history */}
            <div className="p-4 h-[60vh] overflow-y-auto bg-gray-700">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    msg.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`inline-block max-w-[70%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-white"
                    }`}
                  >
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Speaking status indicator */}
            <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-center font-bold">
              {isSpeaking ? (
                <p className="text-red-500 text-lg">AI is speaking...</p>
              ) : isInterviewStarted && !assessment ? (
                <p className="text-green-500 text-lg">
                  It's your turn to speak
                </p>
              ) : null}
            </div>

            {/* Input area */}
            <div className="p-4 bg-gray-900 border-t border-gray-700">
              {!assessment ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && userInput.trim()) {
                        sendResponse();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your response..."
                    disabled={isSpeaking || isLoading}
                  />
                  <button
                    onClick={() => {
                      if (userInput.trim()) {
                        sendResponse();
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    disabled={isSpeaking || isLoading || !userInput.trim()}
                  >
                    Send
                  </button>
                  <button
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isListening ? (
                      <FaPause className="text-white" />
                    ) : (
                      <FaMicrophone className="text-white" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="text-2xl font-bold text-blue-400">
                    Interview Completed!
                  </span>
                </div>
              )}

              {/* Silence indicator */}
              {renderSilenceIndicator()}
            </div>

            {/* Assessment results */}
            {assessment && (
              <div className="p-6 bg-gray-800 border-t border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-blue-400">
                  Interview Assessment
                </h3>
                <div className="space-y-4 text-white">{formatAssessment()}</div>
                <div className="mt-6 text-center">
                  <button
                    onClick={resetInterview}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold transition"
                  >
                    Return to Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;
