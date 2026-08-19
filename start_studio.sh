#!/usr/bin/env bash
# =========================================================================
# MathMotion Studio - One-Click Launcher
# Usage: ./start_studio.sh
# =========================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================================"
echo "🚀 Launching MathMotion Studio on http://localhost:8000..."
echo "========================================================================"

if command -v uv &> /dev/null; then
    uv run python studio.py
else
    python3 studio.py
fi
