import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure the ai-engine directory is in the path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(script_dir)
    os.chdir(script_dir) # Change to ai-engine dir
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
