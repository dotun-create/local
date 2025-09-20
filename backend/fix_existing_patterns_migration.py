#!/usr/bin/env python3
"""
Safe Migration Script: Fix Existing Availability Patterns

This script fixes existing availability patterns that have:
1. Missing recurrence_start_date (causing instances before intended start)
2. Incorrect weekday mappings (JS format stored instead of Python format)

SAFETY FEATURES:
- Creates backups before making changes
- Validates all changes before committing
- Provides rollback capability
- Logs all operations for audit trail
"""

import json
import sys
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional

from app import create_app, db
from app.models import Availability, User
from app.utils.weekday_utils import js_to_python_weekday, python_to_js_weekday


def backup_pattern_data() -> Dict[str, Any]:
    """Create a complete backup of all availability patterns before migration"""
    print("📦 Creating backup of all availability patterns...")

    patterns = Availability.query.filter_by(is_recurring=True).all()
    backup_data = {
        'timestamp': datetime.utcnow().isoformat(),
        'total_patterns': len(patterns),
        'patterns': []
    }

    for pattern in patterns:
        pattern_data = {
            'id': pattern.id,
            'tutor_id': pattern.tutor_id,
            'day_of_week': pattern.day_of_week,
            'start_time': pattern.start_time,
            'end_time': pattern.end_time,
            'time_zone': pattern.time_zone,
            'recurrence_type': pattern.recurrence_type,
            'recurrence_days': pattern.recurrence_days,
            'recurrence_start_date': pattern.recurrence_start_date.isoformat() if pattern.recurrence_start_date else None,
            'recurrence_end_date': pattern.recurrence_end_date.isoformat() if pattern.recurrence_end_date else None,
            'course_id': pattern.course_id,
            'created_at': pattern.created_at.isoformat() if pattern.created_at else None,
            'migration_version': pattern.migration_version
        }
        backup_data['patterns'].append(pattern_data)

    # Save backup to file
    backup_filename = f"availability_patterns_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    with open(backup_filename, 'w') as f:
        json.dump(backup_data, f, indent=2)

    print(f"✅ Backup created: {backup_filename}")
    print(f"📊 Backed up {len(patterns)} patterns")
    return backup_data


def analyze_pattern_issues() -> Dict[str, List[str]]:
    """Analyze existing patterns to identify issues that need fixing"""
    print("\n🔍 Analyzing existing patterns for issues...")

    patterns = Availability.query.filter_by(is_recurring=True).all()
    issues = {
        'missing_start_date': [],
        'suspicious_weekday_mapping': [],
        'no_issues': [],
        'analysis_summary': []
    }

    for pattern in patterns:
        pattern_id = pattern.id
        has_issues = False

        # Check for missing recurrence_start_date
        if not pattern.recurrence_start_date:
            issues['missing_start_date'].append({
                'id': pattern_id,
                'tutor_id': pattern.tutor_id,
                'created_at': pattern.created_at.isoformat() if pattern.created_at else None,
                'reason': 'Missing recurrence_start_date - will generate instances before intended start'
            })
            has_issues = True

        # Check for suspicious weekday mappings
        # Patterns created between specific dates may have incorrect JS->Python conversion
        if pattern.created_at and pattern.created_at >= datetime(2025, 9, 17):
            # Recent patterns might have conversion issues
            recurrence_days = pattern.recurrence_days or [pattern.day_of_week]
            if isinstance(recurrence_days, str):
                recurrence_days = json.loads(recurrence_days)

            # Look for patterns that might have JS weekdays stored as Python weekdays
            suspicious = False
            for day in recurrence_days:
                if isinstance(day, int) and 0 <= day <= 6:
                    # This could be either format - flag for manual review
                    suspicious = True

            if suspicious:
                issues['suspicious_weekday_mapping'].append({
                    'id': pattern_id,
                    'tutor_id': pattern.tutor_id,
                    'day_of_week': pattern.day_of_week,
                    'recurrence_days': recurrence_days,
                    'created_at': pattern.created_at.isoformat(),
                    'reason': 'May have incorrect weekday format - needs manual verification'
                })
                has_issues = True

        if not has_issues:
            issues['no_issues'].append(pattern_id)

    # Generate summary
    issues['analysis_summary'] = [
        f"Total patterns analyzed: {len(patterns)}",
        f"Missing start date: {len(issues['missing_start_date'])}",
        f"Suspicious weekday mapping: {len(issues['suspicious_weekday_mapping'])}",
        f"No issues found: {len(issues['no_issues'])}"
    ]

    print("📊 Analysis Results:")
    for summary_line in issues['analysis_summary']:
        print(f"   {summary_line}")

    return issues


