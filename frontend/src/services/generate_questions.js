/**
 * OpenAI Question Generator - JavaScript Module
 * Generates multiple choice questions for a given topic using OpenAI's API
 * 
 * Exportable functions:
 * - generateQuizQuestions: Main function to generate quiz questions
 * - downloadQuestionsAsFile: Download questions as JSON file (browser only)
 * - saveQuestionsToFile: Save questions to file (Node.js only)
 * 
 * Usage Examples:
 * 
 * // In React component or any frontend code:
 * import { generateQuizQuestions, downloadQuestionsAsFile } from './services/generate_questions.js';
 * 
 * const questions = await generateQuizQuestions('Mathematics', 10, 'medium', 'UK', 'Year 10');
 * downloadQuestionsAsFile(questions, 'math_quiz.json');
 * 
 * // In Node.js environment:
 * import { generateQuizQuestions, saveQuestionsToFile } from './services/generate_questions.js';
 * 
 * const questions = await generateQuizQuestions('Science', 5, 'easy');
 * await saveQuestionsToFile(questions, 'science_questions.json');
 * 
 * Required Environment Variables:
 * - REACT_APP_OPENAI_API_KEY (for browser/React usage)
 * - REACT_APP_OPENAI_MODEL (optional, defaults to gpt-3.5-turbo)
 * - REACT_APP_OPENAI_API_BASE (optional, defaults to OpenAI's API)
 * - OPENAI_API_KEY (for Node.js/CLI usage)
 * - OPENAI_MODEL (for Node.js/CLI usage)
 * - OPENAI_API_BASE (for Node.js/CLI usage)
 */

import OpenAI from 'openai';

/**
 * Generate multiple choice questions using OpenAI API
 * 
 * @param {string} topic - The subject/topic for the questions
 * @param {number} numQuestions - Number of questions to generate (default: 5)
 * @param {string} difficulty - Difficulty level - "easy", "medium", "hard" (default: "medium")
 * @param {string|null} country - Country for curriculum context (optional)
 * @param {string|null} gradeLevel - Grade level for age-appropriate content (optional)
 * @returns {Promise<Array>} Promise that resolves to array of question objects
 */
