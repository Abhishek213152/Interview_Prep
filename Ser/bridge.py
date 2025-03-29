import os
import logging
import google.generativeai as genai
import pdfminer.high_level
import docx2txt
import re
import tempfile
import traceback
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask App
app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable CORS for all origins - very permissive
CORS(app, supports_credentials=False, origins="*", allow_headers=["Content-Type", "Authorization"], 
     methods=["GET", "POST", "OPTIONS"])

# Configure Google Gemini API Key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyDt0zEqI4kJPvA_LFPTBef5ZfWI-QoU5LA")
genai.configure(api_key=GEMINI_API_KEY)

# Extract text from PDF
def extract_text_from_pdf(pdf_path):
    return pdfminer.high_level.extract_text(pdf_path)

# Extract text from DOCX
def extract_text_from_docx(docx_path):
    return docx2txt.process(docx_path)

# Analyze with Gemini
def analyze_resume(resume_text, job_description):
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
        logger.info(f"Gemini API response: {response_text}")
        
        # Extract info from response
        match = re.search(r'(\d+)%', response_text)
        match_score = match.group(1) if match else "N/A"
        
        match = re.search(r'Missing Keywords: (.*)', response_text)
        missing_keywords = match.group(1).split(", ") if match else []
        
        match = re.search(r'Improvement Tips:\s*(.*)', response_text)
        improvement_tips = match.group(1).split(", ") if match else ["No improvement suggestions available."]
        
        return match_score, missing_keywords, improvement_tips
    except Exception as e:
        logger.error(f"Error with Gemini API: {e}")
        logger.error(traceback.format_exc())
        return "Error", [], [f"Failed to process resume analysis: {str(e)}"]

# Home route
@app.route('/')
def home():
    return "Resume ATS Bridge Server"

# Test route
@app.route('/test', methods=['GET'])
@cross_origin()
def test():
    return jsonify({"status": "ok", "message": "CORS Test successful"})

# Process resume
@app.route('/process', methods=['POST', 'OPTIONS'])
@cross_origin()
def process():
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Max-Age', '86400')
        return response
    
    logger.info("Request received at /process endpoint")
    logger.info(f"Request headers: {request.headers}")
    logger.info(f"Request files: {request.files}")
    logger.info(f"Request form: {request.form}")
    
    try:
        if 'resume' not in request.files:
            logger.error("No resume file in request")
            return jsonify({"error": "Missing resume file"}), 400
            
        if 'job_description' not in request.form:
            logger.error("No job description in request")
            return jsonify({"error": "Missing job description"}), 400
        
        resume_file = request.files['resume']
        job_description = request.form['job_description']
        
        logger.info(f"Resume filename: {resume_file.filename}")
        logger.info(f"Job description: {job_description[:50]}...")
        
        if resume_file.filename == '':
            logger.error("Empty filename")
            return jsonify({"error": "No file selected"}), 400
        
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(resume_file.filename)[1]) as temp:
            resume_file.save(temp.name)
            temp_path = temp.name
            logger.info(f"Saved resume to temporary file: {temp_path}")
        
        try:
            # Extract text
            if resume_file.filename.lower().endswith('.pdf'):
                logger.info("Extracting text from PDF")
                resume_text = extract_text_from_pdf(temp_path)
                logger.info(f"Extracted text length: {len(resume_text)}")
            elif resume_file.filename.lower().endswith('.docx'):
                logger.info("Extracting text from DOCX")
                resume_text = extract_text_from_docx(temp_path)
                logger.info(f"Extracted text length: {len(resume_text)}")
            else:
                logger.error(f"Unsupported file type: {resume_file.filename}")
                return jsonify({"error": "Unsupported file type"}), 400
            
            # Analyze resume
            logger.info("Analyzing resume with Gemini")
            match_score, missing_keywords, improvement_tips = analyze_resume(resume_text, job_description)
            logger.info(f"Analysis complete: Match score = {match_score}")
            
            # Return results
            result = {
                "match_score": match_score,
                "missing_keywords": missing_keywords,
                "improvement_tips": improvement_tips
            }
            
            logger.info(f"Sending response: {result}")
            
            response = jsonify(result)
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Content-Type', 'application/json')
            return response
            
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
                logger.info(f"Deleted temporary file: {temp_path}")
            except Exception as e:
                logger.error(f"Error cleaning up temporary file: {e}")
                
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        response = jsonify({"error": f"An error occurred: {str(e)}"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Content-Type', 'application/json')
        return response, 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True) 