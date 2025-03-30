from flask import Flask, jsonify, request
from flask_cors import CORS
import google.generativeai as genai
import re
import json
import os
import random
import hashlib
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Requests

# Configure Gemini API Key
api_key = os.environ.get("GEMINI_API_KEY", "AIzaSyDt0zEqI4kJPvA_LFPTBef5ZfWI-QoU5LA")
genai.configure(api_key=api_key)

# Check if running on Vercel (serverless environment)
is_vercel = os.environ.get("VERCEL") == "1"

# Set cache directory based on environment
# Use /tmp directory if on Vercel (serverless)
if is_vercel:
    CACHE_DIR = "/tmp/question_cache"
else:
    CACHE_DIR = "question_cache"

os.makedirs(CACHE_DIR, exist_ok=True)

# File to store the history of served questions
HISTORY_FILE = os.path.join(CACHE_DIR, "question_history.json")

# Root endpoint for health check
@app.route('/')
def home():
    return jsonify({
        "status": "running",
        "service": "AI Coding Questions API",
        "version": "1.0.0",
        "environment": "Vercel" if is_vercel else "Local"
    })

# Initialize question history
def get_question_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    else:
        return {"served_questions": []}

def update_question_history(question_id):
    history = get_question_history()
    history["served_questions"].append(question_id)
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f)

def parse_question_response(text):
    """
    Parse the raw text response from Gemini into a structured format
    """
    # Initialize the structured data
    structured_data = {
        "title": "Random DSA Problem",
        "difficulty": "Easy",
        "description": "",
        "examples": [],
        "constraints": [],
        "function_signature": {
            "java": "// Add your solution here",
            "cpp": "// Add your solution here",
            "python": "# Add your solution here"
        }
    }
    
    # Extract the title if present
    title_match = re.search(r"Title:(.*?)(?=\n|$)", text, re.DOTALL)
    if title_match:
        structured_data["title"] = title_match.group(1).strip()
    
    # Extract difficulty if present
    difficulty_match = re.search(r"Difficulty:(.*?)(?=\n|$)", text, re.DOTALL)
    if difficulty_match:
        difficulty = difficulty_match.group(1).strip().lower()
        if difficulty in ["easy", "medium", "hard"]:
            structured_data["difficulty"] = difficulty.capitalize()
    
    # Extract the main question
    question_match = re.search(r"Question:(.*?)(?=Example Test Cases:|$)", text, re.DOTALL)
    if question_match:
        structured_data["description"] = question_match.group(1).strip()
    
    # Extract test cases
    test_cases_pattern = r"(\d+)\.\s+Input:(.*?)Output:(.*?)(?:Explanation:(.*?))?(?=\d+\.\s+Input:|$)"
    test_cases = re.findall(test_cases_pattern, text, re.DOTALL)
    
    for test_case in test_cases:
        case_num, input_text, output_text, explanation = [item.strip() for item in test_case]
        
        structured_data["examples"].append({
            "input": input_text,
            "output": output_text,
            "explanation": explanation if explanation else None
        })
    
    # Extract any constraints if they exist
    constraints_match = re.search(r"Constraints:(.*?)(?=\n\n|$)", text, re.DOTALL)
    if constraints_match:
        constraints_text = constraints_match.group(1).strip()
        structured_data["constraints"] = [constraint.strip() for constraint in constraints_text.split('\n') if constraint.strip()]
    
    # Generate function signatures
    structured_data["function_signature"] = generate_function_signatures(structured_data["description"])
    
    # Generate a unique ID for this question based on its description
    structured_data["id"] = hashlib.md5(structured_data["description"].encode()).hexdigest()
    
    return structured_data

