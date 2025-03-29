import os
import random
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Sample coding questions
QUESTIONS = [
    {
        "id": 1,
        "title": "Two Sum",
        "difficulty": "Easy",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
        "examples": [
            {
                "input": {"nums": [2, 7, 11, 15], "target": 9},
                "output": [0, 1],
                "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
            },
            {
                "input": {"nums": [3, 2, 4], "target": 6},
                "output": [1, 2],
                "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."
            },
            {
                "input": {"nums": [3, 3], "target": 6},
                "output": [0, 1],
                "explanation": "Because nums[0] + nums[1] == 6, we return [0, 1]."
            }
        ],
        "constraints": [
            "2 <= nums.length <= 104",
            "-109 <= nums[i] <= 109",
            "-109 <= target <= 109",
            "Only one valid answer exists."
        ],
        "function_signature": {
            "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}",
            "cpp": "#include <vector>\n\nclass Solution {\npublic:\n    std::vector<int> twoSum(std::vector<int>& nums, int target) {\n        // Your code here\n    }\n};",
            "python": "def two_sum(nums, target):\n    # Your code here\n    pass"
        }
    },
    {
        "id": 2,
        "title": "Palindrome Number",
        "difficulty": "Easy",
        "description": "Given an integer x, return true if x is a palindrome, and false otherwise. A palindrome is a number that reads the same backward as forward.",
        "examples": [
            {
                "input": {"x": 121},
                "output": True,
                "explanation": "121 reads as 121 from left to right and from right to left."
            },
            {
                "input": {"x": -121},
                "output": False,
                "explanation": "From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome."
            },
            {
                "input": {"x": 10},
                "output": False,
                "explanation": "Reads 01 from right to left. Therefore it is not a palindrome."
            }
        ],
        "constraints": [
            "-231 <= x <= 231 - 1"
        ],
        "function_signature": {
            "java": "class Solution {\n    public boolean isPalindrome(int x) {\n        // Your code here\n    }\n}",
            "cpp": "class Solution {\npublic:\n    bool isPalindrome(int x) {\n        // Your code here\n    }\n};",
            "python": "def is_palindrome(x):\n    # Your code here\n    pass"
        }
    },
    {
        "id": 3,
        "title": "Reverse String",
        "difficulty": "Easy",
        "description": "Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.",
        "examples": [
            {
                "input": {"s": ["h", "e", "l", "l", "o"]},
                "output": ["o", "l", "l", "e", "h"],
                "explanation": "Reverse the string 'hello' to get 'olleh'."
            },
            {
                "input": {"s": ["H", "a", "n", "n", "a", "h"]},
                "output": ["h", "a", "n", "n", "a", "H"],
                "explanation": "Reverse the string 'Hannah' to get 'hannaH'."
            }
        ],
        "constraints": [
            "1 <= s.length <= 105",
            "s[i] is a printable ascii character."
        ],
        "function_signature": {
            "java": "class Solution {\n    public void reverseString(char[] s) {\n        // Your code here\n    }\n}",
            "cpp": "#include <vector>\n\nclass Solution {\npublic:\n    void reverseString(std::vector<char>& s) {\n        // Your code here\n    }\n};",
            "python": "def reverse_string(s):\n    # Your code here\n    pass"
        }
    }
]

# Route to get a random question
@app.route('/api/get_question', methods=['GET'])
def get_question():
    question = random.choice(QUESTIONS)
    return jsonify(question)

# Route for running test cases (simplified for Vercel deployment)
@app.route('/api/run_test_case', methods=['POST'])
def run_test_case():
    data = request.json
    language = data.get('language')
    code = data.get('code')
    test_case = data.get('test_case')
    
    if not all([language, code, test_case]):
        return jsonify({"passed": False, "error": "Missing required parameters"}), 400
    
    # In serverless environment, we can't execute code
    # Return a mock response for demonstration purposes
    return jsonify({
        "passed": True,
        "actual_output": test_case.get('output'),
        "explanation": "Code execution is not supported in the serverless environment. This is a simulated response."
    })

# Route for submitting solutions (simplified for Vercel deployment)
@app.route('/api/submit_solution', methods=['POST'])
def submit_solution():
    data = request.json
    language = data.get('language')
    code = data.get('code')
    examples = data.get('examples')
    
    if not all([language, code, examples]):
        return jsonify({"success": False, "error": "Missing required parameters"}), 400
    
    # Mock response for Vercel deployment
    return jsonify({
        "success": True,
        "passed_tests": len(examples),
        "total_tests": len(examples),
        "test_results": [
            {
                "test_number": i+1,
                "passed": True,
                "input": example.get('input'),
                "expected_output": example.get('output'),
                "actual_output": example.get('output')
            } for i, example in enumerate(examples)
        ],
        "execution_time": 50,  # Mock time in ms
        "memory_usage": 2.5    # Mock memory in MB
    })

# Status endpoint for debugging
@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        'status': 'ok',
        'environment': os.environ.get('FLASK_ENV', 'production'),
    })

# Home route
@app.route('/')
def home():
    return "Coding Challenge Backend is running!"

# For local development
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True) 