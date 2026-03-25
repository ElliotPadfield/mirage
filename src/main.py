#!/usr/bin/env python3
"""
Mirage - Main entry point for the refactored Flask application
"""

import argparse
import sys
import logging
from src.app import create_app
from src.config import Config
from src.utils.helpers import get_platform_name, is_running_as_admin
from src.cleanup import register_cleanup_handlers, startup_cleanup

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Mirage')
    parser.add_argument('--electron', action='store_true', 
                       help='Run in Electron mode (no auto-browser)')
    parser.add_argument('--port', type=int, default=Config.PORT,
                       help=f'Port to run on (default: {Config.PORT})')
    parser.add_argument('--host', default=Config.HOST,
                       help=f'Host to bind to (default: {Config.HOST})')
    parser.add_argument('--debug', action='store_true',
                       help='Enable debug mode')
    return parser.parse_args()

def setup_logging(debug=False):
    """Setup logging configuration"""
    level = logging.DEBUG if debug else getattr(logging, Config.LOG_LEVEL)
    
    logging.basicConfig(
        level=level,
        format=Config.LOG_FORMAT,
        handlers=[logging.StreamHandler()]
    )
    
    # Disable some noisy loggers
    logging.getLogger('werkzeug').disabled = True
    logging.getLogger('urllib3').setLevel(logging.WARNING)

def check_privileges():
    """Check if running with required privileges"""
    platform = get_platform_name()
    
    if platform == 'MacOS' and not is_running_as_admin():
        logger = logging.getLogger(__name__)
        logger.warning("*********************** WARNING ***********************")
        logger.warning("Not running as Sudo - iOS device access may be limited")
        logger.warning("For full functionality, run with sudo or use USB connection")
        logger.warning("*********************** WARNING ***********************")
        # Don't return False - allow the app to run with limited functionality
        return True
    elif platform == 'MacOS':
        logger = logging.getLogger(__name__)
        logger.info("Running as Sudo - full iOS device access available")
    
    return True

def main():
    """Main application entry point"""
    args = parse_arguments()
    
    # Setup logging
    setup_logging(args.debug)
    logger = logging.getLogger(__name__)

    # Register cleanup handlers (SIGTERM, SIGINT, atexit)
    register_cleanup_handlers()

    # Clean up any leftover state from a previous crash
    startup_cleanup()

    # Check privileges
    check_privileges()

    # Create Flask app
    app = create_app()

    logger.info(f"Starting Mirage v{Config.APP_VERSION_NUMBER}")
    logger.info(f"Platform: {get_platform_name()}")
    logger.info(f"Running on {args.host}:{args.port}")

    if args.electron:
        logger.info("Running in sidecar mode")

    # Start the server
    try:
        app.run(
            host=args.host,
            port=args.port,
            debug=args.debug,
            use_reloader=False,
        )
    except KeyboardInterrupt:
        logger.info("Shutting down Mirage...")
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()