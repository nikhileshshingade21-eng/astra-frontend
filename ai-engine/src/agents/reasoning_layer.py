import re
import html
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain.chains import LLMChain

class ReasoningLayer:
    def __init__(self, model_name="gpt-4o-mini", temperature=0.7):
        self.llm = ChatOpenAI(
            temperature=temperature,
            model_name=model_name
        )
        
        # ASTRA V3.1: The "Friendly Teacher" Prompt Template
        self.astra_prompt = PromptTemplate(
            input_variables=["context", "question"],
            template="""
You are ASTRA V3.1, a smart, friendly, and human-like academic assistant for students. 
You act as a mentor and teacher.

STRICT RULES:
- NEVER show raw search results or technical logs.
- NEVER mention "Open Source Scan", "Wikipedia", "DuckDuckGo" or "internet data".
- NEVER copy-paste content directly; always rewrite in your own conversational words.
- Clean and fix any weird text, symbols, or HTML entities.
- Avoid technical jargon unless explaining it simply.
- If the context mentions specific college names like 'Sphoorthy', use 'your institution' or 'your campus' instead for a more personal touch.

TONE:
- Explain like a friendly teacher who wants the student to succeed.
- Keep it simple, clear, and encouraging.

RESPONSE FORMAT (Strictly follow this):
1. Simple Definition: (1–2 lines summarizing what it is)
2. Clear Explanation: (A friendly paragraph explaining the concept simply)
3. Example or Analogy: (A practical example related to a student's life or general knowledge)

Context:
{context}

User Question:
{question}

Answer:
"""
        )
        
        self.response_chain = LLMChain(
            llm=self.llm,
            prompt=self.astra_prompt
        )

    def clean_text(self, text: str) -> str:
        """Sanitizes HTML entities and tags from raw context data."""
        if not text:
            return ""
        # Remove HTML entities like &#39;
        text = html.unescape(text)
        # Remove any remaining HTML-like tags
        text = re.sub(r'<[^>]+>', '', text)
        return text.strip()

    def generate_response(self, question: str, retrieved_docs: list) -> str:
        """Synthesizes raw context into a pedagogical, human-like response."""
        # Step 1: Combine retrieved context (docs can be strings or LangChain Doc objects)
        raw_context = ""
        for doc in retrieved_docs:
            if hasattr(doc, 'page_content'):
                raw_context += doc.page_content + " "
            else:
                raw_context += str(doc) + " "

        # Step 2: Clean it
        context = self.clean_text(raw_context)

        # Step 3: Fallback if no context is found
        if not context or len(context) < 10:
            context = "No specific institutional records found. Use your general knowledge to help the student pedagogically."

        # Step 4: Run the chain
        try:
            response = self.response_chain.run({
                "context": context,
                "question": question
            })
            return response.strip()
        except Exception as e:
            print(f"Reasoning Layer Error: {e}")
            return "I'm having trouble synthesizing a response right now. Please try asking again in a moment."
