#!/usr/bin/env python3
"""
Timezone Data Audit Script
Analyzes availability table to understand current timezone storage format
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import Availability, User
from datetime import datetime, timedelta
import pytz
import json
from collections import defaultdict, Counter


class TimezoneDataAuditor:
    def __init__(self):
        self.app = create_app()
        self.findings = {
            'total_records': 0,
            'timezone_distribution': {},
            'storage_format_analysis': {
                'likely_utc': 0,
                'likely_local': 0,
                'ambiguous': 0
            },
            'sample_records': [],
            'inconsistencies': [],
            'recommendations': []
        }

    def analyze_availability_records(self):
        """Analyze all availability records for timezone storage patterns"""
        print("🔍 Starting timezone data audit...")

        with self.app.app_context():
            # Get all availability records
            records = db.session.query(Availability).all()
            self.findings['total_records'] = len(records)

            print(f"📊 Found {len(records)} availability records to analyze")

            timezone_counter = Counter()

            for i, record in enumerate(records):
                if i % 100 == 0:
                    print(f"   Processing record {i+1}/{len(records)}")

                # Analyze timezone distribution
                timezone = record.time_zone or 'UTC'
                timezone_counter[timezone] += 1

                # Detect storage format for sample records
                if i < 50:  # Sample first 50 records
                    analysis = self.analyze_single_record(record)
                    self.findings['sample_records'].append(analysis)

                # Check for inconsistencies
                inconsistency = self.detect_inconsistencies(record)
                if inconsistency:
                    self.findings['inconsistencies'].append(inconsistency)

            self.findings['timezone_distribution'] = dict(timezone_counter)
            self.analyze_storage_patterns()
            self.generate_recommendations()

    def analyze_single_record(self, record):
        """Analyze a single availability record"""
        try:
            analysis = {
                'id': record.id,
                'timezone': record.time_zone,
                'start_time': record.start_time,
                'end_time': record.end_time,
                'day_of_week': record.day_of_week,
                'created_at': record.created_at.isoformat() if record.created_at else None,
                'tutor_id': record.tutor_id,
                'storage_format_guess': 'unknown'
            }

            # Try to guess storage format based on patterns
            if record.start_time and record.end_time and record.time_zone:
                analysis['storage_format_guess'] = self.guess_storage_format(
                    record.start_time, record.end_time, record.time_zone
                )

            return analysis
        except Exception as e:
            return {
                'id': record.id,
                'error': str(e),
                'storage_format_guess': 'error'
            }

    def guess_storage_format(self, start_time, end_time, timezone_str):
        """Attempt to guess if times are stored as UTC or local"""
        try:
            if not timezone_str or timezone_str == 'UTC':
                return 'likely_utc'

            # Parse time strings
            start_hour = int(start_time.split(':')[0])
            end_hour = int(end_time.split(':')[0])

            # Check if times look like typical working hours in the stated timezone
            # Typical tutoring hours: 8 AM to 10 PM local time
            if 8 <= start_hour <= 22 and 8 <= end_hour <= 22:
                self.findings['storage_format_analysis']['likely_local'] += 1
                return 'likely_local'

            # Check if times would make sense if converted FROM UTC
            tz = pytz.timezone(timezone_str)
            utc_offset = tz.utcoffset(datetime.now()).total_seconds() / 3600

            # If times are stored as UTC, local times would be offset
            local_start = (start_hour - utc_offset) % 24
            local_end = (end_hour - utc_offset) % 24

            if 8 <= local_start <= 22 and 8 <= local_end <= 22:
                self.findings['storage_format_analysis']['likely_utc'] += 1
                return 'likely_utc'

            self.findings['storage_format_analysis']['ambiguous'] += 1
            return 'ambiguous'

        except Exception as e:
            self.findings['storage_format_analysis']['ambiguous'] += 1
            return f'error: {str(e)}'

    def detect_inconsistencies(self, record):
        """Detect potential data inconsistencies"""
        inconsistencies = []

        try:
            # Check for invalid timezone
            if record.time_zone:
                try:
                    pytz.timezone(record.time_zone)
                except pytz.exceptions.UnknownTimeZoneError:
                    inconsistencies.append({
                        'record_id': record.id,
                        'type': 'invalid_timezone',
                        'value': record.time_zone
                    })

            # Check for invalid time format
            if record.start_time:
                try:
                    datetime.strptime(record.start_time, '%H:%M')
                except ValueError:
                    inconsistencies.append({
                        'record_id': record.id,
                        'type': 'invalid_start_time',
                        'value': record.start_time
                    })

            if record.end_time:
                try:
                    datetime.strptime(record.end_time, '%H:%M')
                except ValueError:
                    inconsistencies.append({
                        'record_id': record.id,
                        'type': 'invalid_end_time',
                        'value': record.end_time
                    })

            # Check for logical inconsistencies (end before start)
            if record.start_time and record.end_time:
                try:
                    start = datetime.strptime(record.start_time, '%H:%M')
                    end = datetime.strptime(record.end_time, '%H:%M')
                    if start >= end:
                        inconsistencies.append({
                            'record_id': record.id,
                            'type': 'end_before_start',
                            'start_time': record.start_time,
                            'end_time': record.end_time
                        })
                except ValueError:
                    pass  # Already caught above

        except Exception as e:
            inconsistencies.append({
                'record_id': record.id,
                'type': 'analysis_error',
                'error': str(e)
            })

        return inconsistencies if inconsistencies else None

    def analyze_storage_patterns(self):
        """Analyze overall storage patterns"""
        total_analyzed = sum(self.findings['storage_format_analysis'].values())

        if total_analyzed > 0:
            likely_local_pct = (self.findings['storage_format_analysis']['likely_local'] / total_analyzed) * 100
            likely_utc_pct = (self.findings['storage_format_analysis']['likely_utc'] / total_analyzed) * 100
            ambiguous_pct = (self.findings['storage_format_analysis']['ambiguous'] / total_analyzed) * 100

            print(f"\n📈 Storage Format Analysis:")
            print(f"   Likely Local Time: {likely_local_pct:.1f}% ({self.findings['storage_format_analysis']['likely_local']} records)")
            print(f"   Likely UTC Time:   {likely_utc_pct:.1f}% ({self.findings['storage_format_analysis']['likely_utc']} records)")
            print(f"   Ambiguous:         {ambiguous_pct:.1f}% ({self.findings['storage_format_analysis']['ambiguous']} records)")

    def generate_recommendations(self):
        """Generate recommendations based on findings"""
        recommendations = []

        # Based on storage format analysis
        local_count = self.findings['storage_format_analysis']['likely_local']
        utc_count = self.findings['storage_format_analysis']['likely_utc']
        total_analyzed = local_count + utc_count + self.findings['storage_format_analysis']['ambiguous']

        if local_count > utc_count:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Storage Format',
                'recommendation': 'Times appear to be stored in local timezone format. Update conversion logic to handle local time storage.',
                'rationale': f'{local_count} records suggest local storage vs {utc_count} UTC storage patterns'
            })
        elif utc_count > local_count:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'Storage Format',
                'recommendation': 'Times appear to be stored in UTC format. Current conversion logic may be correct.',
                'rationale': f'{utc_count} records suggest UTC storage vs {local_count} local storage patterns'
            })
        else:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Storage Format',
                'recommendation': 'Mixed storage formats detected. Implement format detection and migration.',
                'rationale': f'Equal or unclear patterns: {local_count} local vs {utc_count} UTC'
            })

        # Based on inconsistencies
        if self.findings['inconsistencies']:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'Data Quality',
                'recommendation': f'Fix {len(self.findings["inconsistencies"])} data inconsistencies before implementing timezone fix.',
                'rationale': 'Invalid data could cause conversion errors'
            })

        # Based on timezone distribution
        unique_timezones = len(self.findings['timezone_distribution'])
        if unique_timezones > 10:
            recommendations.append({
                'priority': 'LOW',
                'category': 'Testing',
                'recommendation': f'Test timezone conversion across all {unique_timezones} timezones found in data.',
                'rationale': 'Comprehensive testing needed for wide timezone coverage'
            })

        self.findings['recommendations'] = recommendations

    def save_report(self, filename=None):
        """Save audit report to file"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'timezone_data_audit_report_{timestamp}.json'

        filepath = os.path.join(os.path.dirname(__file__), filename)

        with open(filepath, 'w') as f:
            json.dump(self.findings, f, indent=2, default=str)

        print(f"\n💾 Audit report saved to: {filepath}")
        return filepath

    def print_summary(self):
        """Print audit summary"""
        print(f"\n" + "="*60)
        print(f"📋 TIMEZONE DATA AUDIT SUMMARY")
        print(f"="*60)
        print(f"Total Records Analyzed: {self.findings['total_records']}")
        print(f"Unique Timezones: {len(self.findings['timezone_distribution'])}")
        print(f"Data Inconsistencies: {len(self.findings['inconsistencies'])}")

        print(f"\n🌍 Top Timezones:")
        sorted_timezones = sorted(
            self.findings['timezone_distribution'].items(),
            key=lambda x: x[1],
            reverse=True
        )
        for tz, count in sorted_timezones[:10]:
            print(f"   {tz}: {count} records")

        print(f"\n⚠️  Recommendations:")
        for i, rec in enumerate(self.findings['recommendations'], 1):
            print(f"   {i}. [{rec['priority']}] {rec['recommendation']}")
            print(f"      Rationale: {rec['rationale']}")

    def run_audit(self):
        """Run complete audit process"""
        try:
            self.analyze_availability_records()
            self.print_summary()
            return self.save_report()
        except Exception as e:
            print(f"❌ Audit failed: {str(e)}")
            raise


def main():
    """Main function"""
    auditor = TimezoneDataAuditor()
    try:
        report_file = auditor.run_audit()
        print(f"\n✅ Audit completed successfully!")
        print(f"📄 Report saved: {report_file}")
        return 0
    except Exception as e:
        print(f"\n❌ Audit failed: {str(e)}")
        return 1


if __name__ == '__main__':
    exit(main())