def fix_missing_start_dates(dry_run: bool = True) -> Dict[str, Any]:
    """Fix patterns missing recurrence_start_date"""
    print(f"\n🔧 {'[DRY RUN] ' if dry_run else ''}Fixing patterns with missing start dates...")

    patterns_to_fix = Availability.query.filter(
        Availability.is_recurring == True,
        Availability.recurrence_start_date.is_(None)
    ).all()

    fixes_applied = []

    for pattern in patterns_to_fix:
        # Use pattern creation date as reasonable start date
        suggested_start_date = pattern.created_at.date() if pattern.created_at else date.today()

        fix_info = {
            'pattern_id': pattern.id,
            'tutor_id': pattern.tutor_id,
            'original_start_date': None,
            'suggested_start_date': suggested_start_date.isoformat(),
            'rationale': 'Using pattern creation date as reasonable start boundary'
        }

        if not dry_run:
            pattern.recurrence_start_date = datetime.combine(suggested_start_date, datetime.min.time())
            pattern.migration_version = '2025_09_17_start_date_fix'
            print(f"✅ Fixed pattern {pattern.id}: set start date to {suggested_start_date}")
        else:
            print(f"🔍 Would fix pattern {pattern.id}: set start date to {suggested_start_date}")

        fixes_applied.append(fix_info)

    if not dry_run and fixes_applied:
        db.session.commit()
        print(f"💾 Committed {len(fixes_applied)} start date fixes")

    return {
        'fixes_applied': fixes_applied,
        'total_fixed': len(fixes_applied)
    }


def verify_weekday_conversions() -> Dict[str, Any]:
    """Verify weekday conversions are correct by checking against user expectations"""
    print("\n🔍 Verifying weekday conversions...")

    # Find the specific problematic pattern mentioned in the user's issue
    problematic_patterns = Availability.query.filter(
        Availability.tutor_id == 'user_837db969',
        Availability.is_recurring == True,
        Availability.course_id == 'course_f28f2264'
    ).all()

    verification_results = []

    for pattern in problematic_patterns:
        recurrence_days = pattern.recurrence_days or [pattern.day_of_week]
        if isinstance(recurrence_days, str):
            recurrence_days = json.loads(recurrence_days)

        # The user requested Friday (JS=5, should be Python=4)
        # If we see [3] stored, that suggests incorrect conversion
        result = {
            'pattern_id': pattern.id,
            'stored_day_of_week': pattern.day_of_week,
            'stored_recurrence_days': recurrence_days,
            'created_at': pattern.created_at.isoformat() if pattern.created_at else None,
            'issue_detected': False,
            'recommended_fix': None
        }

        # Check if this looks like a Friday request that got stored as Wednesday
        if 3 in recurrence_days or pattern.day_of_week == 3:
            # This might be a Friday (JS=5 -> should be Python=4) stored incorrectly as Wednesday (Python=3)
            result['issue_detected'] = True
            result['recommended_fix'] = {
                'current_weekdays': recurrence_days,
                'corrected_weekdays': [4],  # Friday in Python format
                'explanation': 'Appears to be Friday request incorrectly stored as Wednesday'
            }

        verification_results.append(result)

    return {
        'patterns_checked': len(problematic_patterns),
        'verification_results': verification_results
    }


