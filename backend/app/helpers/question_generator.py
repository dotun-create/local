#!/usr/bin/env python3
"""
OpenAI Question Generator Helper
Generates multiple choice questions for a given topic using OpenAI's API
Can be imported and used anywhere in the backend API
"""

import openai
import json
import os
import re
import logging
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

class QuestionGeneratorError(Exception):
    """Custom exception for question generation errors"""
    pass

def sanitize_json_string(content: str) -> str:
    """
    Sanitize OpenAI response content to ensure valid JSON parsing
    
    Args:
        content: Raw response content from OpenAI
        
    Returns:
        Sanitized JSON string ready for parsing
    """
    if not content:
        return content
    
    # Remove any markdown formatting if present
    if content.startswith('```json'):
        content = content[7:]
    if content.endswith('```'):
        content = content[:-3]
    
    content = content.strip()
    
    # Fix common escape sequence issues
    # Replace invalid escape sequences with proper ones
    content = re.sub(r'\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', content)
    
    # Fix single backslashes that aren't part of valid escape sequences
    content = re.sub(r'(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', content)
    
    # Remove any trailing commas in JSON objects/arrays
    content = re.sub(r',(\s*[}\]])', r'\1', content)
    
    # Ensure proper quote escaping in strings
    # This regex finds quoted strings and ensures quotes inside are properly escaped
    def fix_quotes_in_string(match):
        quote_char = match.group(1)
        string_content = match.group(2)
        # Escape any unescaped quotes inside the string
        string_content = re.sub(f'(?<!\\\\){quote_char}', f'\\\\{quote_char}', string_content)
        return f'{quote_char}{string_content}{quote_char}'
    
    # Fix quotes in JSON string values (between quotes)
    content = re.sub(r'(["\'])([^"\']*?)\1', fix_quotes_in_string, content)
    
    # Remove any control characters that might cause JSON parsing issues
    content = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', content)
    
    return content

