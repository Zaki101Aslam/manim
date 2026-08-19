#!/bin/bash
# =========================================================================
# MathMotion Studio - One-Click Launcher for macOS
# Double-click this file from Finder to launch the visual math animation studio!
# =========================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================================"
echo "🚀 Starting MathMotion Studio (Plug & Play Visual Math Studio)..."
echo "========================================================================"

if command -v uv &> /dev/null; then
    uv run python studio.py
else
    python3 studio.py
fi