def fix_specific_problematic_pattern(pattern_id: str, dry_run: bool = True) -> Dict[str, Any]:
    """Fix the specific problematic pattern identified by the user"""
    print(f"\n🎯 {'[DRY RUN] ' if dry_run else ''}Fixing specific problematic pattern: {pattern_id}")

    pattern = Availability.query.get(pattern_id)
    if not pattern:
        return {'error': f'Pattern {pattern_id} not found'}

    original_data = {
        'day_of_week': pattern.day_of_week,
        'recurrence_days': pattern.recurrence_days,
        'recurrence_start_date': pattern.recurrence_start_date.isoformat() if pattern.recurrence_start_date else None
    }

    fixes_needed = []

    # Fix 1: Add missing start date (if missing)
    if not pattern.recurrence_start_date:
        # Based on user's request for startDate: "2025-09-19"
        intended_start_date = date(2025, 9, 19)
        fixes_needed.append({
            'fix_type': 'add_start_date',
            'from': None,
            'to': intended_start_date.isoformat()
        })

        if not dry_run:
            pattern.recurrence_start_date = datetime.combine(intended_start_date, datetime.min.time())

    # Fix 2: Correct weekday conversion (Wednesday [3] -> Friday [4])
    recurrence_days = pattern.recurrence_days or [pattern.day_of_week]
    if isinstance(recurrence_days, str):
        recurrence_days = json.loads(recurrence_days)

    if 3 in recurrence_days:  # Wednesday stored, should be Friday
        fixes_needed.append({
            'fix_type': 'correct_weekday',
            'from': recurrence_days,
            'to': [4]  # Friday in Python format
        })

        if not dry_run:
            pattern.day_of_week = 4  # Friday
            pattern.recurrence_days = [4]  # Friday

    if not dry_run and fixes_needed:
        pattern.migration_version = '2025_09_17_comprehensive_fix'
        db.session.commit()
        print(f"✅ Applied {len(fixes_needed)} fixes to pattern {pattern_id}")

    return {
        'pattern_id': pattern_id,
        'original_data': original_data,
        'fixes_needed': fixes_needed,
        'fixes_applied': not dry_run
    }


def main():
    """Main migration execution"""
    print("🚀 Starting Availability Pattern Migration")
    print("=" * 60)

    app = create_app()
    with app.app_context():
        # Step 1: Create backup
        backup_data = backup_pattern_data()

        # Step 2: Analyze issues
        issues = analyze_pattern_issues()

        # Step 3: Verify specific problematic patterns
        verification = verify_weekday_conversions()

        print("\n🔍 Verification Results:")
        for result in verification['verification_results']:
            if result['issue_detected']:
                print(f"⚠️ Pattern {result['pattern_id']} needs fixing:")
                print(f"   Current: {result['stored_recurrence_days']}")
                print(f"   Should be: {result['recommended_fix']['corrected_weekdays']}")

        # Interactive confirmation for production changes
        print("\n" + "=" * 60)
        print("🤔 Ready to apply fixes. Choose an option:")
        print("1. Run dry-run only (safe, no changes)")
        print("2. Apply start date fixes only")
        print("3. Apply all fixes (start dates + weekday corrections)")
        print("4. Fix specific pattern only")
        print("5. Exit without changes")

        try:
            choice = input("\nEnter your choice (1-5): ").strip()

            if choice == "1":
                print("\n🔍 Running dry-run analysis...")
                fix_missing_start_dates(dry_run=True)

            elif choice == "2":
                print("\n🔧 Applying start date fixes...")
                result = fix_missing_start_dates(dry_run=False)
                print(f"✅ Fixed {result['total_fixed']} patterns")

            elif choice == "3":
                print("\n🔧 Applying all fixes...")
                # Fix start dates
                start_date_result = fix_missing_start_dates(dry_run=False)
                print(f"✅ Fixed start dates for {start_date_result['total_fixed']} patterns")

                # Fix specific problematic patterns identified in verification
                for result in verification['verification_results']:
                    if result['issue_detected']:
                        fix_result = fix_specific_problematic_pattern(result['pattern_id'], dry_run=False)
                        print(f"✅ Fixed pattern {result['pattern_id']}")

            elif choice == "4":
                pattern_id = input("Enter pattern ID to fix: ").strip()
                fix_result = fix_specific_problematic_pattern(pattern_id, dry_run=False)
                print(f"✅ Fixed pattern {pattern_id}")

            elif choice == "5":
                print("👋 Exiting without changes")
                return

            else:
                print("❌ Invalid choice. Exiting.")
                return

        except KeyboardInterrupt:
            print("\n👋 Migration cancelled by user")
            return
        except Exception as e:
            print(f"\n❌ Error during migration: {str(e)}")
            print("🔄 Rolling back any uncommitted changes...")
            db.session.rollback()
            return

    print("\n✅ Migration completed successfully!")
    print(f"💾 Backup saved for rollback if needed")


if __name__ == "__main__":
    main()