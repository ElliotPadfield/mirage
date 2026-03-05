import os
import sys
import locale
import requests
import pycountry
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def get_user_country() -> Optional[str]:
    """Get user's country from locale or IP geolocation"""
    try:
        # Try to get country from locale
        user_locale, _ = locale.getlocale()
        
        if user_locale is None:
            logger.warning("User locale is None. Using IP geolocation.")
            return get_country_from_ip()

        country_code = user_locale.split('_')[-1]
        country = pycountry.countries.get(alpha_2=country_code)
        country_name = country.name if country else None

        if country_name is None:
            logger.warning("Failed to get country from locale. Using IP geolocation.")
            return get_country_from_ip()
        
        return country_name

    except Exception as e:
        logger.error(f"Error getting user country: {e}")
        return get_country_from_ip()

def get_country_from_ip() -> str:
    """Get country from IP geolocation service"""
    try:
        response = requests.get("http://ip-api.com/json/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            country_name = data.get("country")
            if country_name:
                return country_name
            else:
                logger.warning("Failed to retrieve country from IP service")
        else:
            logger.error(f"IP geolocation service error: {response.status_code}")
    except Exception as e:
        logger.error(f"Error getting country from IP: {e}")
    
    # Default fallback
    return "Spain"

def get_platform_name() -> str:
    """Get human-readable platform name"""
    platform_mapping = {
        'win32': 'Windows',
        'linux': 'Linux',
        'darwin': 'MacOS'
    }
    return platform_mapping.get(sys.platform, 'Unknown')

def is_running_as_admin() -> bool:
    """Check if running with elevated privileges"""
    if sys.platform == 'darwin':
        return os.geteuid() == 0
    elif sys.platform == 'win32':
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin()
        except:
            return False
    else:
        return os.geteuid() == 0

