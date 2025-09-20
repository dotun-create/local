#!/usr/bin/env python3
"""
OpenAI Question Generator
Generates multiple choice questions for a given topic using OpenAI's API
"""

import openai
import json
import os
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

def generate_quiz_questions(topic: str, num_questions: int = 5, difficulty: str = "medium", country: str = None, grade_level: str = None) -> List[Dict]:
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
    """
    
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
Generate {num_questions} multiple choice questions about "{topic}" at {difficulty} difficulty level.

{context_section}Requirements:
- Each question should test understanding of the topic
- Provide 4 answer options (a, b, c, d) for each question
- Only one option should be correct
- Include a brief explanation for the correct answer
- Questions should be educational and accurate{grade_requirements}

Return the response as a valid JSON array with each question following this exact format:
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

Generate the questions now:
"""

    try:
        # Initialize OpenAI client with environment variables
        client = openai.OpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_API_BASE')
        )
        
        response = client.chat.completions.create(
            model=os.getenv('OPENAI_MODEL'),
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert educator who creates high-quality multiple choice questions. Always return valid JSON arrays without any additional text or formatting."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        # Extract and parse the response
        content = response.choices[0].message.content.strip()
        
        # Remove any markdown formatting if present
        if content.startswith('```json'):
            content = content[7:]
        if content.endswith('```'):
            content = content[:-3]
        
        # Parse JSON response
        questions = json.loads(content)
        
        # Validate the format
        for i, question in enumerate(questions):
            if not all(key in question for key in ['question', 'type', 'options', 'correctAnswer', 'explanation']):
                raise ValueError(f"Question {i+1} is missing required fields")
            
            if question['type'] != 'multiple_choice':
                question['type'] = 'multiple_choice'
            
            if len(question['options']) != 4:
                raise ValueError(f"Question {i+1} should have exactly 4 options")
        
        return questions
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse OpenAI response as JSON: {e}")
    except openai.AuthenticationError:
        raise ValueError("OpenAI API key is invalid or missing. Set OPENAI_API_KEY environment variable.")
    except openai.RateLimitError:
        raise ValueError("OpenAI API rate limit exceeded. Please try again later.")
    except Exception as e:
        raise ValueError(f"Error generating questions: {str(e)}")


def save_questions_to_file(questions: List[Dict], filename: str):
    """Save generated questions to a JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    print(f"Questions saved to {filename}")


def main():
    """CLI interface for question generation"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python generate_questions.py <topic> [num_questions] [difficulty] [country] [grade_level]")
        print("Example: python generate_questions.py 'Python Programming' 10 medium 'UK' 'Year 10'")
        print("Example: python generate_questions.py 'Mathematics' 5 easy 'US' 'Grade 8'")
        sys.exit(1)
    
    topic = sys.argv[1]
    num_questions = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    difficulty = sys.argv[3] if len(sys.argv) > 3 else "medium"
    country = sys.argv[4] if len(sys.argv) > 4 else None
    grade_level = sys.argv[5] if len(sys.argv) > 5 else None
    
    try:
        context_str = ""
        if grade_level or country:
            parts = []
            if grade_level:
                parts.append(f"{grade_level}")
            if country:
                parts.append(f"{country} curriculum")
            context_str = f" for {', '.join(parts)}"
        
        print(f"Generating {num_questions} {difficulty} questions about '{topic}'{context_str}...")
        questions = generate_quiz_questions(topic, num_questions, difficulty, country, grade_level)
        
        # Save to file
        filename = f"questions_{topic.lower().replace(' ', '_')}.json"
        save_questions_to_file(questions, filename)
        
        # Print sample question
        print(f"\nSample question:")
        print(json.dumps(questions[0], indent=2))
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()