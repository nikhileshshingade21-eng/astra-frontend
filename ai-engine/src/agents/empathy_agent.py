from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

class EmpathyAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7)
        
    def analyze_sentiment(self, query: str) -> dict:
        """Analyzes the query for sentiment and topic."""
        prompt = ChatPromptTemplate.from_template(
            "Analyze the following student query for sentiment (Neutral, Stressed, Frustrated, Excited, Curios) "
            "and the main topic (Academics, Personal, Career, Financial, General). "
            "Return ONLY a JSON object with keys 'sentiment' and 'topic'.\n\nQuery: {query}"
        )
        chain = prompt | self.llm
        try:
            # We use a simple string extraction if JsonOutputParser isn't available
            res = chain.invoke({"query": query}).content
            # Basic cleaning in case LLM adds markdown
            res = res.replace("```json", "").replace("```", "").strip()
            import json
            return json.loads(res)
        except Exception as e:
            print(f"Sentiment Analysis Error: {e}")
            return {"sentiment": "Neutral", "topic": "General"}

    def get_supportive_context(self, sentiment: str, topic: str) -> str:
        """Provides empathetic instructions based on sentiment."""
        if sentiment == "Stressed":
            return (
                "The student seems stressed. Acknowledge their pressure, offer encouraging words, "
                "and suggest breaking down tasks into smaller steps. Remind them that their institution "
                "has resources to help."
            )
        elif sentiment == "Frustrated":
            return (
                "The student seems frustrated. Validate their feelings, stay calm, and focus on practical solutions. "
                "Avoid being overly robotic."
            )
        elif sentiment == "Excited":
            return "The student is excited! Match their energy and be encouraging."
        
        return "Maintain a helpful and professional academic tone."
