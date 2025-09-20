from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Quiz, QuizResult, Enrollment
from app import db
from datetime import datetime, timedelta

@api_bp.route('/students/upcoming-tasks', methods=['GET'])
@jwt_required()
def get_upcoming_tasks():
    """Get upcoming tasks for a student including quiz deadlines"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        print(f"[DEBUG] Student Tasks API called by user: {current_user_id}")
        
        if not current_user or current_user.account_type != 'student':
            print(f"[DEBUG] User {current_user_id} access denied - account type: {current_user.account_type if current_user else 'None'}")
            return jsonify({'error': 'Student access required'}), 403
        
        tasks = []
        now = datetime.utcnow()
        
        # Get student's enrolled courses
        enrollments = Enrollment.query.filter_by(student_id=current_user_id).all()
        enrolled_course_ids = [enrollment.course_id for enrollment in enrollments]
        
        print(f"[DEBUG] Found {len(enrollments)} enrollments for student: {enrolled_course_ids}")
        
        if enrolled_course_ids:
            # Get upcoming quizzes from enrolled courses
            from app.models import Module
            upcoming_quizzes = db.session.query(Quiz).join(
                Module, Quiz.module_id == Module.id
            ).filter(
                Module.course_id.in_(enrolled_course_ids),
                Quiz.status == 'active',
                Quiz.valid_until.isnot(None),
                Quiz.valid_until > now
            ).order_by(Quiz.valid_until.asc()).all()
            
            print(f"[DEBUG] Found {len(upcoming_quizzes)} upcoming quizzes")
            
            # Check which quizzes the student hasn't taken yet
            taken_quiz_ids = db.session.query(QuizResult.quiz_id).filter_by(
                student_id=current_user_id
            ).distinct().subquery()
            
            for quiz in upcoming_quizzes:
                # Skip if already taken
                if db.session.query(taken_quiz_ids).filter(
                    taken_quiz_ids.c.quiz_id == quiz.id
                ).first():
                    continue
                
                # Calculate urgency
                time_until_due = quiz.valid_until - now
                days_until_due = time_until_due.days
                hours_until_due = time_until_due.total_seconds() / 3600
                
                # Determine priority based on time remaining
                if hours_until_due <= 24:
                    priority = 'high'
                    urgency_text = f"{int(hours_until_due)}h remaining"
                elif days_until_due <= 3:
                    priority = 'medium' 
                    urgency_text = f"{days_until_due} days remaining"
                else:
                    priority = 'low'
                    urgency_text = f"{days_until_due} days remaining"
                
                task = {
                    'id': f"quiz_{quiz.id}",
                    'name': quiz.title,
                    'taskType': 'Quiz',
                    'type': 'quiz',
                    'priority': priority,
                    'dueDate': quiz.valid_until.isoformat(),
                    'urgencyText': urgency_text,
                    'hoursRemaining': int(hours_until_due),
                    'daysRemaining': days_until_due,
                    'course': quiz.module.course.title if quiz.module and quiz.module.course else 'Unknown Course',
                    'module': quiz.module.title if quiz.module else 'Unknown Module',
                    'link': f"/courses/{quiz.module.course_id}/modules/{quiz.module_id}/quizzes/{quiz.id}",
                    'quizId': quiz.id,
                    'moduleId': quiz.module_id,
                    'courseId': quiz.module.course_id if quiz.module else None,
                    'description': quiz.description or f"Complete the quiz for {quiz.module.title if quiz.module else 'this module'}",
                    'timeLimit': quiz.time_limit,
                    'passingScore': quiz.passing_score or 70
                }
                tasks.append(task)
        
        # Sort by urgency (high priority first, then by due date)
        tasks.sort(key=lambda x: (
            0 if x['priority'] == 'high' else 1 if x['priority'] == 'medium' else 2,
            x['dueDate']
        ))
        
        return jsonify({
            'tasks': tasks,
            'totalTasks': len(tasks),
            'highPriorityTasks': len([t for t in tasks if t['priority'] == 'high']),
            'mediumPriorityTasks': len([t for t in tasks if t['priority'] == 'medium']),
            'lowPriorityTasks': len([t for t in tasks if t['priority'] == 'low'])
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/students/task-summary', methods=['GET'])
@jwt_required()
def get_task_summary():
    """Get a summary of upcoming tasks for dashboard display"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'student':
            return jsonify({'error': 'Student access required'}), 403
        
        # Get the full task list
        tasks_response = get_upcoming_tasks()
        if tasks_response[1] != 200:
            return tasks_response
            
        tasks_data = tasks_response[0].get_json()
        tasks = tasks_data['tasks']
        
        # Return summary for dashboard
        summary_tasks = []
        for task in tasks[:4]:  # Limit to 4 most urgent tasks
            summary_tasks.append({
                'id': task['id'],
                'task': task['name'],
                'course': task['course'],
                'type': task['type'],
                'priority': task['priority'],
                'dueDate': task['dueDate'],
                'urgencyText': task['urgencyText']
            })
        
        return jsonify({
            'tasks': summary_tasks,
            'totalTasks': len(tasks),
            'highPriorityCount': tasks_data['highPriorityTasks']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500