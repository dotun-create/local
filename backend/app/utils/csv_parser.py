"""
CSV Parser Utility for Bulk Import System
Handles parsing and validation of CSV data for tutor qualifications
"""

import csv
import io
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import re

class CSVParseError(Exception):
    """Custom exception for CSV parsing errors"""
    pass

class CSVParser:
    """
    CSV Parser for tutor qualification bulk imports
    Expected CSV format: email,course_id,score,qualification_date
    """

    REQUIRED_COLUMNS = ['email', 'course_id', 'score', 'qualification_date']
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

    def __init__(self):
        self.errors = []
        self.warnings = []

    def parse_csv_text(self, csv_text: str, auto_add_headers: bool = False) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Parse CSV text and return validated records and errors

        Args:
            csv_text (str): Raw CSV text content
            auto_add_headers (bool): If True, automatically add headers if missing

        Returns:
            Tuple[List[Dict], List[str]]: (valid_records, errors)
        """
        self.errors = []
        self.warnings = []

        if not csv_text.strip():
            raise CSVParseError("CSV data is empty")

        try:
            # If auto_add_headers is True, check if we need to add headers
            processed_csv_text = csv_text.strip()
            if auto_add_headers:
                processed_csv_text = self._maybe_add_headers(processed_csv_text)

            # Parse CSV using StringIO
            csv_reader = csv.DictReader(io.StringIO(processed_csv_text))

            # Validate headers
            if not self._validate_headers(csv_reader.fieldnames):
                raise CSVParseError(f"Invalid CSV headers. Required: {', '.join(self.REQUIRED_COLUMNS)}")

            valid_records = []
            row_number = 1  # Start from 1 (header is row 0)

            for row in csv_reader:
                row_number += 1

                # Validate and clean the row
                validated_row, row_errors = self._validate_row(row, row_number)

                if row_errors:
                    self.errors.extend(row_errors)
                else:
                    valid_records.append(validated_row)

            return valid_records, self.errors

        except csv.Error as e:
            raise CSVParseError(f"CSV parsing error: {str(e)}")
        except Exception as e:
            raise CSVParseError(f"Unexpected error parsing CSV: {str(e)}")

    def parse_csv_file(self, file, auto_add_headers: bool = False) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Parse CSV file and return validated records and errors

        Args:
            file: File object from request
            auto_add_headers (bool): If True, automatically add headers if missing

        Returns:
            Tuple[List[Dict], List[str]]: (valid_records, errors)
        """
        try:
            # Read file content
            file.seek(0)  # Ensure we're at the beginning
            content = file.read()

            # Handle both bytes and string content
            if isinstance(content, bytes):
                content = content.decode('utf-8-sig')  # Automatically handles BOM removal

            return self.parse_csv_text(content, auto_add_headers)

        except UnicodeDecodeError:
            raise CSVParseError("File encoding error. Please use UTF-8 encoding.")
        except Exception as e:
            raise CSVParseError(f"Error reading file: {str(e)}")

    def _validate_headers(self, headers: Optional[List[str]]) -> bool:
        """
        Validate that all required headers are present

        Args:
            headers: List of CSV headers

        Returns:
            bool: True if all required headers are present
        """
        if not headers:
            return False

        # Normalize headers (strip whitespace, lowercase)
        normalized_headers = [h.strip().lower() if h else '' for h in headers]
        required_normalized = [h.lower() for h in self.REQUIRED_COLUMNS]

        # Check if all required headers are present
        missing_headers = [h for h in required_normalized if h not in normalized_headers]

        if missing_headers:
            self.errors.append(f"Missing required columns: {', '.join(missing_headers)}")
            return False

        return True

    def _maybe_add_headers(self, csv_text: str) -> str:
        """
        Check if CSV text has headers and add them if missing

        Args:
            csv_text (str): Raw CSV text

        Returns:
            str: CSV text with headers (added if necessary)
        """
        lines = csv_text.strip().split('\n')
        if not lines:
            return csv_text

        first_line = lines[0].strip()

        # Check if first line looks like headers by checking for required column names
        first_line_lower = first_line.lower()
        has_email = 'email' in first_line_lower
        has_course_id = 'course_id' in first_line_lower or 'course' in first_line_lower
        has_score = 'score' in first_line_lower
        has_date = 'date' in first_line_lower

        # If it looks like headers (has most required columns), keep as is
        if (has_email and has_course_id) or (has_email and has_score and has_date):
            return csv_text

        # If it looks like data (doesn't have header keywords), add headers
        # Also check if first line has email pattern and comma-separated values
        if '@' in first_line and ',' in first_line:
            parts = first_line.split(',')
            if len(parts) >= 3:  # At least email, course_id, score
                # Looks like data row, prepend headers
                headers = ','.join(self.REQUIRED_COLUMNS)
                return headers + '\n' + csv_text

        # If unclear, keep original (will fail validation with clear error)
        return csv_text

    def _validate_row(self, row: Dict[str, str], row_number: int) -> Tuple[Optional[Dict[str, Any]], List[str]]:
        """
        Validate and clean a single CSV row

        Args:
            row: Dictionary containing row data
            row_number: Row number for error reporting

        Returns:
            Tuple[Optional[Dict], List[str]]: (validated_row, errors)
        """
        errors = []
        validated_row = {}

        # Normalize keys (handle case differences)
        normalized_row = {k.strip().lower(): v.strip() if v else '' for k, v in row.items()}

        # Validate email
        email = normalized_row.get('email', '').lower()
        if not email:
            errors.append(f"Row {row_number}: Email is required")
        elif not self.EMAIL_REGEX.match(email):
            errors.append(f"Row {row_number}: Invalid email format: {email}")
        else:
            validated_row['email'] = email

        # Validate course_id
        course_id = normalized_row.get('course_id', '').strip()
        if not course_id:
            errors.append(f"Row {row_number}: Course ID is required")
        else:
            validated_row['course_id'] = course_id

        # Validate score
        score_str = normalized_row.get('score', '').strip()
        if not score_str:
            errors.append(f"Row {row_number}: Score is required")
        else:
            try:
                score = float(score_str)
                if score < 0 or score > 100:
                    errors.append(f"Row {row_number}: Score must be between 0 and 100, got {score}")
                else:
                    validated_row['score'] = score
            except ValueError:
                errors.append(f"Row {row_number}: Invalid score format: {score_str}")

        # Validate qualification_date
        date_str = normalized_row.get('qualification_date', '').strip()
        if not date_str:
            errors.append(f"Row {row_number}: Qualification date is required")
        else:
            try:
                # Try multiple date formats
                date_formats = ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']
                parsed_date = None

                for date_format in date_formats:
                    try:
                        parsed_date = datetime.strptime(date_str, date_format)
                        break
                    except ValueError:
                        continue

                if parsed_date is None:
                    errors.append(f"Row {row_number}: Invalid date format: {date_str}. Use YYYY-MM-DD or MM/DD/YYYY")
                else:
                    # Check if date is not in the future
                    if parsed_date > datetime.now():
                        self.warnings.append(f"Row {row_number}: Future qualification date: {date_str}")

                    validated_row['qualification_date'] = parsed_date

            except Exception as e:
                errors.append(f"Row {row_number}: Date parsing error: {str(e)}")

        # Additional row validation
        if len([k for k, v in normalized_row.items() if v.strip()]) == 0:
            errors.append(f"Row {row_number}: Empty row")

        return validated_row if not errors else None, errors

    def validate_batch_constraints(self, records: List[Dict[str, Any]]) -> List[str]:
        """
        Validate constraints across the entire batch

        Args:
            records: List of validated records

        Returns:
            List[str]: List of batch-level errors
        """
        batch_errors = []

        # Check for duplicates within the batch
        seen_combinations = set()
        for i, record in enumerate(records, 1):
            combination = (record['email'], record['course_id'])
            if combination in seen_combinations:
                batch_errors.append(f"Duplicate email-course combination found: {record['email']} - {record['course_id']}")
            seen_combinations.add(combination)

        # Check batch size limits
        if len(records) > 1000:  # Configurable limit
            batch_errors.append(f"Batch too large: {len(records)} records. Maximum allowed: 1000")

        if len(records) == 0:
            batch_errors.append("No valid records found in CSV")

        return batch_errors

    def generate_sample_csv(self) -> str:
        """
        Generate a sample CSV for user reference

        Returns:
            str: Sample CSV content
        """
        sample_data = [
            ['email', 'course_id', 'score', 'qualification_date'],
            ['student1@example.com', 'math-101', '92.5', '2024-01-15'],
            ['student2@example.com', 'physics-201', '88.0', '2024-01-10'],
            ['student3@example.com', 'math-101', '95.5', '2024-01-12']
        ]

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerows(sample_data)
        return output.getvalue()

    def get_validation_summary(self, total_rows: int, valid_records: int, errors: List[str]) -> Dict[str, Any]:
        """
        Generate a summary of validation results

        Args:
            total_rows: Total number of rows processed
            valid_records: Number of valid records
            errors: List of validation errors

        Returns:
            Dict: Validation summary
        """
        return {
            'total_rows': total_rows,
            'valid_records': valid_records,
            'invalid_records': total_rows - valid_records,
            'error_count': len(errors),
            'warning_count': len(self.warnings),
            'errors': errors,
            'warnings': self.warnings,
            'success_rate': round((valid_records / total_rows * 100) if total_rows > 0 else 0, 2)
        }