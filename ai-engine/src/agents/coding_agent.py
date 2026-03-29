from typing import List
from langchain.tools import tool, BaseTool
import subprocess
import tempfile
import os

@tool
def execute_python_code(code: str) -> str:
    """Useful to execute python code and return its stdout output or errors.
    Always pass the complete and fully functional python code string."""
    try:
        # Create a temporary file to run the code
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w") as f:
            f.write(code)
            temp_path = f.name
        
        # Run it safely with a timeout
        result = subprocess.run(
            ["python", temp_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        os.remove(temp_path)
        
        if result.returncode != 0:
            return f"Error Execution Failed:\n{result.stderr}"
        return f"Code Executed Successfully. Output:\n{result.stdout}"
    except Exception as e:
        return f"Failed to execute code: {str(e)}"

@tool
def debug_code_error(code: str, error_message: str) -> str:
    """Analyzes a code snippet and an error message, returning debugging advice.
    This is an internal LLM reasoning tool."""
    return f"I see the error '{error_message}'. To fix this, ensure your syntax is correct and all variables are defined. " \
           f"Provide the exact line number where the error occurs for deeper inspection."

def get_coding_tools() -> List[BaseTool]:
    """Returns a list of tools for the coding agent."""
    return [execute_python_code, debug_code_error]