def generate_function_signatures(description):
    """
    Generate appropriate function signatures based on the problem description.
    """
    # Using Gemini to generate appropriate function signatures
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"""
    Based on this problem description:
    "{description}"
    
    Generate appropriate function signatures for:
    1. Java
    2. C++
    3. Python
    
    Format the response as JSON:
    {{
        "java": "public <type> <functionName>(<params>) {{ // Your code here }}",
        "cpp": "<type> <functionName>(<params>) {{ // Your code here }}",
        "python": "def <function_name>(<params>): # Your code here\\n    pass"
    }}
    
    Only return the JSON, nothing else.
    """
    
    try:
        response = model.generate_content(prompt)
        # Clean up the response text before parsing as JSON
        clean_text = response.text.strip()
        # Handle potential code blocks in the response
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        
        clean_text = clean_text.strip()
        signatures = json.loads(clean_text)
        return signatures
    except Exception as e:
        print(f"Error generating function signatures: {e}")
        # Return default signatures if there's an error
        return {
            "java": "public void solution() {\n    // Add your solution here\n}",
            "cpp": "void solution() {\n    // Add your solution here\n}",
            "python": "def solution():\n    # Add your solution here\n    pass"
        }


def get_random_problem(difficulty="easy"):
    """Fetches a random DSA question from Gemini API with specified difficulty and ensures diversity."""
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    # Get recent questions to avoid repetition
    history = get_question_history()
    recent_ids = set(history.get("served_questions", [])[-10:])  # Only consider last 10 questions
    
    # Get category information from history to ensure diversity
    category_history = get_category_history()
    recent_categories = category_history.get("recent_categories", [])[-5:]  # Last 5 categories
    
    # Explicitly avoid the most recent category
    avoid_category = recent_categories[-1] if recent_categories else None
    
    # Choose a random topic/category that's different from recent ones
    dsa_categories = [
        "arrays", "strings", "linked lists", "stacks", "queues", 
        "trees", "graphs", "dynamic programming", "greedy", 
        "binary search", "sorting", "recursion", "backtracking", 
        "hashing", "two pointers", "sliding window", "bit manipulation"
    ]
    
    # Filter out recently used categories
    available_categories = [cat for cat in dsa_categories if cat not in recent_categories]
    
    # If we've exhausted all categories, just avoid the most recent one
    if not available_categories:
        available_categories = [cat for cat in dsa_categories if cat != avoid_category]
    
    selected_category = random.choice(available_categories)
    
    # Add a random seed to ensure uniqueness
    random_seed = random.randint(1, 10000)
    
    # Prompt to get a question with test cases and explanations
    prompt = f"""
    Generate a completely new and unique {difficulty}-level DSA question specifically on the topic of {selected_category}.
    Make the question original and distinctly different from any typical or common problems in this category.
    Use this random seed: {random_seed} to ensure uniqueness.
    
    The output should be formatted as:
    
    Title: <A Descriptive Title>
    Difficulty: {difficulty.capitalize()}
    Category: {selected_category}
    
    Question: <Problem Statement>
    
    Example Test Cases:

    1. Input: <Example Input>
       Output: <Expected Output>
       Explanation: <Step-by-step explanation>
    
    2. Input: <Another Example Input>
       Output: <Expected Output>
       Explanation: <Step-by-step explanation>
    
    Constraints:
    - List any constraints on input values
    - Time/space complexity requirements
    """

    try:
        response = model.generate_content(prompt)
        
        if response:
            # Parse the raw text response into structured data
            structured_data = parse_question_response(response.text)
            
            # Add category information
            structured_data["category"] = selected_category
            
            # Check if this question (or a very similar one) has been seen recently
            if structured_data["id"] in recent_ids:
                # Try again with a different seed
                time.sleep(0.5)  # Small delay to avoid rate limiting
                return get_random_problem(difficulty)
            
            # Save this question to cache for future use
            question_file = os.path.join(CACHE_DIR, f"gemini_{structured_data['id']}.json")
            with open(question_file, 'w') as f:
                json.dump(structured_data, f)
            
            # Update the history
            update_question_history(structured_data["id"])
            
            # Update category history
            update_category_history(selected_category)
                
            return structured_data
    except Exception as e:
        print(f"Error fetching question from Gemini: {e}")
    
    # Fallback question with category
    fallback_id = f"fallback_{int(time.time())}"
    fallback_category = random.choice([cat for cat in dsa_categories if cat != avoid_category])
    
    fallback = {
        "id": fallback_id,
        "title": f"{fallback_category.title()} Problem",
        "difficulty": difficulty.capitalize(),
        "category": fallback_category,
        "description": generate_fallback_description(fallback_category),
        "examples": generate_fallback_examples(fallback_category),
        "constraints": ["1 ≤ array length ≤ 100", "-1000 ≤ array[i] ≤ 1000"],
        "function_signature": generate_fallback_signatures(fallback_category)
    }
    
    # Save fallback and update history
    fallback_file = os.path.join(CACHE_DIR, f"fallback_{fallback_id}.json")
    with open(fallback_file, 'w') as f:
        json.dump(fallback, f)
    update_question_history(fallback_id)
    update_category_history(fallback_category)
    
    return fallback

