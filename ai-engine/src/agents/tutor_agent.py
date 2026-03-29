from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import SystemMessage

class TutorAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4-turbo", temperature=0.5)
        
    def generate_quiz(self, topic: str, difficulty: str = "medium") -> str:
        """Generates a 3-question quiz for the student."""
        prompt = (
            f"You are the ASTRA Tutor. Generate a 3-question multiple-choice quiz about '{topic}' "
            f"at a {difficulty} level. Include the correct answers at the end."
        )
        return self.llm.predict(prompt)
        
    def explain_concept(self, concept: str) -> str:
        """Explains a complex topic using the Feynman technique."""
        prompt = (
            f"Explain the concept of '{concept}' as if I am 5 years old, then increasingly add complexity. "
            "Use relatable analogies."
        )
        return self.llm.predict(prompt)