def generate_quiz_questions(
    topic: str, 
    num_questions: int = 5, 
    difficulty: str = "medium", 
    country: Optional[str] = None, 
    grade_level: Optional[str] = None
) -> List[Dict]:
    """
    Generate multiple choice questions using OpenAI API
    
    Args:
        topic: The subject/topic for the questions
        num_questions: Number of questions to generate (default: 5)
        difficulty: Difficulty level - "easy", "medium", "hard" (default: "medium")
        country: Country for curriculum context (optional)
        grade_level: Grade level for age-appropriate content (optional)
    
    Returns:
        List of question dictionaries in the specified format
        
    Raises:
        QuestionGeneratorError: If generation fails for any reason
    """
    
    # Get configuration from environment variables
    max_questions = int(os.getenv('MAX_QUIZ_QUESTIONS', 20))
    default_difficulty = os.getenv('DEFAULT_QUIZ_DIFFICULTY', 'medium')
    available_difficulties = os.getenv('QUIZ_DIFFICULTY_LEVELS', 'easy,medium,hard').split(',')
    
    # Validate inputs
    if not topic or not topic.strip():
        raise QuestionGeneratorError("Topic cannot be empty")
    
    if num_questions < 1 or num_questions > max_questions:
        raise QuestionGeneratorError(f"Number of questions must be between 1 and {max_questions}")
    
    if difficulty not in available_difficulties:
        raise QuestionGeneratorError(f"Difficulty must be one of: {', '.join(available_difficulties)}")
    
    # Check for required environment variables
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise QuestionGeneratorError("OPENAI_API_KEY environment variable is required")
    
    model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
    base_url = os.getenv('OPENAI_API_BASE')
    org_id = os.getenv('OPENAI_ORG_ID')
    timeout = int(os.getenv('OPENAI_TIMEOUT', 30))
    max_retries = int(os.getenv('OPENAI_MAX_RETRIES', 3))
    
    # Build context for grade-appropriate content
    context_info = []
    if grade_level:
        context_info.append(f"Grade Level: {grade_level}")
    if country:
        context_info.append(f"Country/Curriculum Context: {country}")
    
    context_section = "\n".join(context_info) + "\n" if context_info else ""
    
    # Additional requirements for grade-appropriate content
    grade_requirements = ""
    if grade_level:
        grade_requirements = f"""
- Questions should be appropriate for {grade_level} students
- Use age-appropriate language and concepts
- Consider the cognitive development level of {grade_level} students"""
    
    if country:
        grade_requirements += f"""
- Consider the {country} educational context and curriculum standards"""
    
    # OpenAI prompt for generating questions
    prompt = f"""
Generate EXACTLY {num_questions} multiple choice questions about "{topic}" at {difficulty} difficulty level.

CRITICAL REQUIREMENT: You must generate EXACTLY {num_questions} questions - no more, no less.

{context_section}Requirements:
- Each question should test understanding of the topic
- Provide 4 answer options (a, b, c, d) for each question
- Only one option should be correct
- Include a brief explanation for the correct answer
- Questions should be educational and accurate{grade_requirements}

CRITICAL: You MUST respond with ONLY a valid JSON array containing EXACTLY {num_questions} questions. No explanations, no text before or after.

Count verification: Generate {num_questions} questions (count: {num_questions})
Before responding, count your questions to ensure you have exactly {num_questions}.

Start your response with [ and end with ]. Each question must follow this EXACT format:
{{
    "question": "Question text here",
    "type": "multiple_choice",
    "options": [
        {{"id": "a", "text": "Option A text"}},
        {{"id": "b", "text": "Option B text"}},
        {{"id": "c", "text": "Option C text"}},
        {{"id": "d", "text": "Option D text"}}
    ],
    "correctAnswer": "a",
    "explanation": "Brief explanation of why this answer is correct"
}}

Topic: {topic}
Difficulty: {difficulty}
Number of questions: {num_questions}

Return ONLY the JSON array containing exactly {num_questions} questions. Do not include any text before or after the JSON.
VERIFY: Your response must contain exactly {num_questions} question objects in the JSON array.
"""

    try:
        # Initialize OpenAI client with configuration
        # Note: Some client versions may not support all parameters
        client_kwargs = {'api_key': api_key}
        
        if base_url:
            client_kwargs['base_url'] = base_url
            
        if org_id:
            client_kwargs['organization'] = org_id
            
        # Add timeout and max_retries if supported by the client version
        try:
            client = openai.OpenAI(timeout=timeout, max_retries=max_retries, **client_kwargs)
        except TypeError:
            # Fallback for older client versions that don't support these parameters
            client = openai.OpenAI(**client_kwargs)
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system", 
                    "content": """You are an expert educator who creates high-quality multiple choice questions. 

CRITICAL INSTRUCTIONS:
1. You MUST return ONLY a valid JSON array - no explanations, no additional text, no markdown formatting
2. Start your response with [ and end with ]
3. Do not include any text before or after the JSON array
4. Do not wrap the JSON in ```json``` code blocks
5. Each question object must follow the exact format specified in the user prompt"""
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            temperature=0.1,
            # max_tokens=2000
        )
        
        # Extract and parse the response
        raw_content = response.choices[0].message.content.strip()
        
        # Log raw response for debugging (first 500 chars to avoid log spam)
        logger.debug(f"Raw OpenAI response (first 500 chars): {raw_content[:500]}")
        
        # Sanitize the content before parsing
        sanitized_content = sanitize_json_string(raw_content)
        
        # Log sanitized content for debugging
        logger.debug(f"Sanitized content (first 500 chars): {sanitized_content[:500]}")
        
        # Parse JSON response
        try:
            questions = json.loads(sanitized_content)
        except json.JSONDecodeError as e:
            # Log the error with more context
            logger.error(f"JSON parsing failed. Error: {e}")
            logger.error(f"Problematic content around error position: {sanitized_content[max(0, e.pos-50):e.pos+50]}")
            
            # Try a more aggressive sanitization approach
            try:
                # Last resort: try to extract JSON array using regex
                array_match = re.search(r'\[.*\]', sanitized_content, re.DOTALL)
                if array_match:
                    array_content = array_match.group(0)
                    logger.debug("Attempting to parse extracted array content")
                    questions = json.loads(array_content)
                else:
                    raise QuestionGeneratorError(f"Failed to parse OpenAI response as JSON: {e}. Content: {sanitized_content[:200]}...")
            except json.JSONDecodeError:
                raise QuestionGeneratorError(f"Failed to parse OpenAI response as JSON: {e}. Content: {sanitized_content[:200]}...")
        
        # Validate the format
        if not isinstance(questions, list):
            raise QuestionGeneratorError("Response should be a list of questions")
        
        if len(questions) != num_questions:
            raise QuestionGeneratorError(f"Expected {num_questions} questions, got {len(questions)}")
        
        for i, question in enumerate(questions):
            if not isinstance(question, dict):
                raise QuestionGeneratorError(f"Question {i+1} should be a dictionary")
            
            required_fields = ['question', 'type', 'options', 'correctAnswer', 'explanation']
            missing_fields = [field for field in required_fields if field not in question]
            if missing_fields:
                raise QuestionGeneratorError(f"Question {i+1} is missing required fields: {missing_fields}")
            
            # Ensure type is correct
            if question['type'] != 'multiple_choice':
                question['type'] = 'multiple_choice'
            
            # Validate options
            if not isinstance(question['options'], list) or len(question['options']) != 4:
                raise QuestionGeneratorError(f"Question {i+1} should have exactly 4 options")
            
            # Validate option format
            for j, option in enumerate(question['options']):
                if not isinstance(option, dict) or 'id' not in option or 'text' not in option:
                    raise QuestionGeneratorError(f"Question {i+1}, option {j+1} should have 'id' and 'text' fields")
            
            # Validate correct answer
            valid_ids = [option['id'] for option in question['options']]
            if question['correctAnswer'] not in valid_ids:
                raise QuestionGeneratorError(f"Question {i+1} correctAnswer '{question['correctAnswer']}' is not a valid option ID")
        
        return questions
        
    except openai.AuthenticationError:
        raise QuestionGeneratorError("OpenAI API key is invalid or missing")
    except openai.RateLimitError:
        raise QuestionGeneratorError("OpenAI API rate limit exceeded. Please try again later")
    except openai.APIError as e:
        raise QuestionGeneratorError(f"OpenAI API error: {e}")
    except Exception as e:
        if isinstance(e, QuestionGeneratorError):
            raise
        raise QuestionGeneratorError(f"Unexpected error generating questions: {str(e)}")


