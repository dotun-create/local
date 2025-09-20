import openai
import json
import re
import os
from typing import Dict, List, Optional
from datetime import datetime

class AIFeedbackService:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY', '')
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4-turbo')
        
        if self.api_key:
            openai.api_key = self.api_key
        else:
            print("Warning: OpenAI API key not configured")
    
    def is_configured(self) -> bool:
        """Check if OpenAI credentials are configured"""
        return bool(self.api_key)
    
    def generate_tutor_feedback(self, transcript: str, prompt_template: str, session_context: Dict) -> Dict:
        """Generate AI feedback for tutors based on session transcript"""
        try:
            if not self.is_configured():
                raise ValueError("OpenAI API key not configured")
            
            # Prepare context for the prompt
            context = {
                'session_title': session_context.get('title', 'Session'),
                'course_name': session_context.get('course_name', 'Course'),
                'duration': session_context.get('duration', 0),
                'participants_count': session_context.get('participants_count', 0),
                'session_date': session_context.get('session_date', ''),
                'transcript': transcript[:4000]  # Limit transcript length for API
            }
            
            # Fill in the prompt template
            prompt = prompt_template.format(**context)
            
            # Make API call to OpenAI
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an AI assistant that analyzes tutoring sessions and provides constructive feedback to tutors. Be professional, constructive, and specific in your feedback."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=800,
                temperature=0.7
            )
            
            feedback_text = response.choices[0].message.content.strip()
            
            # Extract rating from feedback
            rating = self.extract_rating_from_feedback(feedback_text)
            
            return {
                'success': True,
                'feedback': feedback_text,
                'rating': rating
            }
            
        except Exception as e:
            print(f"Error generating tutor feedback: {e}")
            return {
                'success': False,
                'error': str(e),
                'feedback': '',
                'rating': None
            }
    
    def generate_individual_guardian_feedback(self, transcript: str, prompt_template: str, 
                                            student_context: Dict, session_context: Dict) -> Dict:
        """Generate personalized AI feedback for guardians about their specific child"""
        try:
            if not self.is_configured():
                raise ValueError("OpenAI API key not configured")
            
            # Prepare context for the prompt
            context = {
                'student_name': student_context.get('student_name', 'Student'),
                'student_grade': student_context.get('student_grade', ''),
                'guardian_name': student_context.get('guardian_name', 'Guardian'),
                'session_topic': session_context.get('title', 'Session'),
                'course_name': session_context.get('course_name', 'Course'),
                'session_duration': session_context.get('duration', 0),
                'session_date': session_context.get('session_date', ''),
                'student_attendance': student_context.get('student_attendance', {}),
                'transcript': transcript[:4000]  # Limit transcript length for API
            }
            
            # Fill in the prompt template
            prompt = prompt_template.format(**context)
            
            # Make API call to OpenAI
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an AI assistant that analyzes tutoring sessions and provides personalized updates to parents/guardians about their child's performance. Be encouraging, specific, and actionable in your feedback."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=600,
                temperature=0.7
            )
            
            feedback_text = response.choices[0].message.content.strip()
            
            # Extract performance metrics
            performance_metrics = self.extract_student_performance_metrics(feedback_text)
            
            return {
                'success': True,
                'feedback': feedback_text,
                'performance_metrics': performance_metrics
            }
            
        except Exception as e:
            print(f"Error generating guardian feedback: {e}")
            return {
                'success': False,
                'error': str(e),
                'feedback': '',
                'performance_metrics': {}
            }
    
    def extract_rating_from_feedback(self, feedback_text: str) -> Optional[float]:
        """Extract numerical rating from tutor feedback text"""
        try:
            # Look for patterns like "Rating: 4.2/5", "Score: 8/10", "4.5 out of 5"
            patterns = [
                r'(?:rating|score):\s*(\d+\.?\d*)/5',
                r'(?:rating|score):\s*(\d+\.?\d*)\s*out\s*of\s*5',
                r'(\d+\.?\d*)/5(?:\s*rating)?',
                r'(\d+\.?\d*)\s*out\s*of\s*5',
                r'(?:overall|session)\s*(?:rating|score):\s*(\d+\.?\d*)'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, feedback_text.lower())
                if match:
                    rating = float(match.group(1))
                    # Ensure rating is between 0 and 5
                    if 0 <= rating <= 5:
                        return rating
            
            # If no explicit rating found, try to infer from positive/negative language
            positive_words = ['excellent', 'outstanding', 'great', 'good', 'effective']
            negative_words = ['poor', 'needs improvement', 'struggled', 'difficult', 'challenging']
            
            positive_count = sum(1 for word in positive_words if word in feedback_text.lower())
            negative_count = sum(1 for word in negative_words if word in feedback_text.lower())
            
            if positive_count > negative_count:
                return 4.0  # Good session
            elif negative_count > positive_count:
                return 2.5  # Needs improvement
            else:
                return 3.5  # Average session
            
        except Exception as e:
            print(f"Error extracting rating: {e}")
            return 3.0  # Default neutral rating
    
    def extract_student_performance_metrics(self, feedback_text: str) -> Dict:
        """Extract structured performance data from guardian feedback"""
        try:
            # Initialize metrics
            metrics = {
                'summary': '',
                'strengths': '',
                'improvements': ''
            }
            
            # Split feedback into sections based on common patterns
            lines = feedback_text.split('\n')
            current_section = 'summary'
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Detect section headers
                if any(word in line.lower() for word in ['strength', 'positive', 'did well', 'excelled']):
                    current_section = 'strengths'
                elif any(word in line.lower() for word in ['improvement', 'area', 'work on', 'focus', 'challenge']):
                    current_section = 'improvements'
                elif any(word in line.lower() for word in ['summary', 'overall', 'performance']):
                    current_section = 'summary'
                
                # Add content to appropriate section
                if current_section in metrics:
                    if metrics[current_section]:
                        metrics[current_section] += ' ' + line
                    else:
                        metrics[current_section] = line
            
            # If sections are empty, use full feedback as summary
            if not any(metrics.values()):
                metrics['summary'] = feedback_text
            
            return metrics
            
        except Exception as e:
            print(f"Error extracting performance metrics: {e}")
            return {
                'summary': feedback_text,
                'strengths': '',
                'improvements': ''
            }
    
    def validate_api_key(self) -> Dict:
        """Validate OpenAI API key"""
        try:
            if not self.is_configured():
                return {
                    'success': False,
                    'error': 'OpenAI API key not configured'
                }
            
            # Make a simple test request
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": "Hello, this is a test."
                    }
                ],
                max_tokens=10
            )
            
            return {
                'success': True,
                'message': 'OpenAI API key is valid',
                'model': self.model
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Invalid OpenAI API key: {str(e)}'
            }
    
    def get_default_prompts(self) -> Dict[str, str]:
        """Get default prompt templates for AI feedback"""
        return {
            'tutor_feedback_prompt': """
Analyze the following tutoring session transcript and provide constructive feedback for the tutor.

Session Details:
- Title: {session_title}
- Course: {course_name}
- Duration: {duration} minutes
- Participants: {participants_count}
- Date: {session_date}

Transcript:
{transcript}

Please provide feedback covering:
1. Teaching effectiveness and clarity
2. Student engagement and interaction
3. Areas for improvement
4. Overall session rating (X/5)

Keep the feedback constructive and specific with actionable suggestions.
""",
            
            'guardian_feedback_prompt': """
Analyze the following tutoring session transcript and provide a personalized update for the parent/guardian about their child's performance.

Student Details:
- Student Name: {student_name}
- Grade Level: {student_grade}
- Guardian: {guardian_name}

Session Details:
- Topic: {session_topic}
- Course: {course_name}
- Duration: {session_duration} minutes
- Date: {session_date}

Student Attendance: {student_attendance}

Transcript:
{transcript}

Please provide a personalized update including:
1. How {student_name} participated in the session
2. Key concepts covered and understood
3. Areas where {student_name} showed strength
4. Areas for continued focus and improvement
5. Suggestions for supporting {student_name}'s learning at home

Keep the tone encouraging and specific to {student_name}'s performance.
"""
        }

# Singleton instance
ai_service = AIFeedbackService()