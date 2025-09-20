#!/usr/bin/env python3
"""
Migration script to link existing quizzes to lessons based on quiz descriptions.

This script analyzes quiz descriptions that contain "lesson:" and attempts to match them
with actual lessons in the database. It then updates the lesson_id field for those quizzes.
"""

import re
from app import create_app, db
from app.models import Quiz, Lesson
from sqlalchemy import text

def migrate_quizzes_to_lessons():
    """Migrate existing quizzes to be linked with lessons"""
    app = create_app()
    
    with app.app_context():
        print("🔄 Starting quiz-to-lesson migration...")
        
        # Get all quizzes without lesson_id
        quizzes_without_lessons = Quiz.query.filter_by(lesson_id=None).all()
        print(f"📊 Found {len(quizzes_without_lessons)} quizzes without lesson links")
        
        successful_links = 0
        failed_links = 0
        
        for quiz in quizzes_without_lessons:
            print(f"\n📝 Processing quiz: {quiz.title}")
            print(f"   Description: {quiz.description}")
            print(f"   Module: {quiz.module_id}")
            
            # Try to extract lesson info from description
            lesson_match = None
            if quiz.description and 'lesson:' in quiz.description.lower():
                # Extract lesson title from description
                match = re.search(r'lesson:\s*(.+?)(?:\.|$)', quiz.description, re.IGNORECASE)
                if match:
                    lesson_title = match.group(1).strip()
                    print(f"   📖 Extracted lesson title: '{lesson_title}'")
                    
                    # Find matching lesson in the same module
                    lesson = Lesson.query.filter_by(
                        module_id=quiz.module_id,
                        title=lesson_title
                    ).first()
                    
                    if lesson:
                        lesson_match = lesson
                        print(f"   ✅ Found matching lesson: {lesson.id}")
                    else:
                        # Try partial matching (case-insensitive)
                        lessons_in_module = Lesson.query.filter_by(module_id=quiz.module_id).all()
                        for lesson in lessons_in_module:
                            if lesson_title.lower() in lesson.title.lower() or lesson.title.lower() in lesson_title.lower():
                                lesson_match = lesson
                                print(f"   ✅ Found partial match: {lesson.id} - {lesson.title}")
                                break
                        
                        if not lesson_match:
                            print(f"   ❌ No matching lesson found for '{lesson_title}'")
            
            # Link quiz to lesson if we found a match
            if lesson_match:
                quiz.lesson_id = lesson_match.id
                successful_links += 1
                print(f"   🔗 Linked quiz {quiz.id} to lesson {lesson_match.id}")
            else:
                failed_links += 1
                print(f"   ⚠️  Could not link quiz {quiz.id}")
        
        # Commit changes
        try:
            db.session.commit()
            print(f"\n✅ Migration completed successfully!")
            print(f"   📈 Successful links: {successful_links}")
            print(f"   ⚠️  Failed links: {failed_links}")
            print(f"   📊 Total processed: {len(quizzes_without_lessons)}")
            
            # Show summary
            print(f"\n📋 Summary:")
            print(f"   - Quizzes now linked to lessons: {successful_links}")
            print(f"   - Quizzes still unlinked: {failed_links}")
            
            # Show linked quizzes
            if successful_links > 0:
                print(f"\n🔗 Newly linked quizzes:")
                linked_quizzes = Quiz.query.filter(Quiz.lesson_id.isnot(None)).all()
                for quiz in linked_quizzes:
                    lesson = quiz.lesson
                    print(f"   - {quiz.title} → {lesson.title} (Lesson: {lesson.id})")
                    
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Migration failed: {e}")
            return False
            
        return True

def verify_migration():
    """Verify the migration results"""
    app = create_app()
    
    with app.app_context():
        print("\n🔍 Verifying migration results...")
        
        total_quizzes = Quiz.query.count()
        linked_quizzes = Quiz.query.filter(Quiz.lesson_id.isnot(None)).count()
        unlinked_quizzes = Quiz.query.filter_by(lesson_id=None).count()
        
        print(f"📊 Quiz Statistics:")
        print(f"   - Total quizzes: {total_quizzes}")
        print(f"   - Linked to lessons: {linked_quizzes}")
        print(f"   - Unlinked: {unlinked_quizzes}")
        print(f"   - Link percentage: {(linked_quizzes/total_quizzes*100):.1f}%")
        
        # Test new endpoints
        print(f"\n🧪 Testing new lesson quiz endpoints...")
        
        # Find a lesson with quizzes
        lesson_with_quizzes = Lesson.query.join(Quiz).first()
        if lesson_with_quizzes:
            print(f"   - Found lesson '{lesson_with_quizzes.title}' with {len(lesson_with_quizzes.quizzes)} quiz(es)")
            print(f"   - Lesson ID: {lesson_with_quizzes.id}")
            
            # Show quiz details
            for quiz in lesson_with_quizzes.quizzes:
                print(f"     * Quiz: {quiz.title} (ID: {quiz.id})")
        else:
            print(f"   ⚠️  No lessons found with linked quizzes")

if __name__ == "__main__":
    print("🚀 Quiz-to-Lesson Migration Tool")
    print("=" * 50)
    
    try:
        # Run migration
        success = migrate_quizzes_to_lessons()
        
        if success:
            # Verify results
            verify_migration()
            print(f"\n✅ Migration completed successfully!")
            print(f"\n💡 Next steps:")
            print(f"   1. Test the 'Start Quiz' button in the student interface")
            print(f"   2. Verify that lesson-specific quizzes are returned")
            print(f"   3. Check that quiz navigation works correctly")
        else:
            print(f"\n❌ Migration failed. Check the errors above.")
            
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        import traceback
        traceback.print_exc()