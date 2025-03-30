from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
import google.generativeai as genai
import os
import json
import time
import tempfile
import PyPDF2
import docx2txt
import io
import uuid
from google.cloud import texttospeech

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Requests

# Configure Gemini API Key
genai.configure(api_key="AIzaSyDt0zEqI4kJPvA_LFPTBef5ZfWI-QoU5LA")  # Replace with actual API key

# Initialize Text-to-Speech client
tts_client = None
local_tts = None
using_cloud_tts = False

try:
    # First try Google Cloud TTS
    tts_client = texttospeech.TextToSpeechClient()
    print("Text-to-Speech client initialized successfully")
    using_cloud_tts = True
except Exception as e:
    print(f"Warning: Could not initialize Text-to-Speech client: {e}")
    tts_client = None
    
# Always try to initialize local TTS regardless of Google Cloud status
try:
    # Try to use pyttsx3 for local TTS
    import pyttsx3
    local_tts = pyttsx3.init()
    # Test if the engine works
    test_voices = local_tts.getProperty('voices')
    print(f"Local TTS initialized successfully with {len(test_voices)} voices")
    if not using_cloud_tts:
        print("Using local TTS as primary voice engine")
except Exception as local_e:
    print(f"Warning: Could not initialize local TTS: {local_e}")
    if not using_cloud_tts:
        print("No TTS systems available - voice functionality will not work")

# In-memory storage for interview sessions
active_sessions = {}

@app.route("/")
def home():
    return "Hello, World!"

# New function to generate audio stream instead of saving to file
def generate_speech_stream(text):
    """Generate speech audio from text and return as a byte stream"""
    if not text or not text.strip():
        print("Empty text provided for speech generation")
        return None
        
    # Preprocess text to make it easier to speak
    text = text.replace('\n', ' ').strip()
    text = text.replace('  ', ' ')  # Remove double spaces
    if len(text) > 3000:  # Limit very long text
        text = text[:3000] + "..."
        print(f"Text truncated to {len(text)} characters for speech generation")
    
    print(f"Generating speech for text: {text[:50]}...")
    
    # Try Google Cloud TTS first if available
    if using_cloud_tts and tts_client:
        try:
            print("Using Google Cloud TTS for speech generation")
            # Set the text input to be synthesized
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Build the voice request - try with a specific voice
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Standard-D",  # Specific voice name
                ssml_gender=texttospeech.SsmlVoiceGender.MALE
            )
            
            # Select the type of audio file returned
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.9,  # Slightly slower for better clarity
                pitch=0.0,          # Normal pitch
                volume_gain_db=0.0  # Normal volume
            )
            
            # Perform the text-to-speech request
            response = tts_client.synthesize_speech(
                input=synthesis_input, 
                voice=voice,
                audio_config=audio_config
            )
            
            if response and response.audio_content and len(response.audio_content) > 1000:
                print(f"Successfully generated speech with Google Cloud TTS ({len(response.audio_content)} bytes)")
                return response.audio_content
            else:
                print("Google Cloud TTS returned empty or too small audio content")
        except Exception as cloud_error:
            print(f"Cloud TTS error: {cloud_error}")
            # Fall back to local TTS
    
    # Use local TTS if available
    if local_tts:
        try:
            print("Using local TTS for speech generation")
            # Create a bytes IO object
            audio_bytes = io.BytesIO()
            
            # Configure speed
            local_tts.setProperty('rate', 150)  # Normal speaking rate
            
            # Try to set a good voice
            voices = local_tts.getProperty('voices')
            voice_set = False
            
            # First try to find a male voice
            for voice in voices:
                if 'male' in voice.name.lower():
                    print(f"Setting male voice: {voice.name}")
                    local_tts.setProperty('voice', voice.id)
                    voice_set = True
                    break
            
            # If no male voice found, try any English voice
            if not voice_set:
                for voice in voices:
                    if 'english' in voice.name.lower():
                        print(f"Setting English voice: {voice.name}")
                        local_tts.setProperty('voice', voice.id)
                        voice_set = True
                        break
            
            # Save synthesized speech to the BytesIO object
            local_tts.save_to_file(text, audio_bytes)
            local_tts.runAndWait()
            
            # Get the audio data
            audio_bytes.seek(0)
            audio_data = audio_bytes.getvalue()
            
            if audio_data and len(audio_data) > 1000:  # Make sure we have meaningful data (more than 1KB)
                print(f"Successfully generated speech with local TTS ({len(audio_data)} bytes)")
                return audio_data
            else:
                print("Local TTS generated empty or too small audio data")
        except Exception as local_error:
            print(f"Local TTS error: {local_error}")
    
    print("Falling back to browser speech synthesis - sending empty audio")
    
    # Instead of generating a beep, return a specially crafted response that signals
    # to the client to use browser TTS
    return None

