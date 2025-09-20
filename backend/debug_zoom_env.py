#!/usr/bin/env python3
"""
Debug Zoom environment variables
"""

import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

from app.services.zoom_service import zoom_service

def debug_zoom_env():
    print("=== DEBUGGING ZOOM ENVIRONMENT VARIABLES ===\n")
    
    print("🔍 Raw Environment Variables:")
    print(f"   ZOOM_ACCOUNT_ID: '{os.getenv('ZOOM_ACCOUNT_ID')}'")
    print(f"   ZOOM_CLIENT_ID: '{os.getenv('ZOOM_CLIENT_ID')}'")
    print(f"   ZOOM_CLIENT_SECRET: '{os.getenv('ZOOM_CLIENT_SECRET')}'")
    
    print(f"\n🔍 ZoomService Instance Values:")
    print(f"   account_id: '{zoom_service.account_id}'")
    print(f"   client_id: '{zoom_service.client_id}'")
    print(f"   client_secret: '{zoom_service.client_secret}'")
    
    print(f"\n🔍 Truthiness Check:")
    print(f"   bool(account_id): {bool(zoom_service.account_id)}")
    print(f"   bool(client_id): {bool(zoom_service.client_id)}")  
    print(f"   bool(client_secret): {bool(zoom_service.client_secret)}")
    
    print(f"\n🔍 all() Check:")
    all_values = [zoom_service.account_id, zoom_service.client_id, zoom_service.client_secret]
    print(f"   Values: {all_values}")
    print(f"   all(values): {all(all_values)}")
    
    print(f"\n🔍 is_configured() Result:")
    print(f"   is_configured(): {zoom_service.is_configured()}")
    
    # Test actual API call
    print(f"\n🧪 Testing API Token Request:")
    try:
        token = zoom_service._get_access_token()
        print(f"   ✅ Token obtained successfully: {token[:20]}...")
    except Exception as e:
        print(f"   ❌ Token request failed: {str(e)}")

if __name__ == '__main__':
    debug_zoom_env()