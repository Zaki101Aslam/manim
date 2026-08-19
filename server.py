"""
FastAPI Server for MathMotion Studio.
Provides REST APIs for live code generation, headless ManimGL video rendering,
preset management, and video streaming.
"""

import os
import sys
import time
import uuid
import shutil
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scene_builder import generate_manim_code

app = FastAPI(title="MathMotion Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
VIDEOS_DIR = BASE_DIR / "videos"
VIDEOS_DIR.mkdir(exist_ok=True)
SCRATCH_DIR = BASE_DIR / "scratch"
SCRATCH_DIR.mkdir(exist_ok=True)
WEB_DIR = BASE_DIR / "web"

class RenderRequest(BaseModel):
    project: Optional[Dict[str, Any]] = None
    code: Optional[str] = None
    resolution: str = "720p"  # 480p, 720p, 1080p
    fps: Optional[int] = 30
    scene_name: str = "GeneratedMathScene"
    file_name: Optional[str] = None

class CodeGenRequest(BaseModel):
    project: Dict[str, Any]


@app.get("/api/status")
async def get_status():
    ffmpeg_available = shutil.which("ffmpeg") is not None
    uv_available = shutil.which("uv") is not None
    return {
        "status": "online",
        "engine": "ManimGL v1.7.2",
        "ffmpeg": ffmpeg_available,
        "uv": uv_available,
        "python_version": sys.version.split()[0],
        "videos_directory": str(VIDEOS_DIR)
    }


@app.get("/api/presets")
async def get_presets():
    return {
        "presets": [
            {
                "id": "collision_pi",
                "category": "physics",
                "name": "Collision π Discovery (Galperin)",
                "description": "Calculate the digits of π through elastic block collisions and a wall",
                "default_config": {
                    "digits": 2,
                    "b1_color": "BLUE",
                    "b2_color": "PURPLE",
                    "title": "Computing \\pi with Colliding Blocks",
                    "show_phase_space": True
                }
            },
            {
                "id": "calculus_riemann",
                "category": "calculus",
                "name": "Riemann Sums & Definite Integrals",
                "description": "Approximate and calculate the area under any curve f(x)",
                "default_config": {
                    "func": "0.2 * x**3 - x + 2",
                    "num_rects": 16,
                    "x_min": -2,
                    "x_max": 3,
                    "method": "midpoint"
                }
            },
            {
                "id": "linear_transformation",
                "category": "algebra",
                "name": "2D Matrix Transformations",
                "description": "Deform the 2D plane, watch basis vectors i-hat and j-hat and determinant area",
                "default_config": {
                    "a": 1.0,
                    "b": 1.0,
                    "c": 0.0,
                    "d": 1.0
                }
            },
            {
                "id": "fourier_epicycles",
                "category": "fourier",
                "name": "Fourier Epicycles (Drawing with Circles)",
                "description": "Decompose complex closed 2D curves into rotating circle vectors",
                "default_config": {
                    "harmonics": 12,
                    "shape": "heart"
                }
            },
            {
                "id": "trig_unit_circle",
                "category": "geometry",
                "name": "Unit Circle & Sine Wave Unwinding",
                "description": "Visualize how harmonic sine and cosine waves arise from circular rotation",
                "default_config": {
                    "radius": 1.8,
                    "speed": 1.0
                }
            },
            {
                "id": "latex_proof",
                "category": "proofs",
                "name": "Euler's Formula & LaTeX Morphing",
                "description": "Smoothly morph step-by-step mathematical proofs with TransformMatchingTex",
                "default_config": {
                    "steps": [
                        "e^{i\\theta} = \\cos(\\theta) + i\\sin(\\theta)",
                        "\\text{Let } \\theta = \\pi",
                        "e^{i\\pi} = \\cos(\\pi) + i\\sin(\\pi)",
                        "e^{i\\pi} = -1 + 0",
                        "e^{i\\pi} + 1 = 0"
                    ]
                }
            }
        ]
    }


@app.post("/api/generate-code")
async def generate_code_endpoint(req: CodeGenRequest):
    try:
        code = generate_manim_code(req.project)
        return {"status": "success", "code": code}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/render")
async def render_scene_endpoint(req: RenderRequest):
    """
    Renders a scene to MP4 using ManimGL backend.
    """
    uid = uuid.uuid4().hex[:8]
    scene_name = req.scene_name
    file_prefix = req.file_name or f"math_scene_{uid}"
    
    if req.code:
        python_code = req.code
    elif req.project:
        python_code = generate_manim_code(req.project)
    else:
        raise HTTPException(status_code=400, detail="Either 'project' or 'code' must be provided.")
        
    scene_file = SCRATCH_DIR / f"{file_prefix}.py"
    with open(scene_file, "w", encoding="utf-8") as f:
        f.write(python_code)
        
    quality_flag = "-l"  # Default 480p fast
    if req.resolution == "720p":
        quality_flag = "-m"
    elif req.resolution == "1080p":
        quality_flag = "--hd"
        
    # Command to run manimgl
    cmd = [
        "uv", "run", "manimgl",
        str(scene_file),
        scene_name,
        "-w",
        quality_flag,
        "--file_name", file_prefix,
        "--video_dir", str(VIDEOS_DIR)
    ]
    
    start_time = time.time()
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(BASE_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        elapsed = round(time.time() - start_time, 2)
        
        stdout_str = stdout.decode("utf-8", errors="replace")
        stderr_str = stderr.decode("utf-8", errors="replace")
        
        # Expected output video file
        expected_video = VIDEOS_DIR / f"{file_prefix}.mp4"
        if not expected_video.exists():
            # Search for any file matching file_prefix in VIDEOS_DIR
            matches = list(VIDEOS_DIR.glob(f"{file_prefix}*.mp4"))
            if matches:
                expected_video = matches[0]
                
        if expected_video.exists():
            return {
                "status": "success",
                "video_url": f"/api/videos/{expected_video.name}",
                "filename": expected_video.name,
                "duration_render": elapsed,
                "size_bytes": expected_video.stat().st_size,
                "logs": stdout_str + ("\n" + stderr_str if stderr_str else "")
            }
        else:
            return {
                "status": "error",
                "message": "Render completed but video file was not generated.",
                "logs": stdout_str + "\n" + stderr_str
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render execution failed: {str(e)}")


@app.get("/api/videos")
async def list_videos():
    videos = []
    for f in VIDEOS_DIR.glob("*.mp4"):
        try:
            stat = f.stat()
            videos.append({
                "name": f.name,
                "url": f"/api/videos/{f.name}",
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified": int(stat.st_mtime)
            })
        except Exception:
            pass
            
    videos.sort(key=lambda x: x["modified"], reverse=True)
    return {"videos": videos}


@app.get("/api/videos/{filename}")
async def stream_video(filename: str):
    file_path = VIDEOS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found.")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)


@app.get("/api/sound/clack")
async def get_clack_sound():
    clack_file = BASE_DIR / "clack.wav"
    if clack_file.exists():
        return FileResponse(clack_file, media_type="audio/wav")
    raise HTTPException(status_code=404, detail="Sound file not found")


# Serve static frontend
if WEB_DIR.exists():
    app.mount("/", StaticFiles(directory=str(WEB_DIR), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
