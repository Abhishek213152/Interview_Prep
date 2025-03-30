import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FaMicrophone,
  FaPause,
  FaFileUpload,
  FaSpinner,
  FaUserTie,
  FaLaptopCode,
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
  const [isEnding, setIsEnding] = useState(false);
  const voiceMode = true;
  const [audioElement, setAudioElement] = useState(null);
  const [lastSpeechTime, setLastSpeechTime] = useState(null);
  const silenceTimerRef = useRef(null);
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
      !isEnding && // Don't start listening if interview is ending
      messages.length > 0
    ) {
      console.log("Auto-starting speech recognition after AI message");
      // Small delay to ensure the UI has updated and the AI has finished speaking
      const timer = setTimeout(() => {
        if (
          !isSpeaking &&
          recognitionRef.current &&
          !isListening &&
          !isEnding
        ) {
          console.log("Delayed auto-start of speech recognition");
          startListening();
        }
      }, 2000); // Increased delay to 2 seconds

      return () => clearTimeout(timer);
    }
  }, [isInterviewStarted, isListening, isSpeaking, messages, isEnding]);

  // Add debounce tracking for speech recognition operations
  const [lastActionTime, setLastActionTime] = useState(0);
  const MIN_ACTION_INTERVAL = 1000; // Minimum time between speech recognition actions (ms)

  const isActionAllowed = () => {
    const now = Date.now();
    if (now - lastActionTime < MIN_ACTION_INTERVAL) {
      console.log("Action attempted too soon after previous action, skipping");
      return false;
    }
    setLastActionTime(now);
    return true;
  };

  // Initialize speech recognition with silence detection
  useEffect(() => {
    let recognition = null;

    const setupSpeechRecognition = () => {
      if (
        !("SpeechRecognition" in window) &&
        !("webkitSpeechRecognition" in window)
      ) {
        console.warn("Speech recognition not supported in this browser");
        return;
      }

      try {
        // Create a new recognition instance
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Use single recognition mode
        recognition.interimResults = true; // Get interim results for better UX
        recognition.lang = "en-US";

        // Handle speech results
        recognition.onresult = (event) => {
          try {
            // Get either final or interim result
            const isFinal = event.results[event.results.length - 1].isFinal;
            const transcript =
              event.results[event.results.length - 1][0].transcript;

            // Update input field
            setUserInput(transcript);

            // Update last speech time
            setLastSpeechTime(Date.now());

            // Clear any existing silence timer
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }

            // Reset countdown
            setSilenceCountdown(0);

            // If we have text, start silence detection countdown
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

              // Set silence timer to send message after 4 seconds
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

            // Handle final results
            if (isFinal) {
              console.log("Final speech recognized:", transcript);

              // Clear the countdown
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
              setSilenceCountdown(0);

              // Auto-send after final recognition with small delay
              setTimeout(() => {
                if (transcript && transcript.trim()) {
                  console.log("Auto-sending message after speech completed");
                  sendResponse(transcript.trim());
                }
              }, 300);
            }
          } catch (e) {
            console.error("Error in speech recognition onresult:", e);
          }
        };

        // Handle recognition start
        recognition.onstart = () => {
          console.log("Recognition started");
          setIsListening(true);
        };

        // Handle recognition end
        recognition.onend = () => {
          console.log("Recognition ended");
          setIsListening(false);

          // Only auto-restart if interview is active and AI isn't speaking
          if (isInterviewStarted && !isSpeaking) {
            setTimeout(() => {
              if (!isSpeaking && isInterviewStarted) {
                try {
                  recognition.start();
                  console.log("Auto-restarted speech recognition");
                } catch (e) {
                  if (e.message && e.message.includes("already started")) {
                    console.log("Recognition already started, not restarting");
                  } else {
                    console.error("Failed to restart speech recognition:", e);
                  }
                }
              }
            }, 500);
          }
        };

        // Handle recognition errors
        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);

          // No need to restart after aborted (we triggered that)
          if (event.error === "aborted") {
            console.log("Recognition aborted, not auto-restarting");
            return;
          }

          // Only auto-restart for other errors if interview is active and AI isn't speaking
          if (isInterviewStarted && !isSpeaking) {
            setTimeout(() => {
              if (!isSpeaking && isInterviewStarted) {
                try {
                  recognition.start();
                  console.log("Restarted speech recognition after error");
                } catch (e) {
                  if (e.message && e.message.includes("already started")) {
                    console.log(
                      "Recognition already started after error, not restarting"
                    );
                  } else {
                    console.error(
                      "Failed to restart speech recognition after error:",
                      e
                    );
                    // Try recreating the recognition object if all else fails
                    setupSpeechRecognition();
                  }
                }
              }
            }, 500);
          }
        };

        // Store the recognition instance in the ref
        recognitionRef.current = recognition;
        console.log("Speech recognition initialized successfully");
      } catch (e) {
        console.error("Error setting up speech recognition:", e);
      }
    };

    // Set up recognition initially
    setupSpeechRecognition();

    // Clean up on component unmount
    return () => {
      // Clean up silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Stop any ongoing recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }

      // Cancel any speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isInterviewStarted, isSpeaking]); // Only re-run if these change

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
    setIsLoading(true);

    // Validate name input
    if (!name.trim()) {
      alert("Please enter your name");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Starting interview...");

      // Create form data with resume file
      const formData = new FormData();
      formData.append("name", name);
      formData.append("voice_mode", voiceMode);
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      // Send request to start interview
      const response = await axios.post(
        `${API_URL}/start_interview`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setSessionId(response.data.session_id);
        setIsInterviewStarted(true);

        // Add initial message
        setMessages([{ role: "assistant", content: response.data.message }]);

        // Play audio if available
        if (voiceMode && response.data.text_for_audio) {
          // Use the new streaming endpoint
          streamAudio(response.data.text_for_audio);
        }
      } else {
        console.error("Error:", response.data.error);
        alert("Error starting interview: " + response.data.error);
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      alert(
        "Error starting interview. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Send response function (modify to accept an optional parameter)
  const sendResponse = async (manualInput = "") => {
    try {
      // Use provided input or state
      const inputText = manualInput || userInput;
      if (!inputText.trim()) return;

      // Stop any ongoing playback
      if (recognitionRef.current) {
        stopListening();
      }

      // Clear any silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setSilenceCountdown(0);

      // Update UI state
      setIsLoading(true);
      setUserInput("");

      // Add user message to UI
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "user", content: inputText },
      ]);

      // Send to server
      const response = await axios.post(`${API_URL}/interview_response`, {
        session_id: sessionId,
        message: inputText,
      });

      if (response.data.success) {
        // Add AI message to UI
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", content: response.data.message },
        ]);

        // Play audio if available in voice mode
        if (voiceMode && response.data.text_for_audio) {
          // Use the new streaming endpoint
          streamAudio(response.data.text_for_audio);
        }
      } else {
        console.error("Response error:", response.data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
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

    // Force stop speech recognition to prevent cycling
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        console.error("Error stopping recognition in endInterview:", e);
      }
    }

    // Stop any speech synthesis
    stopSpeech();

    // Clear any timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    try {
      const response = await axios.post(`${API_URL}/end_interview`, {
        session_id: sessionId,
      });

      if (response.data.success) {
        setAssessment(response.data.assessment);

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

  // New function to stream audio directly from the server
  const streamAudio = async (text) => {
    // First, stop any ongoing speech
    stopSpeech();

    // Force stop listening before playing audio
    if (recognitionRef.current) {
      console.log("Stopping microphone before playing audio");
      stopListening();
    }

    // Set speaking state immediately to prevent other operations
    setIsSpeaking(true);

    // Wait a moment to ensure recognition is fully stopped
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("Streaming audio for text:", text?.substring(0, 50) + "...");

    try {
      // Create a unique timestamp for cache-busting
      const timestamp = new Date().getTime();

      console.log("Making request to stream_audio endpoint");
      // Request audio stream from server
      const response = await axios.post(
        `${API_URL}/stream_audio?t=${timestamp}`,
        { text },
        {
          responseType: "blob",
          timeout: 30000, // 30 second timeout for audio generation
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      console.log("Received response from stream_audio endpoint");

      // Check if we got a JSON response (use_browser_tts flag)
      const contentType = response.headers["content-type"];
      if (contentType && contentType.includes("application/json")) {
        console.log(
          "Received JSON response instead of audio, using browser TTS"
        );
        // Convert blob to JSON
        const reader = new FileReader();

        // Use a promise to handle the async file reading
        const jsonData = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () =>
            reject(new Error("Failed to read blob as text"));
          reader.readAsText(response.data);
        });

        try {
          const jsonResponse = JSON.parse(jsonData);
          if (jsonResponse.use_browser_tts) {
            console.log("Server requested browser TTS fallback");
            setIsSpeaking(false);
            speakText(jsonResponse.text || text);
          }
        } catch (e) {
          console.error("Error parsing JSON response:", e);
          setIsSpeaking(false);
          speakText(text);
        }
        return;
      }

      // Create a blob URL from the response
      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const blobSize = audioBlob.size;
      console.log(`Received audio blob of size: ${blobSize} bytes`);

      // If blob is too small, it might be an error or empty response
      if (blobSize < 1000) {
        console.warn(
          "Audio blob too small, might be invalid. Falling back to browser TTS"
        );
        setIsSpeaking(false);
        speakText(text);
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);

      // Create a new audio element each time to avoid issues with reuse
      const audio = new Audio();
      setAudioElement(audio);

      // Set up event listeners
      audio.onloadstart = () => console.log("Audio loading started");
      audio.onloadeddata = () => console.log("Audio data loaded");
      audio.oncanplay = () => console.log("Audio can now play");

      audio.onplay = () => {
        console.log("Audio started playing");
        setIsSpeaking(true);
        // Double-check microphone is definitely off when audio plays
        if (recognitionRef.current && isListening) {
          stopListening();
        }
      };

      audio.onended = () => {
        console.log("Audio playback completed");
        setIsSpeaking(false);
        // Revoke blob URL to avoid memory leaks
        URL.revokeObjectURL(audioUrl);
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
        URL.revokeObjectURL(audioUrl);

        // Fall back to browser TTS
        console.log("Falling back to browser TTS due to audio error");
        speakText(text);
      };

      // Set source and pre-load
      audio.src = audioUrl;
      audio.load();

      console.log("Audio setup complete, attempting to play...");

      // Longer delay before play to ensure proper loading
      setTimeout(() => {
        if (isListening) {
          stopListening();
        }

        try {
          // Use play() with promise handling
          const playPromise = audio.play();

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("Audio playing successfully");
              })
              .catch((error) => {
                console.error("Failed to play audio:", error);
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);

                // Fall back to browser TTS
                console.log("Falling back to browser TTS after play failure");
                speakText(text);
              });
          }
        } catch (playError) {
          console.error("Error during play() call:", playError);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          speakText(text);
        }
      }, 1000);
    } catch (error) {
      console.error("Error streaming audio:", error);
      setIsSpeaking(false);

      // Fall back to browser TTS
      console.log("Falling back to browser TTS due to streaming error");
      speakText(text);
    }
  };

  // Text-to-speech functionality (browser-based fallback)
  const speakText = (text) => {
    if (!text || typeof text !== "string") {
      console.error("Invalid text provided to speakText:", text);
      setIsSpeaking(false);
      return;
    }

    console.log(
      "Using browser TTS fallback for:",
      text.substring(0, 50) + "..."
    );

    // Force set speaking state
    setIsSpeaking(true);

    // Force stop listening
    if (recognitionRef.current && isListening) {
      stopListening();
    }

    // Make sure any existing speech is cancelled
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.error("Error cancelling speech synthesis:", e);
      }
    }

    // Give a moment for cancellation to take effect
    setTimeout(() => {
      if ("speechSynthesis" in window) {
        try {
          // Preprocess text to make it easier to speak
          text = text.replace(/\n/g, " ").trim();
          if (text.length > 1000) {
            text = text.substring(0, 1000) + "...";
            console.log("Text truncated for speech synthesis");
          }

          console.log("Creating utterance for browser TTS");

          // Create new utterance
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9; // Slightly slower for better clarity
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          // Set events
          utterance.onstart = () => {
            console.log("Browser TTS started");
            setIsSpeaking(true);
            // Double-check microphone is definitely off when TTS starts
            if (recognitionRef.current && isListening) {
              stopListening();
            }
          };

          utterance.onend = () => {
            console.log("Browser TTS ended");
            setIsSpeaking(false);
            // The useEffect will handle restarting the microphone after delay
          };

          utterance.onerror = (e) => {
            console.error("Browser TTS error:", e);
            setIsSpeaking(false);
          };

          // Store reference
          speechSynthesisRef.current = utterance;

          // Get voices (this might be async)
          let voices = window.speechSynthesis.getVoices();

          const selectVoiceAndSpeak = (voiceList) => {
            try {
              // Find a good English voice
              let selectedVoice = null;

              // First try to find a native English voice
              for (const voice of voiceList) {
                if (
                  (voice.lang === "en-US" || voice.lang === "en-GB") &&
                  !voice.localService
                ) {
                  selectedVoice = voice;
                  break;
                }
              }

              // If no remote voice found, try any English voice
              if (!selectedVoice) {
                for (const voice of voiceList) {
                  if (voice.lang.startsWith("en")) {
                    selectedVoice = voice;
                    break;
                  }
                }
              }

              // If still no voice, use the first available voice
              if (!selectedVoice && voiceList.length > 0) {
                selectedVoice = voiceList[0];
              }

              if (selectedVoice) {
                console.log(
                  "Using voice:",
                  selectedVoice.name,
                  selectedVoice.lang
                );
                utterance.voice = selectedVoice;
              } else {
                console.warn("No voices available for speech synthesis");
              }

              // Double check recognition is stopped
              if (recognitionRef.current && isListening) {
                stopListening();
              }

              // Speak
              console.log("Calling browser TTS speak()");
              window.speechSynthesis.speak(utterance);
            } catch (e) {
              console.error("Error in selectVoiceAndSpeak:", e);
              setIsSpeaking(false);
            }
          };

          if (voices.length === 0) {
            // If voices aren't loaded yet, wait for them
            window.speechSynthesis.onvoiceschanged = () => {
              voices = window.speechSynthesis.getVoices();
              selectVoiceAndSpeak(voices);
            };
          } else {
            // Voices are available, select and speak
            selectVoiceAndSpeak(voices);
          }
        } catch (e) {
          console.error("Error setting up browser TTS:", e);
          setIsSpeaking(false);
        }
      } else {
        console.error("Browser does not support speech synthesis");
        setIsSpeaking(false);
      }
    }, 300);
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

  const stopListening = () => {
    if (!recognitionRef.current) return;

    // Prevent rapid stop calls
    if (!isActionAllowed()) return;

    try {
      console.log("Stopping speech recognition");

      // First try to abort (more reliable way to stop)
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.log("Abort failed:", e);
      }

      // Then try to stop
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Stop failed:", e);
      }

      // Force state update
      setIsListening(false);
    } catch (e) {
      console.error("Error stopping speech recognition:", e);
      setIsListening(false);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;

    // Don't try to start if already listening
    if (isListening) {
      console.log("Already listening, not starting again");
      return;
    }

    // Don't start if AI is speaking
    if (isSpeaking) {
      console.log("AI is speaking, not starting microphone");
      return;
    }

    // Prevent rapid start calls
    if (!isActionAllowed()) return;

    // Make sure it's stopped first
    stopListening();

    // Longer delay to ensure it's fully stopped
    setTimeout(() => {
      try {
        console.log("Starting speech recognition");
        recognitionRef.current.start();
        console.log("Successfully started speech recognition");
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        // If we got "already started" error, need to recreate the object
        if (e.message && e.message.includes("already started")) {
          console.log("Recognition already started, recreating object");
          recreateSpeechRecognition();
        } else {
          setIsListening(false);
        }
      }
    }, 500);
  };

  // Extract the recreation logic to a separate function
  const recreateSpeechRecognition = () => {
    try {
      // Recreate recognition object
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      // Re-add event handlers
      recognitionRef.current.onresult = (event) => {
        const isFinal = event.results[event.results.length - 1].isFinal;
        const transcript =
          event.results[event.results.length - 1][0].transcript;
        setUserInput(transcript);
      };

      recognitionRef.current.onstart = () => {
        console.log("Recognition started");
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        console.log("Recognition ended");
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      console.log("Speech recognition object recreated");

      // Try starting again after a longer delay
      setTimeout(() => {
        try {
          if (!isSpeaking) {
            recognitionRef.current.start();
            console.log("Started recognition with new object");
          } else {
            console.log(
              "Not starting new recognition object because AI is speaking"
            );
          }
        } catch (err) {
          console.error("Failed to start recognition with new object:", err);
          setIsListening(false);
        }
      }, 1000);
    } catch (recreateError) {
      console.error("Failed to recreate recognition object:", recreateError);
      setIsListening(false);
    }
  };

  // Fixed toggle listening function
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    if (isSpeaking) {
      console.log("Cannot toggle microphone while AI is speaking");
      return;
    }

    console.log("Toggle listening called, current state:", isListening);

    if (isListening) {
      console.log("Toggling speech recognition OFF");
      stopListening();

      // Clear any silenceTimer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setSilenceCountdown(0);
    } else {
      console.log("Toggling speech recognition ON");

      // Clear input when starting fresh
      setUserInput("");

      // Start listening with a delay to ensure any previous instances are stopped
      setTimeout(() => {
        startListening();
      }, 300);
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

  // Modify our handleEndInterview function to properly work with existing endInterview function
  const handleEndInterview = () => {
    // Stop any ongoing speech
    stopSpeech();

    // Stop any ongoing speech recognition
    stopListening();

    // Clear any pending timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Call the existing endInterview function which handles confirmation
    // and API calls to end the interview
    endInterview();
  };

  // Add cleanup effect to ensure everything stops when component unmounts
  useEffect(() => {
    // Clean up function that runs when component unmounts
    return () => {
      console.log("Interview component unmounting - cleaning up all resources");

      // Stop any speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }

      // Stop any ongoing speech
      stopSpeech();

      // Clear any timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, []);

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
        <div className="flex items-center">
          <div className="mr-3 bg-blue-600 p-2 rounded-lg">
            <FaLaptopCode className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold">AI Interview</h1>
        </div>

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
                onClick={handleEndInterview}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center"
                disabled={!isInterviewStarted || isLoading || isEnding}
              >
                {isEnding ? "Ending..." : "End Interview"}
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
