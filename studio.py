#!/usr/bin/env python3
"""
MathMotion Studio - Visual Mathematical Animations Generator
Entrypoint launcher for non-coder math enthusiasts, teachers, and creators.
"""

import os
import sys
import time
import webbrowser
import threading

def launch_browser(url: str, delay: float = 1.2):
    time.sleep(delay)
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Could not open browser automatically: {e}")

def main():
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
        uvicorn.run("server:app", host="127.0.0.1", port=port, log_level="info")
    except ImportError:
        print("\033[1;31m[!] FastAPI/Uvicorn not found. Running via 'uv run --with fastapi --with uvicorn'...\033[0m")
        os.system(f"uv run --with fastapi --with uvicorn python -m uvicorn server:app --host 127.0.0.1 --port {port}")

if __name__ == "__main__":
    main()
