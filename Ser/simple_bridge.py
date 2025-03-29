from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route('/', methods=['GET', 'OPTIONS'])
def index():
    # Add CORS headers
    response = jsonify({"message": "Simple ATS Bridge Server"})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

@app.route('/test', methods=['GET', 'OPTIONS'])
def test():
    # Add CORS headers
    response = jsonify({"status": "ok", "message": "CORS Test successful"})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

@app.route('/process', methods=['POST', 'OPTIONS'])
def process():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    # For now, return a mock response
    mock_result = {
        "match_score": "85",
        "missing_keywords": ["React Native", "Redux", "TypeScript"],
        "improvement_tips": ["Add more details about your React experience", "Include specific project metrics", "Highlight your team collaboration skills"]
    }
    
    response = jsonify(mock_result)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port) 