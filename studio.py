#!/usr/bin/env python3
"""
MathMotion Studio - Visual Mathematical Animations Generator
Cross-Platform Entrypoint launcher for non-coder math enthusiasts, teachers, and creators.
Compatible with macOS, Windows, and Linux.
"""

import os
import sys
import time
import shutil
import subprocess
import webbrowser
import threading
from pathlib import Path

def launch_browser(url: str, delay: float = 1.2):
    time.sleep(delay)
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Could not open browser automatically: {e}")

def main():
    base_dir = Path(__file__).resolve().parent
    os.chdir(base_dir)

    print("""
\033[1;36m========================================================================\033[0m
\033[1;35m       ___  ___      _   _     ___  ___      _   _             \033[0m
\033[1;35m       |  \\/  |     | | | |    |  \\/  |     | | (_)            \033[0m
\033[1;34m       | .  . | __ _| |_| |__  | .  . | ___ | |_ _  ___  _ __  \033[0m
\033[1;34m       | |\\/| |/ _` | __| '_ \\ | |\\/| |/ _ \\| __| |/ _ \\| '_ \\ \033[0m
\033[1;32m       | |  | | (_| | |_| | | || |  | | (_) | |_| | (_) | | | |\033[0m
\033[1;32m       \\_|  |_/\\__,_|\\__|_| |_|\\_|  |_/\\___/ \\__|_|\\___/|_| |_|\033[0m
\033[1;33m       >> Visual Mathematical Animations Studio for ManimGL << \033[0m
\033[1;36m========================================================================\033[0m
    """)
    print("\033[1;32m[+] Starting MathMotion Studio server at: \033[1;37mhttp://localhost:8000\033[0m")
    print("\033[1;33m[+] Democratizing mathematical animations without writing code!\033[0m\n")

    port = 8000
    url = f"http://localhost:{port}"

    # Open browser in a background thread
    threading.Thread(target=launch_browser, args=(url,), daemon=True).start()

    try:
        import uvicorn
        from server import app
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    except ImportError:
        uv_bin = shutil.which("uv")
        if uv_bin:
            print("\033[1;33m[+] Running via uv package runner...\033[0m")
            subprocess.run([
                uv_bin, "run",
                "--with", "fastapi",
                "--with", "uvicorn",
                sys.executable, "-m", "uvicorn", "server:app",
                "--host", "127.0.0.1",
                "--port", str(port)
            ])
        else:
            print("\033[1;31m[!] Please install dependencies: pip install fastapi uvicorn\033[0m")
            subprocess.run([sys.executable, "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", str(port)])

if __name__ == "__main__":
    main()
