import re
import logging

logger = logging.getLogger(__name__)

class GradeUtils:
    """Utility class for handling grade level parsing and comparisons."""

    @staticmethod
    def parse_grade_level(grade_string):
        """
        Parse various grade level formats and return numeric value.

        Supported formats:
        - "Grade 10", "grade 10" -> 10
        - "Year 10", "year 10" -> 10
        - "10" -> 10
        - "Grade 1", "Year 1" -> 1

        Args:
            grade_string (str): The grade level string to parse

        Returns:
            int: Numeric grade level, or None if parsing fails
        """
        if not grade_string:
            return None

        # Convert to string and strip whitespace
        grade_str = str(grade_string).strip().lower()

        # Pattern to match "grade 10", "year 10", or just "10"
        patterns = [
            r'^(?:grade|year)\s+(\d+)$',  # "grade 10", "year 10"
            r'^(\d+)$'                    # "10"
        ]

        for pattern in patterns:
            match = re.match(pattern, grade_str)
            if match:
                try:
                    grade_num = int(match.group(1))
                    # Validate reasonable grade range (1-13)
                    if 1 <= grade_num <= 13:
                        return grade_num
                    else:
                        logger.warning(f"Grade level {grade_num} outside expected range (1-13)")
                        return None
                except ValueError:
                    continue

        logger.warning(f"Could not parse grade level: {grade_string}")
        return None

    @staticmethod
    def can_tutor_teach_grade(tutor_grade, course_grade):
        """
        Determine if a tutor can teach a course based on grade levels.
        Rule: Tutor can teach any grade lower than their own grade.

        Args:
            tutor_grade (str or int): Tutor's grade level
            course_grade (str or int): Course's grade level

        Returns:
            bool: True if tutor can teach the course grade
        """
        tutor_num = GradeUtils.parse_grade_level(tutor_grade)
        course_num = GradeUtils.parse_grade_level(course_grade)

        if tutor_num is None or course_num is None:
            logger.warning(f"Invalid grade comparison: tutor={tutor_grade}, course={course_grade}")
            return False

        # Tutor must be at higher grade level than course
        return tutor_num > course_num

    @staticmethod
    def normalize_grade_format(grade_string):
        """
        Normalize grade format to consistent "Grade X" format.

        Args:
            grade_string (str): Grade level string

        Returns:
            str: Normalized grade format like "Grade 10"
        """
        grade_num = GradeUtils.parse_grade_level(grade_string)
        if grade_num is not None:
            return f"Grade {grade_num}"
        return grade_string

    @staticmethod
    def get_teachable_grades(tutor_grade):
        """
        Get list of all grade levels a tutor can teach.

        Args:
            tutor_grade (str or int): Tutor's grade level

        Returns:
            list: List of teachable grade numbers
        """
        tutor_num = GradeUtils.parse_grade_level(tutor_grade)
        if tutor_num is None:
            return []

        # Can teach all grades from 1 to (tutor_grade - 1)
        return list(range(1, tutor_num))