# New endpoint to stream audio directly
@app.route('/stream_audio', methods=['POST'])
def stream_audio():
    """Stream audio directly without saving to file"""
    try:
        data = request.json
        text = data.get('text')
        
        if not text:
            return jsonify({"error": "Missing text parameter"}), 400
        
        # Check if text is too long or complex for server TTS
        if len(text) > 1500 or text.count('.') > 15:
            print(f"Text is too long or complex for server TTS ({len(text)} chars, {text.count('.')} sentences). Falling back to browser TTS")
            return jsonify({
                "use_browser_tts": True,
                "text": text
            }), 200
        
        # Check for browser platform from request headers
        user_agent = request.headers.get('User-Agent', '').lower()
        # Some browsers have better built-in TTS than others
        if 'chrome' in user_agent and 'android' not in user_agent:
            # Chrome on desktop has excellent TTS, prefer it over server TTS
            print("Chrome browser detected, using browser TTS for better quality")
            return jsonify({
                "use_browser_tts": True,
                "text": text
            }), 200
        
        # Proceed with server-side TTS
        audio_content = generate_speech_stream(text)
        
        if audio_content:
            return Response(
                audio_content,
                mimetype='audio/mpeg',
                headers={
                    'Content-Disposition': 'inline',
                    'Content-Type': 'audio/mpeg',
                    'Cache-Control': 'no-cache'
                }
            )
        else:
            # If we couldn't generate audio, tell the client to use browser TTS
            print("Failed to generate speech, falling back to browser TTS")
            return jsonify({
                "use_browser_tts": True,
                "text": text
            }), 200
    except Exception as e:
        print(f"Error in stream_audio endpoint: {e}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"use_browser_tts": True, "text": data.get('text')}), 200
    
@app.route('/start_interview', methods=['POST'])
def start_interview():
    """Start a new interview session by processing resume and candidate info"""
    try:
        # Get candidate name from form data
        name = request.form.get('name', 'Candidate')
        
        # Voice mode is always enabled (ignore client setting)
        voice_mode = True
        
        # Get resume file
        resume_file = request.files.get('resume')
        resume_text = ""
        
        if resume_file:
            temp_file_path = None
            try:
                print(f"Processing resume file: {resume_file.filename}, {resume_file.content_type}")
                
                # Create a temporary file to store the resume
                temp_file_handle, temp_file_path = tempfile.mkstemp(suffix=os.path.splitext(resume_file.filename)[1])
                os.close(temp_file_handle)  # Close the file handle immediately
                
                print(f"Created temporary file: {temp_file_path}")
                
                # Save the uploaded file to the temporary file
                resume_file.save(temp_file_path)
                print(f"Saved uploaded file to temporary location")
                
                # Extract text based on file type
                file_extension = os.path.splitext(resume_file.filename)[1].lower()
                print(f"Detected file extension: {file_extension}")
                
                if file_extension == '.pdf':
                    # Extract text from PDF
                    try:
                        with open(temp_file_path, 'rb') as file:
                            pdf_reader = PyPDF2.PdfReader(file)
                            for page in pdf_reader.pages:
                                resume_text += page.extract_text()
                    except Exception as pdf_error:
                        print(f"Error reading PDF: {pdf_error}")
                        resume_text = f"Error extracting text from PDF: {pdf_error}"
                
                elif file_extension in ['.docx', '.doc']:
                    # Extract text from Word document
                    try:
                        resume_text = docx2txt.process(temp_file_path)
                    except Exception as doc_error:
                        print(f"Error reading DOC/DOCX: {doc_error}")
                        resume_text = f"Error extracting text from document: {doc_error}"
                
                elif file_extension in ['.txt', '.rtf']:
                    # Read plain text file
                    try:
                        with open(temp_file_path, 'r', encoding='utf-8') as file:
                            resume_text = file.read()
                    except Exception as txt_error:
                        print(f"Error reading text file: {txt_error}")
                        resume_text = f"Error extracting text from file: {txt_error}"
                
            except Exception as file_error:
                print(f"Error processing resume file: {file_error}")
                resume_text = f"Error processing resume: {file_error}"
            
            finally:
                # Clean up the temporary file in the finally block to ensure it always happens
                if temp_file_path and os.path.exists(temp_file_path):
                    try:
                        os.unlink(temp_file_path)
                    except Exception as delete_error:
                        print(f"Warning: Could not delete temporary file {temp_file_path}: {delete_error}")
        
        # Create a new session ID
        session_id = f"interview_{int(time.time())}"
        
        # Initialize the interview with Gemini
        interview_intro = initialize_interview(name, resume_text)
        
        # Create session data
        session_data = {
            "session_id": session_id,
            "candidate_name": name,
            "resume_text": resume_text,
            "voice_mode": voice_mode,
            "conversation": [
                {"role": "system", "content": "Interview Started"},
                {"role": "assistant", "content": interview_intro}
            ],
            "skills_assessment": {},
            "timestamp": time.time()
        }
        
        # Store session in memory
        active_sessions[session_id] = session_data
        
        response_data = {
            "success": True,
            "session_id": session_id,
            "message": interview_intro
        }
        
        # Add text for audio generation instead of audio URL
        if voice_mode:
            response_data["text_for_audio"] = interview_intro
        
        return jsonify(response_data)
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error starting interview: {e}")
        print(f"Detailed error: {error_details}")
        return jsonify({
            "success": False,
            "error": str(e),
            "details": error_details
        }), 500

@app.route('/interview_response', methods=['POST'])
def interview_response():
    """Process candidate's response and continue the interview"""
    data = request.json
    session_id = data.get('session_id')
    user_message = data.get('message')
    
    if not session_id or not user_message:
        return jsonify({"error": "Missing session_id or message"}), 400
    
    try:
        # Get session from memory
        session_data = active_sessions.get(session_id)
        if not session_data:
            return jsonify({"error": "Session not found"}), 404
        
        # Check if voice mode is enabled
        voice_mode = session_data.get('voice_mode', False)
        
        # Update conversation history
        session_data["conversation"].append({"role": "user", "content": user_message})
        
        # Get AI response
        ai_response = get_next_interview_question(session_data)
        
        # Update conversation with AI response
        session_data["conversation"].append({"role": "assistant", "content": ai_response})
        
        # Update the session in memory
        active_sessions[session_id] = session_data
        
        response_data = {
            "success": True,
            "message": ai_response
        }
        
        # Add text for audio generation instead of audio URL
        if voice_mode:
            response_data["text_for_audio"] = ai_response
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error processing response: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/get_session_data', methods=['GET'])
def get_session_data():
    """Get session data by ID"""
    session_id = request.args.get('session_id')
    
    if not session_id:
        return jsonify({"error": "Missing session_id parameter"}), 400
        
    session_data = active_sessions.get(session_id)
    
    if not session_data:
        return jsonify({"error": "Session not found"}), 404
        
    return jsonify({
        "success": True,
        "session_data": session_data
    })

@app.route('/end_interview', methods=['POST'])
def end_interview():
    """End the interview and provide final assessment"""
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({"error": "Missing session_id"}), 400
        
    # Get session from memory
    session_data = active_sessions.get(session_id)
    if not session_data:
        return jsonify({"error": "Session not found"}), 404
    
    try:
        # Generate final assessment
        assessment = generate_assessment(session_data)
        
        # Add assessment to session data
        session_data["assessment"] = assessment
        session_data["ended_at"] = time.time()
        
        # Update in memory
        active_sessions[session_id] = session_data
        
        return jsonify({
            "success": True,
            "assessment": assessment
        })
    except Exception as e:
        print(f"Error ending interview: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/speech_to_text', methods=['POST'])
def speech_to_text():
    """Process audio and convert to text (placeholder)"""
    return jsonify({
        "success": True,
        "text": "Speech recognition not implemented in this version"
    })

def initialize_interview(candidate_name, resume_text=""):
    """Initialize the interview with Gemini"""
    try:
        # Configure the model
        model = genai.GenerativeModel(
            model_name="gemini-pro",
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 64,
                "max_output_tokens": 8192,
            }
        )
        
        # Create the prompt
        prompt = f"""
You are an expert AI technical interviewer for a software engineering position. Your task is to conduct a professional, fair, and thorough technical interview with a candidate named {candidate_name}.

Your goal is to assess the candidate's technical skills, problem-solving abilities, and communication effectiveness through a friendly but challenging interview format.

Please begin by:
1. Introducing yourself as an AI Technical Interviewer
2. Explaining that you will be asking a series of technical questions
3. Asking an initial question about the candidate's technical background or interests
4. Keeping your questions and responses concise and focused

If a resume was provided, base your questions on the candidate's experience and skills mentioned in the resume. 

Resume content:
{resume_text if resume_text else "No resume provided. Ask general technical questions appropriate for a software engineering position."}

Remember to:
- Ask one question at a time
- Keep your responses conversational but professional
- Focus on technical content rather than personality assessment
- Provide helpful guidance if the candidate struggles, but don't give away answers
- Maintain a respectful and supportive tone throughout the interview
"""

        # Generate the response
        completion = model.generate_content(prompt)
        
        # Parse the response
        initial_message = completion.text
        
        print(f"Generated initial message: {initial_message[:100]}...")
        return initial_message
        
    except Exception as e:
        print(f"Error initializing interview: {e}")
        return "Hello! I'm your AI interviewer. Let's begin with a simple question: Could you tell me about your technical background and experience?"

def get_next_interview_question(session_data):
    """Generate the next interview question based on the conversation history"""
    try:
        # Configure the model
        model = genai.GenerativeModel(
            model_name="gemini-pro",
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 64,
                "max_output_tokens": 8192,
            }
        )
        
        # Extract conversation history
        conversation = session_data.get("conversation", [])
        candidate_name = session_data.get("candidate_name", "Candidate")
        
        # Create context from previous messages (up to last 10 messages to stay within context limits)
        context = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}" 
            for msg in conversation[-10:]
        ])
        
        # Create the prompt for the next question
        prompt = f"""
You are an expert AI technical interviewer for a software engineering position. You are currently interviewing {candidate_name}.

Here is the conversation so far:

{context}

Please provide your next response as the interviewer. Your response should:
1. Acknowledge the candidate's last answer with brief feedback
2. Ask a follow-up question OR move to a new relevant technical topic
3. Keep your response conversational, concise, and focused on technical assessment
4. Be encouraging but also challenging to assess the candidate's knowledge

Remember to:
- Ask only one question at a time
- Be specific in your questions rather than being vague
- Maintain a professional and supportive tone
- Focus on technical skills assessment rather than personality
"""

        # Generate the response
        completion = model.generate_content(prompt)
        
        # Parse the response
        next_question = completion.text
        
        print(f"Generated next question: {next_question[:100]}...")
        return next_question
        
    except Exception as e:
        print(f"Error generating next question: {e}")
        return "That's interesting. Could you tell me more about how you've applied these skills in your projects or work experience?"

