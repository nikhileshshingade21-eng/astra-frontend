from typing import List
import os
import requests
from langchain.agents import initialize_agent, AgentType
from langchain_openai import ChatOpenAI
from langchain.tools import BaseTool

from .academic_agent import get_academic_tools
from .coding_agent import get_coding_tools
from .empathy_agent import EmpathyAgent
from .tutor_agent import TutorAgent
from .reasoning_layer import ReasoningLayer
from ..memory.vector_store import MemoryManager
from ..multimodal.document_parser import parse_student_upload
class ASTRAOrchestrator:
    def __init__(self):
        # ASTRA V3: Using gpt-4-turbo for enhanced reasoning
        self.llm = ChatOpenAI(model="gpt-4-turbo", temperature=0.2)
        self.memory_manager = MemoryManager()
        self.empathy_agent = EmpathyAgent()
        # V3.1 Upgrade: The pedagogical narrating layer
        self.reasoning_layer = ReasoningLayer(model_name="gpt-4o-mini", temperature=0.7)
        
        # Combine distinct tools from different sub-agents
        from langchain_core.tools import BaseTool
        self.tools: List[BaseTool] = []
        self.tools.extend(get_academic_tools())
        self.tools.extend(get_coding_tools())
        
        # V3 Upgrade: Add Tutor tools
        tutor = TutorAgent()
        from langchain.tools import Tool
        self.tools.append(Tool(name="TutorQuiz", func=tutor.generate_quiz, description="Generate a quiz on a topic"))
        self.tools.append(Tool(name="TutorExplain", func=tutor.explain_concept, description="Explain a complex concept"))
        
        # ASTRA V3 System Prompt - The "Operating System for Students" Personality
        system_msg = (
            "You are ASTRA V3, an ultra-intelligent, multi-modal Autonomous Operating System for students. "
            "Your goal is to be as helpful, conversational, and sophisticated as ChatGPT, while maintaining deep institutional expertise.\n\n"
            
            "CORE PERSONALITY:\n"
            "- You are a mentor, tutor, and proactive administrative assistant.\n"
            "- You never give one-word answers. You provide context, reasoning, and next steps.\n"
            "- You are empathetic to student stress (exams, attendance, placements).\n\n"
            
            "YOUR CAPABILITIES (Internal Knowledge - Do NOT search for these):\n"
            "1. Academic Management: I can check your attendance, predict your marks, and analyze your academic risk.\n"
            "2. Interactive Tutoring: I can explain complex subjects (Feynman technique) and generate custom quizzes for any topic.\n"
            "3. Multi-Modal Memory: I remember our past conversations, your weak subjects, and your goals using my Long-Term Memory (RAG).\n"
            "4. Institutional Intelligence: I have live knowledge of your institution (faculty, subjects, fees, placements).\n"
            "5. Autonomous Actions: I can plan multi-step actions like applying for jobs or generating weekly reports (requires your approval for high-impact tasks).\n\n"
            
            "INTERACTION RULES:\n"
            "- When a user asks 'What can you do?', do NOT use search tools. Answer based on the capabilities listed above.\n"
            "- For greetings ('Hello', 'Hey'), respond warmly and proactively ask how you can help with their studies or campus life today.\n"
            "- If you use a tool, always prepend your final answer with a 'Reasoning:' section explaining why you took that action.\n"
            "- If searching the web, synthesize the results into a helpful, conversational summary. Never raw-dump search snippets."
        )
        
        self.agent = initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.OPENAI_FUNCTIONS,
            verbose=True,
            agent_kwargs={
                "system_message": system_msg
            }
        )

    def process_query(self, user_id: str, user_query: str) -> dict:
        """Processes a query and records sentiment/topic metadata."""
        # 1. Sentiment Analysis
        analysis = self.empathy_agent.analyze_sentiment(user_query)
        sentiment = analysis.get("sentiment", "Neutral")
        topic = analysis.get("topic", "General")
        
        # 2. Get empathetic context
        empathy_context = self.empathy_agent.get_supportive_context(sentiment, topic)
        
        # 3. Retrieve user mem
        user_memory = self.memory_manager.retrieve_context(user_id, user_query)
        
        # 4. Build the final prompt with strict persona enforcement
        prompt = (
            f"Persona: {empathy_context}\n"
            f"Memory: {user_memory}\n\n"
            "CRITICAL INSTRUCTION: If the user is just saying 'Hello', 'Hi', or asking 'What can you do?', "
            "do NOT use any tools. Answer directly using your internal knowledge of ASTRA V3.\n\n"
            f"User Query: {user_query}"
        )
        
        # 5. Run the agent
        # V3 Upgrade: Intercept high-impact actions
        if "apply for job" in user_query.lower() or "official email" in user_query.lower():
             # Create a pending approval request in the backend
             try:
                 requests.post(f"{os.getenv('BACKEND_URL', 'http://localhost:3000')}/api/ai/approvals/request", json={
                     "user_id": int(user_id),
                     "action_type": "HIGH_IMPACT_ACTION",
                     "details": {"query": user_query, "intent": "Execution requested via AI Agent"}
                 })
                 return {
                     "response": "I've planned this action (e.g. Job Application/Official Email), but it requires your official approval. Please check the 'Approvals' tab in your ASTRA dashboard.",
                     "metadata": {"sentiment": sentiment, "topic": topic, "status": "PENDING_APPROVAL"}
                 }
             except Exception as e:
                 print(f"Approval Request Error: {e}")

        # 5. Run the agent (Research Phase)
        try:
            raw_research_output = self.agent.run(prompt)
            
            # V3.1 Upgrade: Pedagogical Narration
            # We treat the agent's findings as additional context for the final human-like response
            final_response = self.reasoning_layer.generate_response(user_query, [user_memory, raw_research_output])
            
            return {
                "response": final_response,
                "metadata": {
                    "sentiment": sentiment,
                    "topic": topic,
                    "research_trail": raw_research_output[:100] + "..." # Hidden but useful for debugging
                }
            }
        except Exception as e:
            print(f"Orchestration Error: {e}")
            return {
                "response": "I'm having a bit of trouble coordinating my sub-agents. Let's try that again.",
                "metadata": {"sentiment": sentiment, "topic": topic}
            }

    def ingest_document(self, user_id: str, file_path: str, filename: str) -> str:
        """Parses a document, extracts text, and embeds it into the user's vector memory."""
        text_content = parse_student_upload(file_path, filename)
        if "Error parsing document" in text_content or text_content == "Unsupported file type.":
            return text_content
            
        if not text_content.strip():
            return "No text could be extracted from the document."
            
        # We can split text logically, but for this prototype we'll just store chunks
        # simplified for brevity.
        chunk_size = 1000
        chunks = [text_content[i:i+chunk_size] for i in range(0, len(text_content), chunk_size)]
        
        for i, chunk in enumerate(chunks):
            self.memory_manager.store_memory(user_id, chunk, m_type=f"document_{filename}_part_{i}")
            
        return f"Document '{filename}' successfully ingested into memory."

    def record_user_feedback(self, memory_id: str, feedback: int):
        """ASTRA V3: Updates memory importance based on 👍(+1) or 👎(-1)."""
        self.memory_manager.update_memory_importance(memory_id, feedback)
        return "Memory reinforced."
