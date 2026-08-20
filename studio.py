#!/usr/bin/env python3
"""
MathMotion Studio - Standalone Desktop Application
Visual Mathematical Animations Generator (No Localhost / No Network Ports).
Runs as a native standalone desktop app on macOS, Windows, and Linux.
"""

import os
import sys
import time
import shutil
import uuid
import subprocess
from pathlib import Path
from scene_builder import generate_manim_code

BASE_DIR = Path(__file__).resolve().parent
VIDEOS_DIR = BASE_DIR / "videos"
SCRATCH_DIR = BASE_DIR / "scratch"
WEB_DIR = BASE_DIR / "web"
INDEX_HTML = WEB_DIR / "index.html"

VIDEOS_DIR.mkdir(exist_ok=True)
SCRATCH_DIR.mkdir(exist_ok=True)


class StudioNativeAPI:
    """
    Direct Python <-> JavaScript Bridge for Standalone Desktop App.
    Zero network ports, zero localhost server.
    """

    def get_status(self):
        return {
            "status": "online",
            "engine": "ManimGL v1.7.2 (Standalone App)",
            "app_mode": "native_standalone",
            "platform": sys.platform
        }

    def generate_code(self, project):
        try:
            code = generate_manim_code(project)
            return {"status": "success", "code": code}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def render_video(self, payload):
        uid = uuid.uuid4().hex[:8]
        scene_name = payload.get("scene_name", "GeneratedMathScene")
        file_prefix = payload.get("file_name") or f"math_scene_{uid}"
        project = payload.get("project")
        code = payload.get("code")
        resolution = payload.get("resolution", "480p")

        if code:
            python_code = code
        elif project:
            python_code = generate_manim_code(project)
        else:
            return {"status": "error", "message": "Either 'project' or 'code' is required."}

        scene_file = SCRATCH_DIR / f"{file_prefix}.py"
        with open(scene_file, "w", encoding="utf-8") as f:
            f.write(python_code)

        quality_flag = "-l"
        if resolution == "720p":
            quality_flag = "-m"
        elif resolution == "1080p":
            quality_flag = "--hd"

        uv_bin = shutil.which("uv")
        manimgl_bin = shutil.which("manimgl")

        if uv_bin:
            cmd = [
                uv_bin, "run", "manimgl",
                str(scene_file),
                scene_name,
                "-w",
                quality_flag,
                "--file_name", file_prefix,
                "--video_dir", str(VIDEOS_DIR)
            ]
        elif manimgl_bin:
            cmd = [
                manimgl_bin,
                str(scene_file),
                scene_name,
                "-w",
                quality_flag,
                "--file_name", file_prefix,
                "--video_dir", str(VIDEOS_DIR)
            ]
        else:
            cmd = [
                sys.executable, "-m", "manimlib",
                str(scene_file),
                scene_name,
                "-w",
                quality_flag,
                "--file_name", file_prefix,
                "--video_dir", str(VIDEOS_DIR)
            ]

        start_time = time.time()
        res = subprocess.run(cmd, cwd=str(BASE_DIR), capture_output=True, text=True)
        elapsed = round(time.time() - start_time, 2)

        expected_video = VIDEOS_DIR / f"{file_prefix}.mp4"
        if not expected_video.exists():
            matches = list(VIDEOS_DIR.glob(f"{file_prefix}*.mp4"))
            if matches:
                expected_video = matches[0]

        if expected_video.exists():
            return {
                "status": "success",
                "video_path": str(expected_video),
                "video_name": expected_video.name,
                "video_url": expected_video.resolve().as_uri(),
                "duration_render": elapsed,
                "logs": res.stdout
            }
        else:
            return {
                "status": "error",
                "message": "Render failed. Check terminal output.",
                "logs": res.stdout + "\n" + res.stderr
            }

    def get_videos(self):
        videos = []
        for v in sorted(VIDEOS_DIR.glob("*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True):
            videos.append({
                "name": v.name,
                "path": str(v),
                "url": v.resolve().as_uri(),
                "size_mb": round(v.stat().st_size / (1024 * 1024), 2),
                "modified": time.ctime(v.stat().st_mtime)
            })
        return {"videos": videos}

    def open_video(self, video_path):
        try:
            if sys.platform == "darwin":
                subprocess.run(["open", video_path])
            elif sys.platform == "win32":
                os.startfile(video_path)
            else:
                subprocess.run(["xdg-open", video_path])
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}


def main():
    os.chdir(BASE_DIR)

    print("""
\033[1;36m========================================================================\033[0m
\033[1;35m       ___  ___      _   _     ___  ___      _   _             \033[0m
\033[1;35m       |  \\/  |     | | | |    |  \\/  |     | | (_)            \033[0m
\033[1;34m       | .  . | __ _| |_| |__  | .  . | ___ | |_ _  ___  _ __  \033[0m
\033[1;34m       | |\\/| |/ _` | __| '_ \\ | |\\/| |/ _ \\| __| |/ _ \\| '_ \\ \033[0m
\033[1;32m       | |  | | (_| | |_| | | || |  | | (_) | |_| | (_) | | | |\033[0m
\033[1;32m       \\_|  |_/\\__,_|\\__|_| |_|\\_|  |_/\\___/ \\__|_|\\___/|_| |_|\033[0m
\033[1;33m       >> Standalone Desktop App for ManimGL (No Localhost / Port) << \033[0m
\033[1;36m========================================================================\033[0m
    """)
    print("\033[1;32m[+] Launching native desktop window...\033[0m")
    print("\033[1;33m[+] Pure offline standalone GUI with zero network ports!\033[0m\n")

    try:
        import webview
    except ImportError:
        print("\033[1;33m[!] Installing pywebview for native standalone desktop window...\033[0m")
        subprocess.run([sys.executable, "-m", "pip", "install", "pywebview"])
        import webview

    api = StudioNativeAPI()
    url = INDEX_HTML.resolve().as_uri()

    window = webview.create_window(
        title="MathMotion Studio — Visual Mathematical Animation Generator",
        url=url,
        js_api=api,
        width=1340,
        height=860,
        min_size=(1020, 680),
        background_color='#070a14',
        text_select=True
    )

    # Start standalone native GUI window loop
    webview.start(debug=False)


if __name__ == "__main__":
    main()