def generate_assessment(session_data):
    """Generate an assessment of the candidate based on the interview"""
    try:
        # Configure the model
        model = genai.GenerativeModel(
            model_name="gemini-pro",
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 64,
                "max_output_tokens": 8192,
            }
        )
        
        # Extract conversation history
        conversation = session_data.get("conversation", [])
        candidate_name = session_data.get("candidate_name", "Candidate")
        
        # Create context from all messages
        context = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}" 
            for msg in conversation
        ])
        
        # Create the prompt for assessment
        prompt = f"""
You are an expert AI technical interviewer who has just completed an interview with a software engineering candidate named {candidate_name}.

Here is the full interview conversation:

{context}

Please provide a comprehensive assessment of the candidate's performance in the following format:

1. Overall Assessment: A brief 1-2 paragraph summary of the candidate's interview performance

2. Technical Skills: Evaluate technical knowledge, with specific examples from the interview
   - Strengths: List 3-5 technical strengths demonstrated
   - Areas for Improvement: List 2-3 areas where technical knowledge could be improved

3. Problem Solving: Evaluate how effectively the candidate approached problems
   - Logical Reasoning: Rate 1-10 with justification
   - Creativity: Rate 1-10 with justification

4. Communication: Evaluate how clearly the candidate expressed technical concepts
   - Clarity: Rate 1-10 with justification
   - Conciseness: Rate 1-10 with justification

5. Overall Rating: Provide a numerical rating from 1-10 with brief justification

6. Hiring Recommendation: Recommend "Hire", "Consider with reservations", or "Do not hire" with brief explanation

Please be fair, objective, and specific in your assessment, basing all evaluations on concrete examples from the interview.
"""

        # Generate the response
        completion = model.generate_content(prompt)
        
        # Parse the response
        assessment = completion.text
        
        print(f"Generated assessment: {assessment[:100]}...")
        return assessment
        
    except Exception as e:
        print(f"Error generating assessment: {e}")
        return "Assessment could not be generated due to an error. Please try again."

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)