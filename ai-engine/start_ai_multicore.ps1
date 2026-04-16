# ASTRA High-Performance AI Loader (Multi-Core)
# Use this for high-load environments (20+ concurrent scans)

Write-Host "🚀 INITIATING ASTRA MULTI-CORE AI ENGINE..." -ForegroundColor Cyan
Write-Host "Config: 4 Workers (Parallel Processing Active)" -ForegroundColor Gray

# Equivalent to Gunicorn + Uvicorn workers on Windows
& uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
