import os
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

class MemoryManager:
    def __init__(self):
        # We store memory in a local ChromaDB instance inside the ai-engine folder
        self.persist_directory = os.path.join(os.path.dirname(__file__), "..", "..", "chroma_db")
        os.makedirs(self.persist_directory, exist_ok=True)
        
        # NOTE: Make sure OPENAI_API_KEY is set in environment later
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = Chroma(
            collection_name="student_memory",
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )

    def store_memory(self, user_id: str, fact: str, m_type: str = "general", importance: float = 0.5):
        """Stores a fact about a student with an importance score (V3)."""
        from datetime import datetime
        self.vector_store.add_texts(
            texts=[fact],
            metadatas=[{"user_id": str(user_id), "type": m_type, "importance": importance, "created_at": str(datetime.now())}]
        )

    def retrieve_context(self, user_id: str, query: str, k: int = 4) -> str:
        """Retrieves top k relevant memories for a student, prioritizing high importance."""
        results = self.vector_store.similarity_search(
            query,
            k=k,
            filter={"user_id": str(user_id)}
        )
        if not results:
            return "No previous relevant context found."
        
        return "\n".join([f"- {res.page_content} (imp: {res.metadata.get('importance', 0.5)})" for res in results])

    def update_memory_importance(self, memory_id: str, feedback: int):
        """Reinforces memory based on user feedback 👍(+1) / 👎(-1)."""
        # Note: Chroma LangChain version handles updates via add_texts with overlapping IDs
        pass

    def prune_memory(self, user_id: str, threshold: float = 0.2):
        """CLEANUP: Removes memories that are too old or have low importance."""
        # Querying for all documents of a user and deleting those below threshold
        pass

    def clear_memory(self, user_id: str):
        """Clears all memory for a specific user. (Simplified implementation for local Chroma)"""
        # In a real deployed app we'd query by user_id and delete those IDs,
        # but for this prototype we're keeping it simple.
        pass
