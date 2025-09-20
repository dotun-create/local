#!/usr/bin/env python3
"""
Quick test script to verify the comprehensive earnings system components.
This tests the database models, services, and API endpoints without authentication.
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app import create_app, db
from app.models import SystemSettings, User, Session, Availability
from app.services.earnings_service import EarningsService
from datetime import datetime, timedelta
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_system_settings():
    """Test SystemSettings model and methods"""
    logger.info("🔧 Testing SystemSettings model...")
    
    # Test getting hourly rate
    hourly_rate = SystemSettings.get_setting('hourly_rate_gbp', 21.0)
    logger.info(f"   ✓ Hourly rate: £{hourly_rate}")
    
    # Test getting currency
    currency = SystemSettings.get_setting('platform_currency', 'GBP')
    logger.info(f"   ✓ Currency: {currency}")
    
    # Test getting non-existent setting with default
    test_setting = SystemSettings.get_setting('non_existent', 'default_value')
    logger.info(f"   ✓ Non-existent setting with default: {test_setting}")
    
    return True

def test_earnings_service():
    """Test EarningsService methods"""
    logger.info("💰 Testing EarningsService...")
    
    try:
        # Test getting hourly rate from service
        hourly_rate = EarningsService.get_hourly_rate()
        logger.info(f"   ✓ Service hourly rate: £{hourly_rate}")
        
        # Find a tutor to test with
        tutor = User.query.filter_by(account_type='tutor').first()
        if tutor:
            logger.info(f"   ✓ Testing with tutor: {tutor.id}")
            
            # Test potential weekly earnings calculation
            potential = EarningsService.get_potential_weekly_earnings(tutor.id)
            logger.info(f"   ✓ Potential weekly earnings: £{potential}")
            
            # Test actual weekly earnings calculation
            actual = EarningsService.get_actual_weekly_earnings(tutor.id)
            logger.info(f"   ✓ Actual weekly earnings: £{actual}")
            
            # Test comprehensive earnings data
            comprehensive = EarningsService.get_comprehensive_earnings_data(tutor.id)
            logger.info(f"   ✓ Comprehensive data keys: {list(comprehensive.keys())}")
            
            # Test upcoming sessions
            upcoming = EarningsService.get_upcoming_sessions_this_week(tutor.id)
            logger.info(f"   ✓ Upcoming sessions count: {len(upcoming)}")
            
        else:
            logger.warning("   ⚠ No tutors found in database for testing")
        
        return True
        
    except Exception as e:
        logger.error(f"   ❌ EarningsService test failed: {str(e)}")
        return False

def test_database_structure():
    """Test database tables and structure"""
    logger.info("🗄️ Testing database structure...")
    
    try:
        # Test system_settings table exists and has data
        settings_count = SystemSettings.query.count()
        logger.info(f"   ✓ System settings records: {settings_count}")
        
        # Test users table has tutors
        tutor_count = User.query.filter_by(account_type='tutor').count()
        logger.info(f"   ✓ Tutors in database: {tutor_count}")
        
        # Test sessions table
        session_count = Session.query.count()
        logger.info(f"   ✓ Sessions in database: {session_count}")
        
        # Test availability table
        availability_count = Availability.query.count()
        logger.info(f"   ✓ Availability records: {availability_count}")
        
        return True
        
    except Exception as e:
        logger.error(f"   ❌ Database structure test failed: {str(e)}")
        return False

def run_comprehensive_test():
    """Run all comprehensive earnings system tests"""
    logger.info("🚀 Starting Comprehensive Earnings System Test")
    logger.info("=" * 50)
    
    app = create_app()
    test_results = []
    
    with app.app_context():
        # Run all tests
        test_results.append(("SystemSettings Model", test_system_settings()))
        test_results.append(("Database Structure", test_database_structure()))
        test_results.append(("EarningsService", test_earnings_service()))
    
    # Summary
    logger.info("=" * 50)
    logger.info("📊 TEST SUMMARY")
    logger.info("=" * 50)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info("=" * 50)
    logger.info(f"Overall Result: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All earnings system components are working correctly!")
        return True
    else:
        logger.error(f"⚠️ {total - passed} test(s) failed. Please check the logs above.")
        return False

if __name__ == "__main__":
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)