# Coding Challenge Backend

This is a backend API for the coding component that provides coding questions, test case execution, and solution submission functionality.

## Setup

1. Ensure you have Python 3.x installed
2. Install the dependencies:

```bash
pip install -r requirements.txt
```

3. Start the server:

```bash
python backend.py
```

The server will run at http://localhost:5000.

## API Endpoints

### 1. Get a Random Question

```
GET /get_question
```

Returns a random coding question with details like description, examples, constraints, and function signatures for different languages.

### 2. Run a Test Case

```
POST /run_test_case
```

Executes code against a specific test case and returns the result.

Request Body:

```json
{
  "language": "python", // or "java", "cpp"
  "code": "def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []",
  "test_case": {
    "input": { "nums": [2, 7, 11, 15], "target": 9 },
    "output": [0, 1],
    "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
  }
}
```

### 3. Submit a Solution

```
POST /submit_solution
```

Runs code against all test cases of a question to check if the solution is correct.

Request Body:

```json
{
  "language": "python",
  "code": "def two_sum(nums, target):\n    hash_map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hash_map:\n            return [hash_map[complement], i]\n        hash_map[num] = i\n    return []",
  "question_description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
  "examples": [
    {
      "input": { "nums": [2, 7, 11, 15], "target": 9 },
      "output": [0, 1],
      "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
    },
    {
      "input": { "nums": [3, 2, 4], "target": 6 },
      "output": [1, 2],
      "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."
    }
  ]
}
```

### 4. Status Check

```
GET /status
```

Returns the current status of the server.

## Environment Variables

The `.env` file contains the following configuration:

- `PORT`: The port on which the server runs (default: 5000)
- `FLASK_ENV`: The environment in which Flask runs (development/production)
- `FLASK_APP`: The main application file (backend.py)

## Supported Languages

The backend supports three programming languages:

- Python
- Java
- C++

Each language has appropriate wrappers for executing the user's code against test cases.

## Features

- Get random coding questions
- Run code against specific test cases
- Validate full solutions against all test cases
- Support for multiple programming languages
- Detailed error messages and feedback