def generate_fallback_description(category):
    """Generate a fallback description based on the category"""
    descriptions = {
        "arrays": "Given an array of integers, find the subarray with the maximum sum.",
        "strings": "Given a string, find the longest substring without repeating characters.",
        "linked lists": "Reverse a linked list in-place and return the new head.",
        "stacks": "Implement a stack that supports push, pop, top, and retrieving the minimum element in constant time.",
        "queues": "Implement a circular queue with basic operations.",
        "trees": "Find the maximum depth of a binary tree.",
        "graphs": "Determine if there is a path between two nodes in an undirected graph.",
        "dynamic programming": "Calculate the maximum sum path in a triangle grid.",
        "greedy": "Find the minimum number of coins needed to make a specific amount.",
        "binary search": "Find the position of a target value in a sorted array.",
        "sorting": "Implement the merge sort algorithm for an array of integers.",
        "recursion": "Generate all possible combinations of k numbers from 1 to n.",
        "backtracking": "Solve the N-Queens problem for a given board size.",
        "hashing": "Find the most frequent element in an array.",
        "two pointers": "Find all pairs in an array that sum to a given target.",
        "sliding window": "Find the smallest subarray with a sum greater than or equal to a given value.",
        "bit manipulation": "Count the number of bits that need to be flipped to convert one number to another."
    }
    return descriptions.get(category, "Solve the given data structures problem.")

def generate_fallback_examples(category):
    """Generate appropriate examples based on the category"""
    if category == "arrays":
        return [
            {
                "input": "[-2, 1, -3, 4, -1, 2, 1, -5, 4]",
                "output": "6",
                "explanation": "The subarray [4, -1, 2, 1] has the maximum sum of 6."
            }
        ]
    elif category == "strings":
        return [
            {
                "input": "\"abcabcbb\"",
                "output": "3",
                "explanation": "The longest substring without repeating characters is \"abc\"."
            }
        ]
    # Add more category-specific examples...
    else:
        return [
            {
                "input": "[Sample input for " + category + "]",
                "output": "[Expected output]",
                "explanation": "Explanation of the result."
            }
        ]

def generate_fallback_signatures(category):
    """Generate appropriate function signatures based on the category"""
    if category == "arrays":
        return {
            "java": "public int maxSubArray(int[] nums) {\n    // Add your solution here\n}",
            "cpp": "int maxSubArray(vector<int>& nums) {\n    // Add your solution here\n}",
            "python": "def max_sub_array(nums):\n    # Add your solution here\n    pass"
        }
    elif category == "strings":
        return {
            "java": "public int lengthOfLongestSubstring(String s) {\n    // Add your solution here\n}",
            "cpp": "int lengthOfLongestSubstring(string s) {\n    // Add your solution here\n}",
            "python": "def length_of_longest_substring(s):\n    # Add your solution here\n    pass"
        }
    # Add more category-specific signatures...
    else:
        return {
            "java": f"public Object solve{category.replace(' ', '')}Problem(Object input) {{\n    // Add your solution here\n}}",
            "cpp": f"auto solve{category.replace(' ', '')}Problem(auto input) {{\n    // Add your solution here\n}}",
            "python": f"def solve_{category.replace(' ', '_')}_problem(input):\n    # Add your solution here\n    pass"
        }

# Add these functions to track category history
def get_category_history():
    """Get the history of categories that have been served"""
    category_file = os.path.join(CACHE_DIR, "category_history.json")
    if os.path.exists(category_file):
        with open(category_file, 'r') as f:
            return json.load(f)
    else:
        return {"recent_categories": []}

def update_category_history(category):
    """Update the history of categories with the most recent one"""
    category_file = os.path.join(CACHE_DIR, "category_history.json")
    history = get_category_history()
    
    # Add the new category
    history["recent_categories"].append(category)
    
    # Keep only the last 10 categories
    if len(history["recent_categories"]) > 10:
        history["recent_categories"] = history["recent_categories"][-10:]
    
    with open(category_file, 'w') as f:
        json.dump(history, f)

