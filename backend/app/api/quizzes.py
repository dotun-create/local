from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Module, Quiz, Question, QuizResult, Lesson
from app import db
import uuid
from datetime import datetime

@api_bp.route('/modules/<string:module_id>/quizzes', methods=['GET'])
@jwt_required(optional=True)
def get_quizzes(module_id):
    """Get all quizzes for a module with visibility filtering based on user role"""
    try:
        from datetime import datetime
        
        module = Module.query.get(module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
        
        # Get current user if authenticated
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id) if current_user_id else None
        
        topics = request.args.get('topics')
        include_archived = request.args.get('includeArchived', 'false').lower() == 'true'
        
        # Base query for module quizzes
        quizzes = Quiz.query.filter_by(module_id=module_id)
        
        # Filter by status - default is to exclude archived
        if include_archived:
            # Include both active and archived quizzes
            quizzes = quizzes.filter(Quiz.status.in_(['active', 'archived']))
        else:
            # Only show active quizzes by default
            quizzes = quizzes.filter_by(status='active')
        
        if topics:
            topic_list = [topic.strip() for topic in topics.split(',')]
            quizzes = quizzes.filter(Quiz.topics.op('&&')(topic_list))
        
        # Filter based on user role and validity dates
        if current_user and current_user.account_type in ['admin', 'tutor']:
            # Admins and tutors see all quizzes
            quiz_list = quizzes.all()
        else:
            # Students and unauthenticated users only see valid quizzes
            now = datetime.utcnow()
            quizzes = quizzes.filter(
                (Quiz.valid_from <= now) | (Quiz.valid_from == None)
            ).filter(
                (Quiz.valid_until >= now) | (Quiz.valid_until == None)
            )
            quiz_list = quizzes.all()
        
        return jsonify({
            'quizzes': [quiz.to_dict() for quiz in quiz_list],
            'userRole': current_user.account_type if current_user else 'guest'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quizzes/<string:quiz_id>', methods=['GET'])
@jwt_required()
def get_quiz(quiz_id):
    """Get specific quiz with questions"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        quiz_data = quiz.to_dict()
        
        # Include questions for students/tutors taking the quiz
        if current_user.account_type in ['student', 'tutor', 'admin']:
            quiz_data['questions'] = [
                {
                    **question.to_dict(),
                    # Hide correct answers for students
                    'correctAnswer': question.correct_answer if current_user.account_type in ['tutor', 'admin'] else None
                }
                for question in sorted(quiz.questions, key=lambda q: q.order)
            ]
        
        return jsonify({'quiz': quiz_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/modules/<string:module_id>/quizzes', methods=['POST'])
@jwt_required()
def create_quiz(module_id):
    """Create new quiz (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        module = Module.query.get(module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
        
        data = request.get_json()
        required_fields = ['title']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Handle optional lesson_id
        lesson_id = data.get('lessonId')
        if lesson_id:
            lesson = Lesson.query.get(lesson_id)
            if not lesson or lesson.module_id != module_id:
                return jsonify({'error': 'Invalid lesson for this module'}), 400
        
        quiz = Quiz(
            id=f"quiz_{uuid.uuid4().hex[:8]}",
            module_id=module_id,
            lesson_id=lesson_id,
            title=data['title'],
            description=data.get('description'),
            time_limit=data.get('timeLimit'),
            passing_score=data.get('passingScore', 70),
            topics=data.get('topics', [])
        )
        
        db.session.add(quiz)
        db.session.commit()
        
        return jsonify({
            'quiz': quiz.to_dict(),
            'message': 'Quiz created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quizzes/<string:quiz_id>/questions', methods=['POST'])
@jwt_required()
def add_question_to_quiz(quiz_id):
    """Add question to quiz (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        data = request.get_json()
        required_fields = ['question', 'type']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get the next order number
        max_order = db.session.query(db.func.max(Question.order)).filter_by(quiz_id=quiz_id).scalar() or 0
        
        question = Question(
            id=f"question_{uuid.uuid4().hex[:8]}",
            quiz_id=quiz_id,
            question=data['question'],
            type=data['type'],
            options=data.get('options', []),
            correct_answer=data.get('correctAnswer'),
            explanation=data.get('explanation'),
            points=data.get('points', 1),
            order=data.get('order', max_order + 1)
        )
        
        db.session.add(question)
        db.session.commit()
        
        return jsonify({
            'question': question.to_dict(),
            'message': 'Question added successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quizzes/<string:quiz_id>/submit', methods=['POST'])
@jwt_required()
def submit_quiz(quiz_id):
    """Submit quiz answers"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'student':
            return jsonify({'error': 'Student access required'}), 403
        
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        data = request.get_json()
        answers = data.get('answers', [])
        time_spent = data.get('timeSpent', 0)
        
        if not answers:
            return jsonify({'error': 'No answers provided'}), 400
        
        # Calculate score
        correct_answers = 0
        total_questions = len(quiz.questions)
        
        for answer in answers:
            question_id = answer.get('questionId')
            user_answer = answer.get('answer')
            
            question = Question.query.get(question_id)
            if question and question.quiz_id == quiz_id:
                if question.type == 'multiple_choice':
                    if user_answer == question.correct_answer:
                        correct_answers += 1
                # For essay questions, assume they need manual grading
        
        score = int((correct_answers / total_questions) * 100) if total_questions > 0 else 0
        
        # Create quiz result
        result = QuizResult(
            id=f"result_{uuid.uuid4().hex[:8]}",
            quiz_id=quiz_id,
            student_id=current_user_id,
            course_id=quiz.module.course_id if quiz.module else None,
            module_id=quiz.module_id,
            score=score,
            total_questions=total_questions,
            correct_answers=correct_answers,
            time_spent=time_spent,
            answers=answers
        )
        
        db.session.add(result)
        db.session.commit()

        # Check for automatic tutor qualification (non-blocking)
        qualification_result = None
        try:
            if result.course_id:  # Only check if quiz is associated with a course
                from app.services.auto_qualification_service import AutoQualificationService
                auto_qualification_service = AutoQualificationService()

                qualification_result = auto_qualification_service.check_and_qualify_student(
                    student_id=current_user_id,
                    course_id=result.course_id,
                    quiz_result=result
                )

                # Log qualification result for debugging
                if qualification_result.get('qualified'):
                    current_app.logger.info(f"Student {current_user_id} automatically qualified for course {result.course_id}")
                else:
                    current_app.logger.debug(f"Student {current_user_id} not qualified for course {result.course_id}: {qualification_result.get('reason')}")

        except Exception as e:
            # Don't fail the quiz submission if auto-qualification fails
            current_app.logger.error(f"Auto-qualification check failed for student {current_user_id}, course {result.course_id}: {str(e)}")
            qualification_result = {'error': 'Auto-qualification check failed', 'exception': str(e)}

        # Prepare response
        response_data = {
            'result': result.to_dict(),
            'message': 'Quiz submitted successfully'
        }

        # Include qualification result if it occurred
        if qualification_result:
            response_data['autoQualification'] = qualification_result

        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quiz-results', methods=['GET'])
@jwt_required()
def get_quiz_results():
    """Get quiz results based on user role"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        student_id = request.args.get('studentId')
        course_id = request.args.get('courseId')
        module_id = request.args.get('moduleId')
        
        query = QuizResult.query
        
        # Filter by user role
        if current_user.account_type == 'student':
            query = query.filter_by(student_id=current_user_id)
        elif current_user.account_type == 'guardian':
            # Get results for students under this guardian
            from app.models import Enrollment
            enrolled_students = db.session.query(Enrollment.student_id).filter_by(guardian_id=current_user_id)
            query = query.filter(QuizResult.student_id.in_(enrolled_students))
        elif current_user.account_type == 'tutor':
            # Get results for courses taught by this tutor
            from app.models import course_tutors
            taught_courses = db.session.query(course_tutors.c.course_id).filter_by(tutor_id=current_user_id)
            query = query.filter(QuizResult.course_id.in_(taught_courses))
        elif current_user.account_type != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Apply additional filters
        if student_id:
            query = query.filter_by(student_id=student_id)
        if course_id:
            query = query.filter_by(course_id=course_id)
        if module_id:
            query = query.filter_by(module_id=module_id)
        
        results = query.order_by(QuizResult.completed_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        result_data = []
        for result in results.items:
            data = result.to_dict()
            # Add student and quiz info
            if result.student:
                data['student'] = {
                    'id': result.student.id,
                    'name': result.student.profile.get('name', result.student.email)
                }
            if result.quiz:
                data['quiz'] = {
                    'id': result.quiz.id,
                    'title': result.quiz.title
                }
            result_data.append(data)
        
        return jsonify({
            'results': result_data,
            'totalResults': results.total,
            'totalPages': results.pages,
            'currentPage': page,
            'hasNext': results.has_next,
            'hasPrev': results.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quiz-results/<string:result_id>', methods=['GET'])
@jwt_required()
def get_quiz_result(result_id):
    """Get specific quiz result"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        result = QuizResult.query.get(result_id)
        if not result:
            return jsonify({'error': 'Quiz result not found'}), 404
        
        # Check access permissions
        has_access = (
            current_user.account_type == 'admin' or
            result.student_id == current_user_id or
            (current_user.account_type == 'tutor' and result.quiz and 
             result.quiz.module and result.quiz.module.course and
             current_user in result.quiz.module.course.tutors)
        )
        
        if not has_access:
            return jsonify({'error': 'Access denied'}), 403
        
        result_data = result.to_dict()
        # Add detailed quiz and question info for review
        if result.quiz:
            quiz_data = result.quiz.to_dict()
            quiz_data['questions'] = [q.to_dict() for q in result.quiz.questions]
            result_data['quiz'] = quiz_data
        
        return jsonify({'result': result_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/modules/<string:module_id>/quizzes/with-questions', methods=['POST'])
@jwt_required()
def create_quiz_with_questions(module_id):
    """Create new quiz with questions automatically added (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        module = Module.query.get(module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
        
        data = request.get_json()
        required_fields = ['title', 'questions']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        questions_list = data.get('questions', [])
        if not isinstance(questions_list, list) or len(questions_list) == 0:
            return jsonify({'error': 'Questions must be a non-empty list'}), 400
        
        # Create the quiz first
        quiz = Quiz(
            id=f"quiz_{uuid.uuid4().hex[:8]}",
            module_id=module_id,
            title=data['title'],
            description=data.get('description'),
            time_limit=data.get('timeLimit'),
            passing_score=data.get('passingScore', 70),
            topics=data.get('topics', [])
        )
        
        db.session.add(quiz)
        db.session.flush()  # Flush to get the quiz ID for questions
        
        # Create questions for the quiz
        created_questions = []
        for index, question_data in enumerate(questions_list):
            # Validate required question fields
            if not question_data.get('question') or not question_data.get('type'):
                db.session.rollback()
                return jsonify({'error': f'Question at index {index} is missing required fields (question, type)'}), 400
            
            question = Question(
                id=f"question_{uuid.uuid4().hex[:8]}",
                quiz_id=quiz.id,
                question=question_data['question'],
                type=question_data['type'],
                options=question_data.get('options', []),
                correct_answer=question_data.get('correctAnswer'),
                explanation=question_data.get('explanation'),
                points=question_data.get('points', 1),
                order=index + 1  # Use index for ordering
            )
            
            db.session.add(question)
            created_questions.append(question)
        
        # Commit all changes
        db.session.commit()
        
        # Prepare response data
        quiz_data = quiz.to_dict()
        quiz_data['questions'] = [q.to_dict() for q in created_questions]
        
        return jsonify({
            'quiz': quiz_data,
            'message': f'Quiz created successfully with {len(created_questions)} questions'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/modules/<string:module_id>/quizzes/generate', methods=['POST'])
@api_bp.route('/modules/<string:module_id>/lessons/<string:lesson_id>/quizzes/generate', methods=['POST'])
@jwt_required()
def generate_quiz_with_ai(module_id, lesson_id=None):
    """Generate new quiz with AI-generated questions (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        module = Module.query.get(module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
        
        # Get lesson data if lesson_id is provided
        lesson = None
        if lesson_id:
            from app.models import Lesson
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return jsonify({'error': 'Lesson not found'}), 404
            
            # Verify lesson belongs to the module
            if lesson.module_id != module_id:
                return jsonify({'error': 'Lesson does not belong to the specified module'}), 400
        
        # Get course data for context
        course = module.course
        if not course:
            return jsonify({'error': 'Course not found for this module'}), 404
        
        data = request.get_json()
        required_fields = ['title']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get default values from environment variables
        import os
        default_num_questions = int(os.getenv('DEFAULT_QUIZ_QUESTIONS', 5))
        default_difficulty = os.getenv('DEFAULT_QUIZ_DIFFICULTY', 'medium')
        
        # Extract generation parameters with lesson context
        if lesson:
            # Use lesson title as default topic if available
            default_topic = f"{lesson.title}"
            context_description = f"Lesson: {lesson.title}"
            if lesson.description:
                context_description += f" - {lesson.description}"
        else:
            default_topic = course.subject
            context_description = f"Module: {module.title}"
        
        topic = data.get('topic', default_topic)
        num_questions = data.get('numQuestions', default_num_questions)
        difficulty = data.get('difficulty', default_difficulty)
        
        # Import the helper function
        from app.helpers.question_generator import generate_questions_for_course, QuestionGeneratorError, generate_quiz_questions
        
        # Generate questions using AI with lesson context
        try:
            # If we have a lesson, include lesson-specific context in the topic
            generation_topic = topic
            if lesson and lesson.description:
                generation_topic = f"{topic}. Focus on: {lesson.description[:200]}"

            questions_list = generate_quiz_questions(
                # course_subject=course.subject,
                country=course.country,
                grade_level=course.grade_level,
                topic=generation_topic,
                num_questions=num_questions,
                difficulty=difficulty
            )
            # questions_list = generate_questions_for_course(
            #     course_subject=course.subject,
            #     course_country=course.country,
            #     course_grade_level=course.grade_level,
            #     topic=generation_topic,
            #     num_questions=num_questions,
            #     difficulty=difficulty
            # )
        except QuestionGeneratorError as e:
            return jsonify({'error': f'Failed to generate questions: {str(e)}'}), 400
        
        # Create the quiz with appropriate description
        quiz_description = data.get('description')
        if not quiz_description:
            if lesson:
                quiz_description = f'AI-generated quiz for lesson: {lesson.title}'
            else:
                quiz_description = f'AI-generated quiz on {topic}'
        
        quiz = Quiz(
            id=f"quiz_{uuid.uuid4().hex[:8]}",
            module_id=module_id,
            lesson_id=lesson_id if lesson_id else None,
            title=data['title'],
            description=quiz_description,
            time_limit=data.get('timeLimit'),
            passing_score=data.get('passingScore', 70),
            topics=data.get('topics', [topic])
        )
        
        db.session.add(quiz)
        db.session.flush()  # Flush to get the quiz ID for questions
        
        # Create questions for the quiz
        created_questions = []
        for index, question_data in enumerate(questions_list):
            question = Question(
                id=f"question_{uuid.uuid4().hex[:8]}",
                quiz_id=quiz.id,
                question=question_data['question'],
                type=question_data['type'],
                options=question_data.get('options', []),
                correct_answer=question_data.get('correctAnswer'),
                explanation=question_data.get('explanation'),
                points=question_data.get('points', 1),
                order=index + 1
            )
            
            db.session.add(question)
            created_questions.append(question)
        
        # Commit all changes
        db.session.commit()
        
        # Prepare response data
        quiz_data = quiz.to_dict()
        quiz_data['questions'] = [q.to_dict() for q in created_questions]
        
        # Add context information to response
        response_data = {
            'quiz': quiz_data,
            'context': {
                'module': {'id': module.id, 'title': module.title},
                'course': {'id': course.id, 'title': course.title, 'subject': course.subject}
            },
            'message': f'Quiz created successfully with {len(created_questions)} AI-generated questions'
        }
        
        if lesson:
            response_data['context']['lesson'] = {'id': lesson.id, 'title': lesson.title}
            response_data['message'] += f' for lesson: {lesson.title}'
        
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quiz-generator/validate-config', methods=['GET'])
@jwt_required()
def validate_quiz_generator_config():
    """Validate OpenAI configuration for quiz generation (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        from app.helpers.question_generator import validate_openai_config
        
        config_status = validate_openai_config()
        
        return jsonify({
            'configured': config_status['valid'],
            'message': config_status['message'],
            'missing_variables': config_status.get('missing_vars', [])
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quizzes/<string:quiz_id>', methods=['PUT'])
@jwt_required()
def update_quiz(quiz_id):
    """Update quiz details including validity dates (admin and tutor only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Admin or tutor access required'}), 403
        
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        data = request.get_json()
        
        # Update basic quiz properties
        if 'title' in data:
            quiz.title = data['title']
        
        if 'description' in data:
            quiz.description = data['description']
        
        if 'passingScore' in data:
            quiz.passing_score = int(data['passingScore'])
        
        if 'timeLimit' in data:
            quiz.time_limit = int(data['timeLimit']) if data['timeLimit'] else None
        
        # Update validity dates
        if 'validFrom' in data:
            if data['validFrom']:
                quiz.valid_from = datetime.fromisoformat(data['validFrom'].replace('Z', '+00:00'))
            else:
                quiz.valid_from = datetime.utcnow()
        
        if 'validUntil' in data:
            if data['validUntil']:
                quiz.valid_until = datetime.fromisoformat(data['validUntil'].replace('Z', '+00:00'))
            else:
                quiz.valid_until = None
        
        # Validate that valid_from is before valid_until
        if quiz.valid_from and quiz.valid_until and quiz.valid_from >= quiz.valid_until:
            return jsonify({'error': 'Valid from date must be before valid until date'}), 400
        
        # Validate passing score range
        if quiz.passing_score < 0 or quiz.passing_score > 100:
            return jsonify({'error': 'Passing score must be between 0 and 100'}), 400
        
        db.session.commit()
        
        return jsonify({
            'message': 'Quiz updated successfully',
            'quiz': quiz.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quizzes/<string:quiz_id>/validity', methods=['PUT'])
@jwt_required()
def update_quiz_validity(quiz_id):
    """Update quiz validity dates (admin and tutor only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Admin or tutor access required'}), 403
        
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        data = request.get_json()
        
        # Update valid_from if provided
        if 'validFrom' in data:
            if data['validFrom']:
                quiz.valid_from = datetime.fromisoformat(data['validFrom'].replace('Z', '+00:00'))
            else:
                quiz.valid_from = datetime.utcnow()
        
        # Update valid_until if provided
        if 'validUntil' in data:
            if data['validUntil']:
                quiz.valid_until = datetime.fromisoformat(data['validUntil'].replace('Z', '+00:00'))
            else:
                quiz.valid_until = None
        
        # Validate that valid_from is before valid_until
        if quiz.valid_from and quiz.valid_until and quiz.valid_from >= quiz.valid_until:
            return jsonify({'error': 'Valid from date must be before valid until date'}), 400
        
        db.session.commit()
        
        return jsonify({
            'message': 'Quiz validity dates updated successfully',
            'quiz': quiz.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quizzes/<string:quiz_id>/archive', methods=['PUT'])
@jwt_required()
def archive_quiz(quiz_id):
    """Archive a quiz (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        if quiz.status == 'archived':
            return jsonify({'error': 'Quiz is already archived'}), 400
        
        quiz.status = 'archived'
        db.session.commit()
        
        return jsonify({
            'message': f'Quiz "{quiz.title}" archived successfully',
            'quiz': quiz.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quizzes/<string:quiz_id>/unarchive', methods=['PUT'])
@jwt_required()
def unarchive_quiz(quiz_id):
    """Unarchive a quiz (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        if quiz.status != 'archived':
            return jsonify({'error': 'Quiz is not archived'}), 400
        
        quiz.status = 'active'
        db.session.commit()
        
        return jsonify({
            'message': f'Quiz "{quiz.title}" unarchived successfully',
            'quiz': quiz.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/quizzes/<string:quiz_id>', methods=['DELETE'])
@jwt_required()
def delete_quiz(quiz_id):
    """Delete a quiz with validation (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        quiz = Quiz.query.get(quiz_id)
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
        
        # Store quiz title for response
        quiz_title = quiz.title
        
        # Check if there are any quiz results
        results_count = QuizResult.query.filter_by(quiz_id=quiz_id).count()
        
        if results_count > 0:
            # Prevent deletion if results exist
            return jsonify({
                'error': f'Cannot delete quiz "{quiz_title}". {results_count} quiz result(s) exist. Consider archiving instead or delete the results first.'
            }), 400
        
        # Check if there are questions (for logging purposes)
        questions_count = Question.query.filter_by(quiz_id=quiz_id).count()
        
        # Delete the quiz (questions will cascade delete based on foreign key constraints)
        db.session.delete(quiz)
        db.session.commit()
        
        return jsonify({
            'message': f'Quiz "{quiz_title}" and its {questions_count} question(s) deleted successfully',
            'deleted': {
                'quiz_id': quiz_id,
                'quiz_title': quiz_title,
                'questions_deleted': questions_count
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
@api_bp.route('/lessons/<string:lesson_id>/quizzes', methods=['GET'])
@jwt_required(optional=True)
def get_lesson_quizzes(lesson_id):
    """Get all quizzes for a specific lesson"""
    try:
        lesson = Lesson.query.get(lesson_id)
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        # Get active quizzes for this lesson
        quizzes = Quiz.query.filter_by(
            lesson_id=lesson_id,
            status='active'
        ).order_by(Quiz.created_at.desc()).all()
        
        return jsonify({
            'quizzes': [quiz.to_dict() for quiz in quizzes],
            'totalQuizzes': len(quizzes),
            'lessonId': lesson_id,
            'lessonTitle': lesson.title
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/lessons/<string:lesson_id>/quizzes/latest', methods=['GET'])
@jwt_required(optional=True)
def get_latest_lesson_quiz(lesson_id):
    """Get the most recent active quiz for a lesson"""
    try:
        lesson = Lesson.query.get(lesson_id)
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        quiz = Quiz.query.filter_by(
            lesson_id=lesson_id,
            status='active'
        ).order_by(Quiz.created_at.desc()).first()
        
        if not quiz:
            return jsonify({'error': 'No quiz found for this lesson'}), 404
        
        return jsonify({'quiz': quiz.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
