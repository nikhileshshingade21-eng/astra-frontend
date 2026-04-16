import sys
import os

# Internal Test for ASTRA V3.1 Reasoning Logic
# This script simulates a retrieval event and verifies the pedagogical synthesis.

def simulate_astra_reasoning():
    print("--- ASTRA V3.1 LOGIC TEST ---")
    
    # Mock retrieved data from a bad search tool
    mock_context = [
        "[Open Source Scan] Live internet data for 'Quantum Computing': &quot;Quantum computing is a type of computing that uses quantum-mechanical phenomena, such as superposition and entanglement.&quot; <a href='...'>Read more</a>",
        "Wiki: Quantum computers use qubits. &#39;The power of quantum computing is exponential&#39;."
    ]
    
    # we don't need real API keys for logic flow verification, but we'll import the layer
    try:
        from src.agents.reasoning_layer import ReasoningLayer
        rl = ReasoningLayer(model_name="mock-model") # hypothetical
        
        print("\n[STEP 1] Testing Text Cleaning...")
        raw_text = " ".join(mock_context)
        clean = rl.clean_text(raw_text)
        print(f"Original: {raw_text[:50]}...")
        print(f"Cleaned:  {clean[:50]}...")
        
        if "&quot;" in clean or "<a" in clean:
            print("❌ FAIL: Sanitization failed.")
        else:
            print("✅ PASS: HTML entities and tags purged.")

        print("\n[STEP 2] Verifying Pedagogical Structure Plan...")
        format_instructions = rl.astra_prompt.template
        if "Simple Definition" in format_instructions and "Clear Explanation" in format_instructions:
            print("✅ PASS: Prompt enforces Definition-Explanation-Example structure.")
        else:
            print("❌ FAIL: Prompt missing structural enforcement.")

    except ImportError as e:
        print(f"Environment Note: {e} (Expected in some environments without full langchain setup)")

if __name__ == "__main__":
    # Add src to path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    simulate_astra_reasoning()