# Modify parse_question_response to include category
def parse_question_response(text):
    """
    Parse the raw text response from Gemini into a structured format
    """
    # Initialize the structured data
    structured_data = {
        "title": "Random DSA Problem",
        "difficulty": "Easy",
        "category": "general",
        "description": "",
        "examples": [],
        "constraints": [],
        "function_signature": {
            "java": "// Add your solution here",
            "cpp": "// Add your solution here",
            "python": "# Add your solution here"
        }
    }
    
    # Extract the title if present
    title_match = re.search(r"Title:(.*?)(?=\n|$)", text, re.DOTALL)
    if title_match:
        structured_data["title"] = title_match.group(1).strip()
    
    # Extract difficulty if present
    difficulty_match = re.search(r"Difficulty:(.*?)(?=\n|$)", text, re.DOTALL)
    if difficulty_match:
        difficulty = difficulty_match.group(1).strip().lower()
        if difficulty in ["easy", "medium", "hard"]:
            structured_data["difficulty"] = difficulty.capitalize()
    
    # Extract category if present
    category_match = re.search(r"Category:(.*?)(?=\n|$)", text, re.DOTALL)
    if category_match:
        structured_data["category"] = category_match.group(1).strip().lower()
    
    # Extract the main question
    question_match = re.search(r"Question:(.*?)(?=Example Test Cases:|$)", text, re.DOTALL)
    if question_match:
        structured_data["description"] = question_match.group(1).strip()
    
    # Rest of the parsing logic remains the same...
    # Extract test cases
    test_cases_pattern = r"(\d+)\.\s+Input:(.*?)Output:(.*?)(?:Explanation:(.*?))?(?=\d+\.\s+Input:|$)"
    test_cases = re.findall(test_cases_pattern, text, re.DOTALL)
    
    for test_case in test_cases:
        case_num, input_text, output_text, explanation = [item.strip() for item in test_case]
        
        structured_data["examples"].append({
            "input": input_text,
            "output": output_text,
            "explanation": explanation if explanation else None
        })
    
    # Extract any constraints if they exist
    constraints_match = re.search(r"Constraints:(.*?)(?=\n\n|$)", text, re.DOTALL)
    if constraints_match:
        constraints_text = constraints_match.group(1).strip()
        structured_data["constraints"] = [constraint.strip() for constraint in constraints_text.split('\n') if constraint.strip()]
    
    # Generate function signatures
    structured_data["function_signature"] = generate_function_signatures(structured_data["description"])
    
    # Generate a unique ID for this question based on its description
    structured_data["id"] = hashlib.md5(structured_data["description"].encode()).hexdigest()
    
    return structured_data

