#!/usr/bin/env python3
"""
Fast build script for Python executable with caching and optimizations
"""

import os
import sys
import subprocess
import shutil
import hashlib
import json
from pathlib import Path
from datetime import datetime

def get_file_hash(file_path):
    """Get MD5 hash of a file for caching"""
    if not os.path.exists(file_path):
        return None
    with open(file_path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def get_directory_hash(dir_path):
    """Get combined hash of all Python files in directory"""
    if not os.path.exists(dir_path):
        return None

    hashes = []
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                hashes.append(get_file_hash(file_path))

    combined = ''.join(hashes) if hashes else ''
    return hashlib.md5(combined.encode()).hexdigest()

def should_rebuild():
    """Check if rebuild is needed based on file changes"""
    cache_file = Path("build/python/.build_cache")
    executable_path = Path("build/python/mirage-backend")

    # If executable doesn't exist, rebuild
    if not executable_path.exists():
        return True

    # If cache doesn't exist, rebuild
    if not cache_file.exists():
        return True

    try:
        with open(cache_file, 'r') as f:
            cache_data = json.load(f)
    except:
        return True

    # Check if source files changed
    current_src_hash = get_directory_hash("src")
    if current_src_hash != cache_data.get('src_hash'):
        return True

    # Check if requirements changed
    current_req_hash = get_file_hash("requirements.txt")
    if current_req_hash != cache_data.get('req_hash'):
        return True

    return False

def update_cache():
    """Update build cache with current file hashes"""
    cache_file = Path("build/python/.build_cache")
    cache_data = {
        'src_hash': get_directory_hash("src"),
        'req_hash': get_file_hash("requirements.txt"),
        'build_time': datetime.now().isoformat()
    }

    cache_file.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_file, 'w') as f:
        json.dump(cache_data, f, indent=2)

def build_python_executable():
    """Build a standalone Python executable using PyInstaller with optimizations"""

    # Check if rebuild is needed
    if not should_rebuild():
        print("✅ Python executable is up to date, skipping build")
        return Path("build/python/mirage-backend")

    print("🔄 Source files changed, rebuilding Python executable...")

    # Install PyInstaller if not already installed
    try:
        import PyInstaller
    except ImportError:
        print("📦 Installing PyInstaller...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)

    # Create build directory
    build_dir = Path("build/python")
    build_dir.mkdir(parents=True, exist_ok=True)

    # Optimized PyInstaller command with exclusions and optimizations
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",  # Create a single executable file
        "--name", "mirage-backend",
        "--distpath", str(build_dir),
        "--workpath", str(build_dir / "work"),
        "--specpath", str(build_dir / "spec"),
        "--noconfirm",
        # Optimizations for faster build
        "--exclude-module", "tkinter",
        "--exclude-module", "matplotlib",
        "--exclude-module", "scipy",
        "--exclude-module", "pandas.plotting",
        "--exclude-module", "jupyter",
        "--exclude-module", "notebook",
        # Strip debug info for smaller size
        "--strip",
        # Optimize bytecode
        "--optimize", "2",
        "src/main.py"
    ]

    print("🐍 Building Python executable with optimizations...")
    start_time = datetime.now()

    try:
        subprocess.run(cmd, check=True)
        build_time = datetime.now() - start_time

        print(f"✅ Python executable built in {build_time.total_seconds():.1f}s at: {build_dir / 'mirage-backend'}")

        # Update cache
        update_cache()

        return build_dir / "mirage-backend"

    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    build_python_executable()