def generate_questions_for_course(
    course_subject: str,
    course_country: Optional[str] = None,
    course_grade_level: Optional[str] = None,
    topic: Optional[str] = None,
    num_questions: int = 5,
    difficulty: str = "medium"
) -> List[Dict]:
    """
    Generate questions for a specific course context
    
    Args:
        course_subject: The main subject of the course
        course_country: Country from course data
        course_grade_level: Grade level from course data
        topic: Specific topic (defaults to course_subject if not provided)
        num_questions: Number of questions to generate
        difficulty: Difficulty level
    
    Returns:
        List of question dictionaries
    """
    question_topic = topic #or course_subject
    
    return generate_quiz_questions(
        topic=question_topic,
        num_questions=num_questions,
        difficulty=difficulty,
        country=course_country,
        grade_level=course_grade_level
    )


def validate_openai_config() -> Dict[str, str]:
    """
    Validate OpenAI configuration and return status
    
    Returns:
        Dictionary with validation results
    """
    result = {
        'valid': False,
        'message': '',
        'missing_vars': [],
        'config_details': {}
    }
    
    # Get all configuration variables
    api_key = os.getenv('OPENAI_API_KEY')
    model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
    base_url = os.getenv('OPENAI_API_BASE')
    org_id = os.getenv('OPENAI_ORG_ID')
    timeout = int(os.getenv('OPENAI_TIMEOUT', 30))
    max_retries = int(os.getenv('OPENAI_MAX_RETRIES', 3))
    max_questions = int(os.getenv('MAX_QUIZ_QUESTIONS', 20))
    default_difficulty = os.getenv('DEFAULT_QUIZ_DIFFICULTY', 'medium')
    available_difficulties = os.getenv('QUIZ_DIFFICULTY_LEVELS', 'easy,medium,hard').split(',')
    
    # Store configuration details
    result['config_details'] = {
        'model': model,
        'base_url': base_url or 'https://api.openai.com/v1',
        'timeout': timeout,
        'max_retries': max_retries,
        'max_questions': max_questions,
        'default_difficulty': default_difficulty,
        'available_difficulties': available_difficulties,
        'organization_configured': bool(org_id)
    }
    
    if not api_key:
        result['missing_vars'].append('OPENAI_API_KEY')
    
    if result['missing_vars']:
        result['message'] = f"Missing required environment variables: {', '.join(result['missing_vars'])}"
        return result
    
    try:
        # Test API connection with a minimal request
        client_kwargs = {'api_key': api_key}
        
        if base_url:
            client_kwargs['base_url'] = base_url
            
        if org_id:
            client_kwargs['organization'] = org_id
            
        # Try with timeout and max_retries, fallback if not supported
        try:
            client = openai.OpenAI(timeout=timeout, max_retries=max_retries, **client_kwargs)
        except TypeError:
            client = openai.OpenAI(**client_kwargs)
        
        # Make a simple test request
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5
        )
        
        result['valid'] = True
        result['message'] = f"OpenAI API configured correctly (Model: {model})"
        
    except openai.AuthenticationError:
        result['message'] = "OpenAI API key is invalid"
    except openai.APIError as e:
        result['message'] = f"OpenAI API error: {e}"
    except Exception as e:
        result['message'] = f"Error testing OpenAI connection: {e}"
    
    return result