@app.route('/get_question', methods=['GET'])
def get_question():
    try:
        # Get difficulty parameter from request
        difficulty = request.args.get('difficulty', 'easy').lower()
        
        # Validate difficulty
        if difficulty not in ['easy', 'medium', 'hard']:
            difficulty = 'easy'  # Default to easy if invalid
            
        # Get a random problem of the specified difficulty
        question = get_random_problem(difficulty)
        return jsonify(question)
    except Exception as e:
        print(f"Error in get_question: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/run_test_case', methods=['POST'])
def run_test_case():
    """API endpoint to run a single test case."""
    data = request.json
    language = data.get('language')
    code = data.get('code')
    test_case = data.get('test_case')
    
    if not all([language, code, test_case]):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Use Gemini to evaluate the test case
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"""
    Evaluate if this {language} code correctly solves this specific test case:
    
    Test Case:
    Input: {test_case['input']}
    Expected Output: {test_case['output']}
    
    Code:
    ```{language}
    {code}
    ```
    
    Run the code with the test case input and check if the output matches the expected output.
    Return your response in this JSON format ONLY, with no additional commentary:
    {{
        "passed": true/false,
        "actual_output": "the code's output",
        "expected_output": "{test_case['output']}",
        "explanation": "brief explanation of why the test passed/failed"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Handle potential code blocks in the response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        
        # Ensure all expected fields are present
        if "passed" not in result:
            result["passed"] = False
        if "actual_output" not in result:
            result["actual_output"] = "Unable to determine output"
        if "expected_output" not in result:
            result["expected_output"] = test_case['output']
        if "explanation" not in result:
            if result["passed"]:
                result["explanation"] = "Test passed successfully"
            else:
                result["explanation"] = "Output did not match expected result"
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error evaluating test case: {e}")
        return jsonify({
            "passed": False,
            "actual_output": "Error processing code",
            "expected_output": test_case['output'],
            "explanation": f"Failed to evaluate the test case: {str(e)}"
        })

@app.route('/submit_solution', methods=['POST'])
def submit_solution():
    """API endpoint to evaluate a submitted solution."""
    data = request.json
    language = data.get('language')
    code = data.get('code')
    question_description = data.get('question_description')
    examples = data.get('examples', [])
    
    if not all([language, code, question_description, examples]):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Use Gemini to evaluate the solution
    result = evaluate_solution(code, language, question_description, examples)
    
    return jsonify(result)

def evaluate_solution(code, language, question, examples):
    """
    Use Gemini to evaluate if the provided code solves the given problem
    """
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    # Format examples for the prompt
    examples_text = ""
    for i, example in enumerate(examples):
        examples_text += f"Example {i+1}:\n"
        examples_text += f"Input: {example['input']}\n"
        examples_text += f"Expected Output: {example['output']}\n\n"
    
    prompt = f"""
    Evaluate if this {language} code correctly solves the given problem:
    
    Problem:
    {question}
    
    Test Cases:
    {examples_text}
    
    Code:
    ```{language}
    {code}
    ```
    
    Analyze step-by-step if the code handles all test cases correctly. 
    Return your response in this JSON format ONLY, with no additional commentary:
    {{
        "success": true/false,
        "passed_tests": number of tests passed,
        "total_tests": total number of tests,
        "test_results": [
            {{
                "test_number": 1,
                "passed": true/false,
                "input": "test input",
                "expected_output": "expected output",
                "actual_output": "the code's output",
                "explanation": "explanation of why the test passed/failed"
            }},
            ... (for each test)
        ],
        "execution_time": "estimated execution time in ms",
        "memory_usage": "estimated memory usage in MB",
        "feedback": "overall feedback about the code"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean up the response text before parsing as JSON
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        
        # Ensure all required fields are present
        if "success" not in result:
            result["success"] = False
        if "passed_tests" not in result:
            result["passed_tests"] = 0
        if "total_tests" not in result:
            result["total_tests"] = len(examples)
        if "test_results" not in result:
            result["test_results"] = []
            
        # Ensure each test result has all required fields
        for i, test_result in enumerate(result.get("test_results", [])):
            if "test_number" not in test_result:
                test_result["test_number"] = i + 1
            if "passed" not in test_result:
                test_result["passed"] = False
            if "input" not in test_result and i < len(examples):
                test_result["input"] = examples[i]["input"]
            if "expected_output" not in test_result and i < len(examples):
                test_result["expected_output"] = examples[i]["output"]
            if "actual_output" not in test_result:
                test_result["actual_output"] = "Unable to determine"
            if "explanation" not in test_result:
                test_result["explanation"] = "Output did not match expected result"
                
        # Add execution statistics if not present
        if "execution_time" not in result:
            result["execution_time"] = "10-50"  # Default estimated range
        if "memory_usage" not in result:
            result["memory_usage"] = "5-20"  # Default estimated range
            
        return result
        
    except Exception as e:
        print(f"Error evaluating solution: {e}")
        # Create a structured error response
        error_result = {
            "success": False,
            "error": "Failed to evaluate the solution",
            "details": str(e),
            "passed_tests": 0,
            "total_tests": len(examples),
            "test_results": []
        }
        
        # Generate placeholder test results for each example
        for i, example in enumerate(examples):
            error_result["test_results"].append({
                "test_number": i + 1,
                "passed": False,
                "input": example["input"],
                "expected_output": example["output"],
                "actual_output": "Unable to evaluate",
                "explanation": "Evaluation failed: " + str(e)
            })
            
        return error_result

if __name__ == '__main__':
    app.run(debug=True)