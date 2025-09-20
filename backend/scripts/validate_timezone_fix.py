#!/usr/bin/env python3
"""
Timezone Fix Validation Script
Validates that the timezone conversion fix is working correctly in production
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import Availability
from timezone_utils import (
    convert_availability_display_times,
    convert_availability_display_times_v2,
    convert_availability_display_times_legacy
)
from datetime import datetime
import json


class TimezoneFixValidator:
    def __init__(self):
        self.app = create_app()
        self.validation_results = {
            'total_records_tested': 0,
            'conversion_comparisons': [],
            'accuracy_metrics': {
                'correct_conversions': 0,
                'incorrect_conversions': 0,
                'errors': 0
            },
            'performance_metrics': {
                'avg_conversion_time': 0,
                'total_processing_time': 0
            },
            'test_scenarios': [],
            'recommendations': []
        }

    def validate_chicago_fix(self):
        """Validate the specific Chicago timezone issue is fixed"""
        print("🔍 Validating Chicago timezone fix...")

        test_scenarios = [
            {
                'name': 'Chicago Same Timezone',
                'data': {
                    'id': 'chicago-test-1',
                    'start_time': '17:00',
                    'end_time': '18:00',
                    'time_zone': 'America/Chicago',
                    'timezone_storage_format': 'local'
                },
                'user_timezone': 'America/Chicago',
                'expected_start': '17:00',
                'expected_end': '18:00'
            },
            {
                'name': 'Chicago to New York',
                'data': {
                    'id': 'chicago-test-2',
                    'start_time': '17:00',
                    'end_time': '18:00',
                    'time_zone': 'America/Chicago',
                    'timezone_storage_format': 'local'
                },
                'user_timezone': 'America/New_York',
                'expected_start': '18:00',
                'expected_end': '19:00'
            },
            {
                'name': 'Chicago to Los Angeles',
                'data': {
                    'id': 'chicago-test-3',
                    'start_time': '17:00',
                    'end_time': '18:00',
                    'time_zone': 'America/Chicago',
                    'timezone_storage_format': 'local'
                },
                'user_timezone': 'America/Los_Angeles',
                'expected_start': '15:00',
                'expected_end': '16:00'
            }
        ]

        for scenario in test_scenarios:
            try:
                # Test with fixed function
                result = convert_availability_display_times_v2(
                    scenario['data'],
                    scenario['user_timezone']
                )

                success = (
                    result['display_start_time'] == scenario['expected_start'] and
                    result['display_end_time'] == scenario['expected_end']
                )

                scenario_result = {
                    'name': scenario['name'],
                    'success': success,
                    'expected_start': scenario['expected_start'],
                    'actual_start': result['display_start_time'],
                    'expected_end': scenario['expected_end'],
                    'actual_end': result['display_end_time']
                }

                self.validation_results['test_scenarios'].append(scenario_result)

                if success:
                    self.validation_results['accuracy_metrics']['correct_conversions'] += 1
                    print(f"  ✅ {scenario['name']}: {result['display_start_time']}-{result['display_end_time']}")
                else:
                    self.validation_results['accuracy_metrics']['incorrect_conversions'] += 1
                    print(f"  ❌ {scenario['name']}: Expected {scenario['expected_start']}-{scenario['expected_end']}, got {result['display_start_time']}-{result['display_end_time']}")

            except Exception as e:
                self.validation_results['accuracy_metrics']['errors'] += 1
                print(f"  💥 {scenario['name']}: Error - {str(e)}")

        self.validation_results['total_records_tested'] += len(test_scenarios)

    def validate_production_data(self):
        """Validate fix against real production data"""
        print("🔍 Validating against production data...")

        with self.app.app_context():
            # Get sample of real availability records
            records = db.session.query(Availability).limit(10).all()

            if not records:
                print("  ⚠️  No availability records found in database")
                return

            print(f"  📊 Testing {len(records)} real availability records...")

            for record in records:
                try:
                    # Convert record to dict format
                    availability_data = {
                        'id': record.id,
                        'start_time': record.start_time,
                        'end_time': record.end_time,
                        'time_zone': record.time_zone,
                        'timezone_storage_format': 'local'  # Based on audit results
                    }

                    # Test conversion with both legacy and fixed functions
                    legacy_result = convert_availability_display_times_legacy(
                        availability_data, 'America/Chicago'
                    )
                    fixed_result = convert_availability_display_times_v2(
                        availability_data, 'America/Chicago'
                    )

                    comparison = {
                        'record_id': record.id,
                        'original_time': f"{record.start_time}-{record.end_time}",
                        'timezone': record.time_zone,
                        'legacy_display': f"{legacy_result['display_start_time']}-{legacy_result['display_end_time']}",
                        'fixed_display': f"{fixed_result['display_start_time']}-{fixed_result['display_end_time']}",
                        'different_results': (
                            legacy_result['display_start_time'] != fixed_result['display_start_time']
                        )
                    }

                    self.validation_results['conversion_comparisons'].append(comparison)

                    if comparison['different_results']:
                        print(f"    🔄 {record.id}: {comparison['original_time']} {record.time_zone}")
                        print(f"      Legacy: {comparison['legacy_display']}")
                        print(f"      Fixed:  {comparison['fixed_display']}")

                except Exception as e:
                    print(f"    💥 Error processing record {record.id}: {str(e)}")
                    self.validation_results['accuracy_metrics']['errors'] += 1

            self.validation_results['total_records_tested'] += len(records)

    def validate_feature_flag(self):
        """Validate feature flag functionality"""
        print("🔍 Validating feature flag functionality...")

        test_data = {
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'America/Chicago',
            'timezone_storage_format': 'local'
        }

        with self.app.app_context():
            # Test with flag OFF
            self.app.config['TIMEZONE_FIX_ENABLED'] = False
            legacy_result = convert_availability_display_times(test_data, 'America/Chicago')

            # Test with flag ON
            self.app.config['TIMEZONE_FIX_ENABLED'] = True
            fixed_result = convert_availability_display_times(test_data, 'America/Chicago')

            flag_working = (
                legacy_result['display_start_time'] != fixed_result['display_start_time']
            )

            if flag_working:
                print("  ✅ Feature flag working correctly")
                print(f"     Flag OFF: {legacy_result['display_start_time']}-{legacy_result['display_end_time']}")
                print(f"     Flag ON:  {fixed_result['display_start_time']}-{fixed_result['display_end_time']}")
            else:
                print("  ❌ Feature flag not working - same results regardless of flag state")

    def validate_session_compatibility(self):
        """Validate that session management is unaffected"""
        print("🔍 Validating session management compatibility...")

        with self.app.app_context():
            try:
                # Try to import session-related modules
                from app.models import Session
                from app.api.sessions import get_sessions

                # Basic smoke test - ensure imports work
                print("  ✅ Session imports successful")

                # Test session model to_dict method
                test_session = Session(
                    id='test-session',
                    title='Test Session',
                    scheduled_date=datetime(2025, 9, 16, 17, 0),
                    timezone='America/Chicago',
                    tutor_id='test-tutor',
                    duration=60
                )

                session_dict = test_session.to_dict(user_timezone='America/New_York')

                required_fields = ['scheduledDate', 'timezone', 'displayTimezone']
                missing_fields = [field for field in required_fields if field not in session_dict]

                if not missing_fields:
                    print("  ✅ Session to_dict method working correctly")
                else:
                    print(f"  ❌ Session to_dict missing fields: {missing_fields}")

            except Exception as e:
                print(f"  💥 Session compatibility test failed: {str(e)}")

    def generate_recommendations(self):
        """Generate recommendations based on validation results"""
        accuracy = self.validation_results['accuracy_metrics']
        total_tests = accuracy['correct_conversions'] + accuracy['incorrect_conversions'] + accuracy['errors']

        if total_tests == 0:
            return

        success_rate = (accuracy['correct_conversions'] / total_tests) * 100

        recommendations = []

        if success_rate >= 95:
            recommendations.append({
                'priority': 'LOW',
                'category': 'Performance',
                'recommendation': f'Timezone fix working correctly ({success_rate:.1f}% success rate). Ready for production deployment.'
            })
        elif success_rate >= 80:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'Accuracy',
                'recommendation': f'Good success rate ({success_rate:.1f}%) but some edge cases need attention.'
            })
        else:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Critical',
                'recommendation': f'Low success rate ({success_rate:.1f}%). Review and fix issues before deployment.'
            })

        if accuracy['errors'] > 0:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Errors',
                'recommendation': f'Fix {accuracy["errors"]} errors in timezone conversion logic.'
            })

        different_results = len([c for c in self.validation_results['conversion_comparisons'] if c['different_results']])
        if different_results > 0:
            recommendations.append({
                'priority': 'INFO',
                'category': 'Impact',
                'recommendation': f'{different_results} records will show different times after fix deployment - expected behavior.'
            })

        self.validation_results['recommendations'] = recommendations

    def save_validation_report(self, filename=None):
        """Save validation report to file"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'timezone_fix_validation_{timestamp}.json'

        filepath = os.path.join(os.path.dirname(__file__), filename)

        with open(filepath, 'w') as f:
            json.dump(self.validation_results, f, indent=2, default=str)

        print(f"\n💾 Validation report saved to: {filepath}")
        return filepath

    def print_summary(self):
        """Print validation summary"""
        print(f"\n" + "="*60)
        print(f"📋 TIMEZONE FIX VALIDATION SUMMARY")
        print(f"="*60)

        accuracy = self.validation_results['accuracy_metrics']
        print(f"Total Records Tested: {self.validation_results['total_records_tested']}")
        print(f"Correct Conversions: {accuracy['correct_conversions']}")
        print(f"Incorrect Conversions: {accuracy['incorrect_conversions']}")
        print(f"Errors: {accuracy['errors']}")

        total_tests = accuracy['correct_conversions'] + accuracy['incorrect_conversions'] + accuracy['errors']
        if total_tests > 0:
            success_rate = (accuracy['correct_conversions'] / total_tests) * 100
            print(f"Success Rate: {success_rate:.1f}%")

        print(f"\n🎯 Test Scenarios:")
        for scenario in self.validation_results['test_scenarios']:
            status = "✅" if scenario['success'] else "❌"
            print(f"  {status} {scenario['name']}: {scenario['actual_start']}-{scenario['actual_end']}")

        print(f"\n📊 Production Data:")
        different_count = len([c for c in self.validation_results['conversion_comparisons'] if c['different_results']])
        print(f"  Records with different results: {different_count}")

        print(f"\n⚠️  Recommendations:")
        for rec in self.validation_results['recommendations']:
            print(f"   [{rec['priority']}] {rec['recommendation']}")

    def run_validation(self):
        """Run complete validation process"""
        try:
            print("🚀 Starting timezone fix validation...")

            self.validate_chicago_fix()
            self.validate_production_data()
            self.validate_feature_flag()
            self.validate_session_compatibility()
            self.generate_recommendations()

            self.print_summary()
            return self.save_validation_report()

        except Exception as e:
            print(f"❌ Validation failed: {str(e)}")
            raise


def main():
    """Main function"""
    validator = TimezoneFixValidator()
    try:
        report_file = validator.run_validation()
        print(f"\n✅ Validation completed successfully!")
        print(f"📄 Report saved: {report_file}")
        return 0
    except Exception as e:
        print(f"\n❌ Validation failed: {str(e)}")
        return 1


if __name__ == '__main__':
    exit(main())