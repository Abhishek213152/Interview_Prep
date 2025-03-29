import os
import logging
import google.generativeai as genai
import pdfminer.high_level
import docx2txt
import re
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from dotenv import load_dotenv
import tempfile

# Load environment variables
load_dotenv()

# ✅ Initialize Flask App
app = Flask(__name__)

# Simple CORS configuration that allows all origins
CORS(app, resources={r"/*": {"origins": "*"}})

# ✅ Configure Google Gemini API Key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyDt0zEqI4kJPvA_LFPTBef5ZfWI-QoU5LA")
genai.configure(api_key=GEMINI_API_KEY)

# ✅ Setup Logging for Debugging
logging.basicConfig(level=logging.INFO)

# ✅ Resume Text Extraction Functions
def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF resume."""
    return pdfminer.high_level.extract_text(pdf_path)

def extract_text_from_docx(docx_path):
    """Extract text from a DOCX resume."""
    return docx2txt.process(docx_path)

# ✅ Helper Functions for Extracting Information from API Response
def extract_percentage(text):
    """Extract ATS match percentage from the response."""
    match = re.search(r'(\d+)%', text)
    return match.group(1) if match else "N/A"

def extract_missing_keywords(text):
    """Extract missing keywords from the response."""
    match = re.search(r'Missing Keywords: (.*)', text)
    return match.group(1).split(", ") if match else []

def extract_improvement_tips(text):
    """Extract improvement tips from the response."""
    match = re.search(r'Improvement Tips:\s*(.*)', text)
    return match.group(1).split(", ") if match else ["No improvement suggestions available."]

# ✅ Function to Analyze Resume with Google Gemini API
def analyze_resume_with_gemini(resume_text, job_description):
    """Analyze resume using Google Gemini API and extract ATS score, missing keywords, and improvement tips."""
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = """
    You are an ATS (Applicant Tracking System) expert. Compare the resume with the job description.
    1. Provide a percentage match as 'Match Score: XX%'.
    2. List missing keywords as 'Missing Keywords: keyword1, keyword2, keyword3'.
    3. Suggest 3-5 improvements as 'Improvement Tips: tip1, tip2, tip3'.
    Only provide these three points in your response.
    """

    try:
        response = model.generate_content([prompt, resume_text, job_description])
        response_text = response.text

        # ✅ Extract ATS match score, missing keywords, and improvement tips
        match_score = extract_percentage(response_text)
        missing_keywords = extract_missing_keywords(response_text)
        improvement_tips = extract_improvement_tips(response_text)

        return match_score, missing_keywords, improvement_tips

    except Exception as e:
        logging.error(f"Error with Gemini API: {e}")
        return "Error", [], ["Failed to process resume analysis."]

# ✅ Home Route
@app.route('/')
def home():
    return "Hello, ATS system is running!"

# ✅ Status endpoint for debugging
@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        'status': 'ok',
        'environment': os.environ.get('FLASK_ENV', 'production'),
        'api_key_configured': bool(GEMINI_API_KEY),
        'cors_enabled': True
    })

# ✅ CORS preflight route
@app.route('/process_resume', methods=['OPTIONS'])
def handle_options():
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.add('Access-Control-Max-Age', '86400')
    return response

# ✅ Resume Processing API
@app.route('/process_resume', methods=['POST'])
def process_resume():
    try:
        # Add CORS headers to the response
        if request.method == 'OPTIONS':
            return handle_options()
            
        # ✅ Debug logging
        logging.info("Request received for process_resume")
        logging.info(f"Files: {request.files}")
        logging.info(f"Form data: {request.form}")
        logging.info(f"Headers: {request.headers}")
        logging.info(f"Content Type: {request.content_type}")
        
        # ✅ Validate Request
        if 'resume' not in request.files or 'job_description' not in request.form:
            logging.error("Missing resume or job description")
            return jsonify({'error': 'Missing resume or job description'}), 400

        resume_file = request.files['resume']
        job_description = request.form['job_description']

        # ✅ Validate File Selection
        if resume_file.filename == '':
            logging.error("No file selected")
            return jsonify({'error': 'No file selected'}), 400

        # ✅ Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(resume_file.filename)[1]) as temp_file:
            resume_file.save(temp_file.name)
            temp_path = temp_file.name

        try:
            # ✅ Extract Resume Text
            if resume_file.filename.endswith(".pdf"):
                resume_text = extract_text_from_pdf(temp_path)
            elif resume_file.filename.endswith(".docx"):
                resume_text = extract_text_from_docx(temp_path)
            else:
                logging.error(f"Unsupported file type: {resume_file.filename}")
                return jsonify({'error': 'Unsupported file type'}), 400

            # ✅ Analyze Resume with Gemini API
            match_score, missing_keywords, improvement_tips = analyze_resume_with_gemini(resume_text, job_description)

            # ✅ Return the Analysis Results
            result = {
                'match_score': match_score,
                'missing_keywords': missing_keywords,
                'improvement_tips': improvement_tips
            }
            logging.info(f"Analysis result: {result}")
            
            response = jsonify(result)
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response

        finally:
            # Clean up the temporary file
            try:
                os.unlink(temp_path)
            except Exception as e:
                logging.error(f"Error cleaning up temporary file: {e}")

    except Exception as e:
        logging.error(f"Error processing resume: {e}")
        response = jsonify({'error': f'An error occurred: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# ✅ Run Flask App
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
