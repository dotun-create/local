from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Course, Module, Session, Enrollment, QuizResult, Invoice, TutorEarning
from app import db
from datetime import datetime, timedelta
from sqlalchemy import func, and_

@api_bp.route('/analytics/admin', methods=['GET'])
@api_bp.route('/analytics/overview', methods=['GET'])
@jwt_required()
def get_analytics_overview():
    """Get analytics overview (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Basic counts
        total_users = User.query.count()
        total_students = User.query.filter_by(account_type='student').count()
        total_guardians = User.query.filter_by(account_type='guardian').count()
        total_tutors = User.query.filter_by(account_type='tutor').count()
        total_courses = Course.query.filter_by(status='active').count()
        total_modules = Module.query.count()
        total_sessions = Session.query.count()
        total_enrollments = Enrollment.query.filter_by(status='active').count()
        
        # Revenue analytics
        total_revenue = db.session.query(func.sum(Invoice.amount)).filter_by(status='paid').scalar() or 0
        pending_revenue = db.session.query(func.sum(Invoice.amount)).filter_by(status='pending').scalar() or 0
        
        # Monthly revenue (last 12 months)
        monthly_revenue = []
        for i in range(12):
            start_date = datetime.now().replace(day=1) - timedelta(days=30*i)
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            revenue = db.session.query(func.sum(Invoice.amount)).filter(
                and_(
                    Invoice.status == 'paid',
                    Invoice.payment_date >= start_date,
                    Invoice.payment_date <= end_date
                )
            ).scalar() or 0
            
            monthly_revenue.append({
                'month': start_date.strftime('%Y-%m'),
                'revenue': revenue
            })
        
        monthly_revenue.reverse()
        
        # Quiz performance
        total_quizzes_taken = QuizResult.query.count()
        avg_quiz_score = db.session.query(func.avg(QuizResult.score)).scalar() or 0
        
        # Top performing courses
        top_courses = db.session.query(
            Course.id,
            Course.title,
            func.count(Enrollment.id).label('enrollments')
        ).join(
            Enrollment, Course.id == Enrollment.course_id
        ).filter(
            Enrollment.status == 'active'
        ).group_by(
            Course.id, Course.title
        ).order_by(
            func.count(Enrollment.id).desc()
        ).limit(5).all()
        
        return jsonify({
            'totalUsers': total_users,
            'totalStudents': total_students,
            'totalGuardians': total_guardians,
            'totalTutors': total_tutors,
            'totalCourses': total_courses,
            'totalModules': total_modules,
            'totalSessions': total_sessions,
            'totalEnrollments': total_enrollments,
            'activeEnrollments': total_enrollments,  # Assuming active enrollments = total enrollments
            'totalRevenue': total_revenue,
            'pendingRevenue': pending_revenue,
            'pendingPayments': db.session.query(func.count(Invoice.id)).filter_by(status='pending').scalar() or 0,
            'totalQuizzesTaken': total_quizzes_taken,
            'averageQuizScore': round(avg_quiz_score, 2),
            'monthlyRevenue': monthly_revenue,
            'topCourses': [
                {
                    'id': course.id,
                    'title': course.title,
                    'enrollments': course.enrollments
                }
                for course in top_courses
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/analytics/student-performance', methods=['GET'])
@jwt_required()
def get_student_performance():
    """Get student performance analytics"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        student_id = request.args.get('studentId', current_user_id)
        
        # Check permissions
        if current_user.account_type == 'student' and student_id != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        elif current_user.account_type == 'guardian':
            # Check if student is under this guardian
            enrollment = Enrollment.query.filter_by(
                student_id=student_id,
                guardian_id=current_user_id
            ).first()
            if not enrollment:
                return jsonify({'error': 'Access denied'}), 403
        elif current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get student's quiz results
        quiz_results = QuizResult.query.filter_by(student_id=student_id).all()
        
        if not quiz_results:
            return jsonify({
                'studentId': student_id,
                'totalQuizzes': 0,
                'averageScore': 0,
                'quizzesPassed': 0,
                'quizzesFailed': 0,
                'recentResults': [],
                'performanceBySubject': []
            }), 200
        
        total_quizzes = len(quiz_results)
        average_score = sum(result.score for result in quiz_results) / total_quizzes
        quizzes_passed = len([r for r in quiz_results if r.score >= 70])  # Assuming 70% is passing
        quizzes_failed = total_quizzes - quizzes_passed
        
        # Recent quiz results (last 10)
        recent_results = sorted(quiz_results, key=lambda x: x.completed_at, reverse=True)[:10]
        recent_data = []
        for result in recent_results:
            data = result.to_dict()
            if result.quiz and result.quiz.module and result.quiz.module.course:
                data['course'] = result.quiz.module.course.title
                data['module'] = result.quiz.module.title
            recent_data.append(data)
        
        # Performance by subject
        subject_performance = {}
        for result in quiz_results:
            if result.quiz and result.quiz.module and result.quiz.module.course:
                subject = result.quiz.module.course.subject or 'General'
                if subject not in subject_performance:
                    subject_performance[subject] = {'scores': [], 'total': 0}
                subject_performance[subject]['scores'].append(result.score)
                subject_performance[subject]['total'] += 1
        
        performance_by_subject = []
        for subject, data in subject_performance.items():
            avg_score = sum(data['scores']) / len(data['scores'])
            performance_by_subject.append({
                'subject': subject,
                'averageScore': round(avg_score, 2),
                'totalQuizzes': data['total']
            })
        
        return jsonify({
            'studentId': student_id,
            'totalQuizzes': total_quizzes,
            'averageScore': round(average_score, 2),
            'quizzesPassed': quizzes_passed,
            'quizzesFailed': quizzes_failed,
            'recentResults': recent_data,
            'performanceBySubject': performance_by_subject
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/analytics/tutor-earnings', methods=['GET'])
@jwt_required()
def get_tutor_earnings_analytics():
    """Get tutor earnings analytics"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        tutor_id = request.args.get('tutorId', current_user_id)
        
        # Check permissions
        if current_user.account_type == 'tutor' and tutor_id != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        elif current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get tutor's earnings
        earnings = TutorEarning.query.filter_by(tutor_id=tutor_id).all()
        
        if not earnings:
            return jsonify({
                'tutorId': tutor_id,
                'totalEarnings': 0,
                'pendingEarnings': 0,
                'paidEarnings': 0,
                'totalSessions': 0,
                'monthlyEarnings': [],
                'averagePerSession': 0
            }), 200
        
        total_earnings = sum(earning.amount for earning in earnings)
        pending_earnings = sum(earning.amount for earning in earnings if earning.status == 'pending')
        paid_earnings = sum(earning.amount for earning in earnings if earning.status == 'paid')
        total_sessions = len(earnings)
        average_per_session = total_earnings / total_sessions if total_sessions > 0 else 0
        
        # Monthly earnings (last 12 months)
        monthly_earnings = []
        for i in range(12):
            start_date = datetime.now().replace(day=1) - timedelta(days=30*i)
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            month_earnings = sum(
                earning.amount for earning in earnings
                if start_date <= earning.earned_date <= end_date
            )
            
            monthly_earnings.append({
                'month': start_date.strftime('%Y-%m'),
                'earnings': month_earnings
            })
        
        monthly_earnings.reverse()
        
        return jsonify({
            'tutorId': tutor_id,
            'totalEarnings': total_earnings,
            'pendingEarnings': pending_earnings,
            'paidEarnings': paid_earnings,
            'totalSessions': total_sessions,
            'monthlyEarnings': monthly_earnings,
            'averagePerSession': round(average_per_session, 2)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/analytics/course-performance', methods=['GET'])
@jwt_required()
def get_course_performance():
    """Get course performance analytics (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        course_id = request.args.get('courseId')
        
        if course_id:
            # Specific course analytics
            course = Course.query.get(course_id)
            if not course:
                return jsonify({'error': 'Course not found'}), 404
            
            enrollments = Enrollment.query.filter_by(course_id=course_id).all()
            active_enrollments = [e for e in enrollments if e.status == 'active']
            completed_enrollments = [e for e in enrollments if e.progress == 100]
            
            # Quiz performance for this course
            quiz_results = QuizResult.query.filter_by(course_id=course_id).all()
            avg_quiz_score = sum(r.score for r in quiz_results) / len(quiz_results) if quiz_results else 0
            
            return jsonify({
                'courseId': course_id,
                'courseTitle': course.title,
                'totalEnrollments': len(enrollments),
                'activeEnrollments': len(active_enrollments),
                'completedEnrollments': len(completed_enrollments),
                'completionRate': (len(completed_enrollments) / len(enrollments) * 100) if enrollments else 0,
                'averageQuizScore': round(avg_quiz_score, 2),
                'totalQuizzesTaken': len(quiz_results)
            }), 200
        else:
            # All courses overview
            courses = Course.query.filter_by(status='active').all()
            course_data = []
            
            for course in courses:
                enrollments = Enrollment.query.filter_by(course_id=course.id).all()
                active_enrollments = [e for e in enrollments if e.status == 'active']
                quiz_results = QuizResult.query.filter_by(course_id=course.id).all()
                avg_score = sum(r.score for r in quiz_results) / len(quiz_results) if quiz_results else 0
                
                course_data.append({
                    'id': course.id,
                    'title': course.title,
                    'subject': course.subject,
                    'totalEnrollments': len(enrollments),
                    'activeEnrollments': len(active_enrollments),
                    'averageQuizScore': round(avg_score, 2),
                    'totalQuizzes': len(quiz_results)
                })
            
            return jsonify({'courses': course_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500