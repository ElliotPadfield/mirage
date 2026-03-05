import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask settings
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    # Server settings
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 54323))  # Using port 54323 to avoid conflict
    
    # CORS settings
    CORS_ORIGINS = [
        'http://localhost:5173',  # Vite dev server
        'http://localhost:3000',  # Alternative dev server
        'tauri://localhost',      # Tauri webview
        'https://tauri.localhost', # Tauri webview (alt)
    ]
    
    # API settings
    API_VERSION = 'v1'
    API_PREFIX = f'/api/{API_VERSION}'
    
    # App settings
    APP_VERSION_NUMBER = "3.0.0"
    
    # Device settings
    DEFAULT_BONJOUR_TIMEOUT = 5
    MAX_DEVICE_RETRY_ATTEMPTS = 10
    MAX_WIFI_RETRY_ATTEMPTS = 10
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
