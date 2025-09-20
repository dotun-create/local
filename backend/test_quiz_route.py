#!/usr/bin/env python3
"""
Test script for the new quiz creation route with questions
Usage: python test_quiz_route.py
"""

import requests
import json

# Sample quiz data with questions in the specified format
quiz_data = {
    "title": "Math Quiz - Basic Algebra",
    "description": "A basic algebra quiz covering linear equations and word problems",
    "timeLimit": 30,
    "passingScore": 70,
    "topics": ["algebra", "linear_equations"],
    "questions": [
        {
            "question": "What is the value of x in the equation 2x + 5 = 11?",
            "type": "multiple_choice",
            "options": [
                {
                    "id": "a",
                    "text": "3"
                },
                {
                    "id": "b", 
                    "text": "2"
                },
                {
                    "id": "c",
                    "text": "4"
                },
                {
                    "id": "d",
                    "text": "5"
                }
            ],
            "correctAnswer": "a",
            "explanation": "To solve for x, subtract 5 from both sides of the equation to get 2x = 6. Then divide both sides by 2 to get x = 3."
        },
        {
            "question": "If a bakery sells 250 loaves of bread per day at $2 each, how much money does it make in a day?",
            "type": "multiple_choice",
            "options": [
                {
                    "id": "a",
                    "text": "$450"
                },
                {
                    "id": "b",
                    "text": "$500"
                },
                {
                    "id": "c", 
                    "text": "$400"
                },
                {
                    "id": "d",
                    "text": "$550"
                }
            ],
            "correctAnswer": "b",
            "explanation": "To find the total amount of money made, multiply the number of loaves sold (250) by the price per loaf ($2). 250 * 2 = $500."
        }
    ]
}

def test_quiz_creation():
    """Test the quiz creation endpoint"""
    # Note: You'll need to replace these with actual values from your system
    base_url = "http://localhost:5000/api"
    module_id = "module_12345678"  # Replace with actual module ID
    auth_token = "your_jwt_token_here"  # Replace with actual JWT token
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }
    
    url = f"{base_url}/modules/{module_id}/quizzes/with-questions"
    
    try:
        response = requests.post(url, json=quiz_data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 201:
            print("✅ Quiz created successfully!")
        else:
            print("❌ Quiz creation failed")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    print("Testing Quiz Creation with Questions Route")
    print("=" * 50)
    test_quiz_creation()