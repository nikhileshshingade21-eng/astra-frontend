from typing import List
from langchain.tools import tool, BaseTool
import urllib.request
import urllib.parse
import json
import re
import html
from langchain_community.tools import DuckDuckGoSearchRun

@tool
def get_campus_info(query: str) -> str:
    """Useful to get information about subjects, faculty, or institutional policies. NOT for greetings."""
    msg = query.lower()
    # Institutional Knowledge (Keep it as a library, but make it less intrusive)
    campus_db = {
        "odevc": "ODEVC is a core subject taught by Mrs. A Swarnalatha in Room 214.",
        "fee": "Tuition fees range from ₹40,000 - ₹50,000 per semester.",
        "placement": "Multi-national companies often conduct campus drives. High CGPA is recommended."
    }
    
    for key, val in campus_db.items():
        if key in msg:
            return val
            
    # If not a specific campus query, return None to let the LLM handle it natively
    return "No specific institutional record found for this query."

@tool
def get_student_marks(user_id: str) -> str:
    """Fetches the current academic marks for the user/student."""
    # Dummy DB lookup, in reality, query Postgres or call AcademicsService Node.js API
    return f"Marks for student {user_id}: Math: 85, Physics: 78, CS: 92."

@tool
def get_student_attendance(user_id: str) -> str:
    """Fetches the current attendance percentage for the user/student."""
    # Dummy DB lookup
    return f"Attendance for student {user_id} is currently 82%."

def live_web_search(query: str) -> str:
    """Useful to get general knowledge from the live internet."""
    try:
        search = DuckDuckGoSearchRun()
        return search.run(query)
    except Exception as e:
        return _live_search(query)

def _live_search(query: str) -> str:
    encoded_query = urllib.parse.quote(query)
    url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={encoded_query}&utf8=&format=json"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ASTRA-AI/3.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if "query" in data and data["query"]["search"]:
                snippet = data["query"]["search"][0]["snippet"]
                # Sanitize HTML tags and entities
                clean_snippet = re.sub(r'<[^>]+>', '', snippet).strip()
                return html.unescape(clean_snippet)
    except Exception:
        pass
    return "No relevant information found."
    
def get_academic_tools() -> List[BaseTool]:
    """Returns a list of tools for the academic agent."""
    # Customizing DuckDuckGo description to prevent over-use
    ddg_tool = DuckDuckGoSearchRun(
        description="A search engine for general knowledge about the world, current events, and facts. Use ONLY when campus-specific tools fail and the query is NOT about ASTRA's own capabilities."
    )
    return [get_campus_info, get_student_marks, get_student_attendance, ddg_tool]
