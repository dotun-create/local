#!/usr/bin/env python3
"""
Example usage of the Question Generator Helper
"""

from app.helpers.question_generator import (
    generate_quiz_questions, 
    generate_questions_for_course,
    validate_openai_config,
    QuestionGeneratorError
)

def example_basic_usage():
    """Basic usage example"""
    try:
        questions = generate_quiz_questions(
            topic="Python Programming",
            num_questions=3,
            difficulty="medium"
        )
        
        print("Generated Questions:")
        for i, q in enumerate(questions, 1):
            print(f"\n{i}. {q['question']}")
            for option in q['options']:
                print(f"   {option['id']}) {option['text']}")
            print(f"   Correct: {q['correctAnswer']}")
            print(f"   Explanation: {q['explanation']}")
            
    except QuestionGeneratorError as e:
        print(f"Error: {e}")

def example_course_context():
    """Example with course context"""
    try:
        questions = generate_questions_for_course(
            course_subject="Mathematics",
            course_country="UK",
            course_grade_level="Year 10",
            topic="Quadratic Equations",
            num_questions=2,
            difficulty="medium"
        )
        
        print("Course-Context Questions:")
        for q in questions:
            print(f"Q: {q['question']}")
            print(f"A: {q['correctAnswer']}")
            
    except QuestionGeneratorError as e:
        print(f"Error: {e}")

def example_validate_config():
    """Validate OpenAI configuration"""
    try:
        config = validate_openai_config()
        print(f"OpenAI Config Valid: {config['valid']}")
        print(f"Message: {config['message']}")
        if config.get('missing_vars'):
            print(f"Missing Variables: {config['missing_vars']}")
            
    except Exception as e:
        print(f"Error checking config: {e}")

def example_api_usage():
    """Example API usage for quiz generation"""
    print("API Usage Examples:")
    print("\n1. Module-level Quiz Generation:")
    print("POST /modules/{module_id}/quizzes/generate")
    print("Body: {")
    print('  "title": "Module Assessment",')
    print('  "numQuestions": 5,')
    print('  "difficulty": "medium"')
    print("}")
    
    print("\n2. Lesson-level Quiz Generation:")
    print("POST /modules/{module_id}/lessons/{lesson_id}/quizzes/generate")
    print("Body: {")
    print('  "title": "Lesson Quiz: Introduction to Variables",')
    print('  "numQuestions": 3,')
    print('  "difficulty": "easy"')
    print("}")
    
    print("\n3. Frontend Usage:")
    print("// Module-level")
    print("const result = await API.quizzes.generateQuizWithAI(moduleId, quizData);")
    print("\n// Lesson-level")
    print("const result = await API.quizzes.generateQuizWithAI(moduleId, quizData, lessonId);")

if __name__ == "__main__":
    print("=== Question Generator Helper Examples ===\n")
    
    print("1. Validating Configuration:")
    example_validate_config()
    
    print("\n2. Basic Usage:")
    example_basic_usage()
    
    print("\n3. Course Context Usage:")
    example_course_context()
    
    print("\n4. API Usage Examples:")
    example_api_usage()