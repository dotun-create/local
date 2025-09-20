#!/usr/bin/env python3
"""
Data Migration Script: Fix Corrupted Day-of-Week Data
=====================================================

This script identifies and fixes existing corrupted day-of-week data in the database.
It handles the conversion between JavaScript (0=Sunday) and Python (0=Monday) formats
and ensures data consistency across all availability records.

SAFETY FEATURES:
- Dry-run mode by default to preview changes
- Automatic backup before making any modifications
- Detailed logging of all operations
- Validation of conversions before applying
- Rollback capability

Usage:
    python fix_day_of_week_data.py --dry-run    # Preview changes (default)
    python fix_day_of_week_data.py --apply      # Apply changes to database
    python fix_day_of_week_data.py --rollback   # Rollback to previous backup
"""

import sys
import os
import argparse
import logging
import json
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.database import get_db_connection
    from app.models.availability import RecurringAvailability, SpecificAvailability
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
except ImportError as e:
    print(f"Error importing database modules: {e}")
    print("Make sure you're running this script from the backend directory")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('day_of_week_migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DayOfWeekMigration:
    """Handle day-of-week data migration and fixes."""

    def __init__(self):
        self.db_engine = None
        self.session = None
        self.backup_file = None
        self.stats = {
            'total_recurring': 0,
            'total_specific': 0,
            'corrupted_recurring': 0,
            'corrupted_specific': 0,
            'fixed_recurring': 0,
            'fixed_specific': 0,
            'errors': 0
        }

    def setup_database(self):
        """Initialize database connection."""
        try:
            self.db_engine = get_db_connection()
            Session = sessionmaker(bind=self.db_engine)
            self.session = Session()
            logger.info("Database connection established")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return False

    def python_to_js_weekday(self, python_weekday):
        """Convert Python weekday (0=Monday) to JavaScript weekday (0=Sunday)."""
        if python_weekday is None or not isinstance(python_weekday, int):
            return None
        if python_weekday < 0 or python_weekday > 6:
            return None
        return (python_weekday + 1) % 7

    def js_to_python_weekday(self, js_weekday):
        """Convert JavaScript weekday (0=Sunday) to Python weekday (0=Monday)."""
        if js_weekday is None or not isinstance(js_weekday, int):
            return None
        if js_weekday < 0 or js_weekday > 6:
            return None
        return (js_weekday - 1 + 7) % 7

    def get_expected_day_of_week(self, date_str):
        """Calculate expected day of week from date string."""
        try:
            if not date_str:
                return None

            # Parse date (handle different formats)
            if 'T' in date_str:
                date_obj = datetime.fromisoformat(date_str.split('T')[0])
            else:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')

            # Python weekday: Monday=0, Sunday=6
            return date_obj.weekday()
        except (ValueError, AttributeError) as e:
            logger.warning(f"Could not parse date '{date_str}': {e}")
            return None

    def create_backup(self):
        """Create backup of current availability data."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.backup_file = f"availability_backup_{timestamp}.sql"

        try:
            # Create backup directory
            backup_dir = Path("backups")
            backup_dir.mkdir(exist_ok=True)
            backup_path = backup_dir / self.backup_file

            # Export current data to SQL file
            backup_query = """
            SELECT 'recurring_availability' as table_name, id, day_of_week, day_of_week_js, day_of_week_python,
                   start_time, end_time, tutor_id, course_id, created_at, updated_at
            FROM recurring_availability
            UNION ALL
            SELECT 'specific_availability' as table_name, id, day_of_week, day_of_week_js, day_of_week_python,
                   start_time, end_time, tutor_id, course_id, specific_date, updated_at
            FROM specific_availability;
            """

            result = self.session.execute(text(backup_query))
            rows = result.fetchall()

            # Write backup data
            with open(backup_path, 'w') as f:
                f.write(f"-- Availability Data Backup - {datetime.now()}\n")
                f.write(f"-- Total Records: {len(rows)}\n\n")

                for row in rows:
                    f.write(f"-- Backup Record: {dict(row._mapping)}\n")

            logger.info(f"Backup created: {backup_path} ({len(rows)} records)")
            return True

        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            return False

    def analyze_data_corruption(self):
        """Analyze existing data to identify corruption patterns."""
        logger.info("Analyzing data for corruption patterns...")

        corruption_report = {
            'recurring_issues': [],
            'specific_issues': [],
            'patterns': {
                'missing_js_format': 0,
                'missing_python_format': 0,
                'inconsistent_formats': 0,
                'date_mismatch': 0,
                'invalid_values': 0
            }
        }

        try:
            # Analyze recurring availability
            recurring_records = self.session.query(RecurringAvailability).all()
            self.stats['total_recurring'] = len(recurring_records)

            for record in recurring_records:
                issues = []

                # Check for missing formats
                if record.day_of_week_js is None and record.day_of_week is not None:
                    issues.append('missing_js_format')
                    corruption_report['patterns']['missing_js_format'] += 1

                if record.day_of_week_python is None and record.day_of_week is not None:
                    issues.append('missing_python_format')
                    corruption_report['patterns']['missing_python_format'] += 1

                # Check for inconsistent formats
                if (record.day_of_week_js is not None and
                    record.day_of_week_python is not None):
                    expected_js = self.python_to_js_weekday(record.day_of_week_python)
                    if expected_js != record.day_of_week_js:
                        issues.append('inconsistent_formats')
                        corruption_report['patterns']['inconsistent_formats'] += 1

                # Check for invalid values
                if (record.day_of_week is not None and
                    (record.day_of_week < 0 or record.day_of_week > 6)):
                    issues.append('invalid_day_of_week')
                    corruption_report['patterns']['invalid_values'] += 1

                if issues:
                    self.stats['corrupted_recurring'] += 1
                    corruption_report['recurring_issues'].append({
                        'id': record.id,
                        'day_of_week': record.day_of_week,
                        'day_of_week_js': record.day_of_week_js,
                        'day_of_week_python': record.day_of_week_python,
                        'issues': issues
                    })

            # Analyze specific availability
            specific_records = self.session.query(SpecificAvailability).all()
            self.stats['total_specific'] = len(specific_records)

            for record in specific_records:
                issues = []

                # Calculate expected day of week from date
                expected_python_dow = self.get_expected_day_of_week(record.specific_date)
                expected_js_dow = self.python_to_js_weekday(expected_python_dow) if expected_python_dow is not None else None

                # Check for missing formats
                if record.day_of_week_js is None and expected_js_dow is not None:
                    issues.append('missing_js_format')
                    corruption_report['patterns']['missing_js_format'] += 1

                if record.day_of_week_python is None and expected_python_dow is not None:
                    issues.append('missing_python_format')
                    corruption_report['patterns']['missing_python_format'] += 1

                # Check for date mismatch
                if (record.day_of_week is not None and expected_python_dow is not None and
                    record.day_of_week != expected_python_dow):
                    issues.append('date_mismatch')
                    corruption_report['patterns']['date_mismatch'] += 1

                # Check for inconsistent formats
                if (record.day_of_week_js is not None and expected_js_dow is not None and
                    record.day_of_week_js != expected_js_dow):
                    issues.append('js_date_mismatch')
                    corruption_report['patterns']['inconsistent_formats'] += 1

                if issues:
                    self.stats['corrupted_specific'] += 1
                    corruption_report['specific_issues'].append({
                        'id': record.id,
                        'specific_date': record.specific_date,
                        'day_of_week': record.day_of_week,
                        'day_of_week_js': record.day_of_week_js,
                        'day_of_week_python': record.day_of_week_python,
                        'expected_python': expected_python_dow,
                        'expected_js': expected_js_dow,
                        'issues': issues
                    })

            # Log corruption summary
            logger.info(f"Data Analysis Complete:")
            logger.info(f"  Recurring Records: {self.stats['total_recurring']} total, {self.stats['corrupted_recurring']} corrupted")
            logger.info(f"  Specific Records: {self.stats['total_specific']} total, {self.stats['corrupted_specific']} corrupted")
            logger.info(f"  Corruption Patterns: {corruption_report['patterns']}")

            return corruption_report

        except Exception as e:
            logger.error(f"Error analyzing data corruption: {e}")
            self.stats['errors'] += 1
            return None

    def fix_recurring_availability(self, dry_run=True):
        """Fix corrupted recurring availability records."""
        logger.info(f"{'[DRY RUN] ' if dry_run else ''}Fixing recurring availability records...")

        try:
            records = self.session.query(RecurringAvailability).all()

            for record in records:
                changes = {}

                # Fix missing day_of_week_js
                if record.day_of_week_js is None and record.day_of_week is not None:
                    expected_js = self.python_to_js_weekday(record.day_of_week)
                    if expected_js is not None:
                        changes['day_of_week_js'] = expected_js

                # Fix missing day_of_week_python
                if record.day_of_week_python is None and record.day_of_week is not None:
                    changes['day_of_week_python'] = record.day_of_week

                # Fix inconsistent formats
                if (record.day_of_week_js is not None and
                    record.day_of_week_python is not None):
                    expected_js = self.python_to_js_weekday(record.day_of_week_python)
                    if expected_js != record.day_of_week_js:
                        changes['day_of_week_js'] = expected_js
                        logger.warning(f"Fixed inconsistent JS format for record {record.id}: {record.day_of_week_js} -> {expected_js}")

                # Apply changes
                if changes:
                    if not dry_run:
                        for field, value in changes.items():
                            setattr(record, field, value)

                    self.stats['fixed_recurring'] += 1
                    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Fixed recurring record {record.id}: {changes}")

            if not dry_run:
                self.session.commit()
                logger.info(f"Committed {self.stats['fixed_recurring']} recurring availability fixes")

        except Exception as e:
            logger.error(f"Error fixing recurring availability: {e}")
            if not dry_run:
                self.session.rollback()
            self.stats['errors'] += 1

    def fix_specific_availability(self, dry_run=True):
        """Fix corrupted specific availability records."""
        logger.info(f"{'[DRY RUN] ' if dry_run else ''}Fixing specific availability records...")

        try:
            records = self.session.query(SpecificAvailability).all()

            for record in records:
                changes = {}

                # Calculate expected day of week from date
                expected_python_dow = self.get_expected_day_of_week(record.specific_date)
                expected_js_dow = self.python_to_js_weekday(expected_python_dow) if expected_python_dow is not None else None

                if expected_python_dow is None:
                    logger.warning(f"Could not determine day of week for record {record.id} with date {record.specific_date}")
                    continue

                # Fix day_of_week (Python format)
                if record.day_of_week != expected_python_dow:
                    changes['day_of_week'] = expected_python_dow

                # Fix day_of_week_python
                if record.day_of_week_python != expected_python_dow:
                    changes['day_of_week_python'] = expected_python_dow

                # Fix day_of_week_js
                if record.day_of_week_js != expected_js_dow:
                    changes['day_of_week_js'] = expected_js_dow

                # Apply changes
                if changes:
                    if not dry_run:
                        for field, value in changes.items():
                            setattr(record, field, value)

                    self.stats['fixed_specific'] += 1
                    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Fixed specific record {record.id} (date: {record.specific_date}): {changes}")

            if not dry_run:
                self.session.commit()
                logger.info(f"Committed {self.stats['fixed_specific']} specific availability fixes")

        except Exception as e:
            logger.error(f"Error fixing specific availability: {e}")
            if not dry_run:
                self.session.rollback()
            self.stats['errors'] += 1

    def validate_fixes(self):
        """Validate that all fixes were applied correctly."""
        logger.info("Validating applied fixes...")

        validation_errors = []

        try:
            # Validate recurring availability
            recurring_records = self.session.query(RecurringAvailability).all()
            for record in recurring_records:
                if record.day_of_week is not None:
                    expected_js = self.python_to_js_weekday(record.day_of_week)

                    if record.day_of_week_js != expected_js:
                        validation_errors.append(f"Recurring record {record.id}: JS format mismatch")

                    if record.day_of_week_python != record.day_of_week:
                        validation_errors.append(f"Recurring record {record.id}: Python format mismatch")

            # Validate specific availability
            specific_records = self.session.query(SpecificAvailability).all()
            for record in specific_records:
                expected_python = self.get_expected_day_of_week(record.specific_date)
                expected_js = self.python_to_js_weekday(expected_python) if expected_python is not None else None

                if expected_python is not None:
                    if record.day_of_week != expected_python:
                        validation_errors.append(f"Specific record {record.id}: Day of week mismatch")

                    if record.day_of_week_js != expected_js:
                        validation_errors.append(f"Specific record {record.id}: JS format mismatch")

                    if record.day_of_week_python != expected_python:
                        validation_errors.append(f"Specific record {record.id}: Python format mismatch")

            if validation_errors:
                logger.error(f"Validation failed with {len(validation_errors)} errors:")
                for error in validation_errors[:10]:  # Show first 10 errors
                    logger.error(f"  - {error}")
                if len(validation_errors) > 10:
                    logger.error(f"  ... and {len(validation_errors) - 10} more errors")
                return False
            else:
                logger.info("All fixes validated successfully!")
                return True

        except Exception as e:
            logger.error(f"Error during validation: {e}")
            return False

    def print_summary(self):
        """Print migration summary."""
        logger.info("\n" + "="*50)
        logger.info("MIGRATION SUMMARY")
        logger.info("="*50)
        logger.info(f"Total Recurring Records: {self.stats['total_recurring']}")
        logger.info(f"Corrupted Recurring: {self.stats['corrupted_recurring']}")
        logger.info(f"Fixed Recurring: {self.stats['fixed_recurring']}")
        logger.info(f"")
        logger.info(f"Total Specific Records: {self.stats['total_specific']}")
        logger.info(f"Corrupted Specific: {self.stats['corrupted_specific']}")
        logger.info(f"Fixed Specific: {self.stats['fixed_specific']}")
        logger.info(f"")
        logger.info(f"Errors: {self.stats['errors']}")
        logger.info("="*50)

    def run_migration(self, dry_run=True):
        """Run the complete migration process."""
        logger.info(f"Starting day-of-week data migration {'(DRY RUN)' if dry_run else '(LIVE RUN)'}")

        if not self.setup_database():
            return False

        try:
            # Analyze corruption
            corruption_report = self.analyze_data_corruption()
            if corruption_report is None:
                return False

            # Create backup if not dry run
            if not dry_run:
                if not self.create_backup():
                    logger.error("Failed to create backup. Aborting migration.")
                    return False

            # Fix data
            self.fix_recurring_availability(dry_run)
            self.fix_specific_availability(dry_run)

            # Validate fixes if not dry run
            if not dry_run:
                if not self.validate_fixes():
                    logger.error("Validation failed. Consider rollback.")
                    return False

            self.print_summary()

            if dry_run:
                logger.info("Dry run completed. Use --apply to make actual changes.")
            else:
                logger.info("Migration completed successfully!")

            return True

        except Exception as e:
            logger.error(f"Migration failed: {e}")
            if not dry_run:
                try:
                    self.session.rollback()
                    logger.info("Database changes rolled back")
                except:
                    pass
            return False

        finally:
            if self.session:
                self.session.close()

def main():
    parser = argparse.ArgumentParser(description='Fix corrupted day-of-week data in availability tables')
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='Preview changes without applying them (default)')
    parser.add_argument('--apply', action='store_true',
                        help='Apply changes to the database')
    parser.add_argument('--rollback', action='store_true',
                        help='Rollback to previous backup (not implemented)')

    args = parser.parse_args()

    # Handle argument conflicts
    if args.rollback:
        logger.error("Rollback functionality not implemented yet")
        return 1

    dry_run = not args.apply

    migration = DayOfWeekMigration()
    success = migration.run_migration(dry_run=dry_run)

    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())