export async function generateQuizQuestions(
    topic, 
    numQuestions = 5, 
    difficulty = "medium", 
    country = null, 
    gradeLevel = null
) {
    // Build context for grade-appropriate content
    const contextInfo = [];
    if (gradeLevel) {
        contextInfo.push(`Grade Level: ${gradeLevel}`);
    }
    if (country) {
        contextInfo.push(`Country/Curriculum Context: ${country}`);
    }
    
    const contextSection = contextInfo.length > 0 ? contextInfo.join('\n') + '\n' : '';
    
    // Additional requirements for grade-appropriate content
    let gradeRequirements = '';
    if (gradeLevel) {
        gradeRequirements = `
- Questions should be appropriate for ${gradeLevel} students
- Use age-appropriate language and concepts
- Consider the cognitive development level of ${gradeLevel} students`;
    }
    
    if (country) {
        gradeRequirements += `
- Consider the ${country} educational context and curriculum standards`;
    }
    
    // OpenAI prompt for generating questions
    const prompt = `
Generate ${numQuestions} multiple choice questions about "${topic}" at ${difficulty} difficulty level.

${contextSection}Requirements:
- Each question should test understanding of the topic
- Provide 4 answer options (a, b, c, d) for each question
- Only one option should be correct
- Include a brief explanation for the correct answer
- Questions should be educational and accurate${gradeRequirements}

Return the response as a valid JSON array with each question following this exact format:
{
    "question": "Question text here",
    "type": "multiple_choice",
    "options": [
        {"id": "a", "text": "Option A text"},
        {"id": "b", "text": "Option B text"},
        {"id": "c", "text": "Option C text"},
        {"id": "d", "text": "Option D text"}
    ],
    "correctAnswer": "a",
    "explanation": "Brief explanation of why this answer is correct"
}

Topic: ${topic}
Difficulty: ${difficulty}
Number of questions: ${numQuestions}

Generate the questions now:
`;

    try {
        // Initialize OpenAI client with environment variables
        const client = new OpenAI({
            apiKey: process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: process.env.REACT_APP_OPENAI_API_BASE || process.env.OPENAI_API_BASE,
            dangerouslyAllowBrowser: true // Allow usage in browser environments
        });
        
        const response = await client.chat.completions.create({
            model: process.env.REACT_APP_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                {
                    role: "system", 
                    content: "You are an expert educator who creates high-quality multiple choice questions. Always return valid JSON arrays without any additional text or formatting."
                },
                {
                    role: "user", 
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });
        
        // Extract and parse the response
        let content = response.choices[0].message.content.trim();
        
        // Remove any markdown formatting if present
        if (content.startsWith('```json')) {
            content = content.substring(7);
        }
        if (content.endsWith('```')) {
            content = content.slice(0, -3);
        }
        
        // Parse JSON response
        const questions = JSON.parse(content);
        
        // Validate the format
        questions.forEach((question, index) => {
            const requiredFields = ['question', 'type', 'options', 'correctAnswer', 'explanation'];
            const missingFields = requiredFields.filter(field => !(field in question));
            
            if (missingFields.length > 0) {
                throw new Error(`Question ${index + 1} is missing required fields: ${missingFields.join(', ')}`);
            }
            
            if (question.type !== 'multiple_choice') {
                question.type = 'multiple_choice';
            }
            
            if (!Array.isArray(question.options) || question.options.length !== 4) {
                throw new Error(`Question ${index + 1} should have exactly 4 options`);
            }
        });
        
        return questions;
        
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Failed to parse OpenAI response as JSON: ${error.message}`);
        }
        if (error.status === 401) {
            throw new Error('OpenAI API key is invalid or missing. Set OPENAI_API_KEY environment variable.');
        }
        if (error.status === 429) {
            throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        }
        throw new Error(`Error generating questions: ${error.message}`);
    }
}

/**
 * Save generated questions to a JSON file (Node.js only)
 * 
 * @param {Array} questions - Array of question objects
 * @param {string} filename - Output filename
 */
export async function saveQuestionsToFile(questions, filename) {
    if (typeof window !== 'undefined') {
        throw new Error('File saving is only available in Node.js environments. Use downloadQuestionsAsFile() for browsers.');
    }
    
    try {
        const fs = await import('fs/promises');
        await fs.writeFile(filename, JSON.stringify(questions, null, 2), 'utf8');
        // console.log(`Questions saved to ${filename}`);
    } catch (error) {
        throw new Error(`Failed to save questions to file: ${error.message}`);
    }
}

/**
 * Download questions as JSON file in browser
 * 
 * @param {Array} questions - Array of question objects
 * @param {string} filename - Download filename
 */
export function downloadQuestionsAsFile(questions, filename = 'quiz_questions.json') {
    if (typeof window === 'undefined') {
        throw new Error('Download functionality is only available in browser environments');
    }
    
    const dataStr = JSON.stringify(questions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

/**
 * CLI interface for question generation (Node.js only)
 */
export async function main() {
    if (typeof window !== 'undefined') {
        throw new Error('CLI interface is only available in Node.js environments');
    }
    
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        // console.log('Usage: node generate_questions.js <topic> [num_questions] [difficulty] [country] [grade_level]');
        // console.log('Example: node generate_questions.js "Python Programming" 10 medium "UK" "Year 10"');
        // console.log('Example: node generate_questions.js "Mathematics" 5 easy "US" "Grade 8"');
        process.exit(1);
    }
    
    const topic = args[0];
    const numQuestions = parseInt(args[1]) || 5;
    const difficulty = args[2] || 'medium';
    const country = args[3] || null;
    const gradeLevel = args[4] || null;
    
    try {
        let contextStr = '';
        if (gradeLevel || country) {
            const parts = [];
            if (gradeLevel) {
                parts.push(gradeLevel);
            }
            if (country) {
                parts.push(`${country} curriculum`);
            }
            contextStr = ` for ${parts.join(', ')}`;
        }
        
        // console.log(`Generating ${numQuestions} ${difficulty} questions about '${topic}'${contextStr}...`);
        const questions = await generateQuizQuestions(topic, numQuestions, difficulty, country, gradeLevel);
        
        // Save to file
        const filename = `questions_${topic.toLowerCase().replace(/\s+/g, '_')}.json`;
        await saveQuestionsToFile(questions, filename);
        
        // Print sample question
        // console.log('\nSample question:');
        // console.log(JSON.stringify(questions[0], null, 2));
        
    } catch (error) {
        // console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

// Run main function if this file is executed directly (Node.js only)
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
    main();
}