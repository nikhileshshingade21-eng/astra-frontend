import io
import os
try:
    from unstructured.partition.pdf import partition_pdf
    from unstructured.partition.docx import partition_docx
    from unstructured.partition.text import partition_text
except ImportError:
    pass

def parse_student_upload(file_path: str, filename: str) -> str:
    """Extract text and layout from student uploads."""
    try:
        text_content = ""
        if filename.lower().endswith(".pdf"):
            elements = partition_pdf(filename=file_path)
            # Filter for Text/NarrativeText
            text_content = "\n".join([str(el) for el in elements if hasattr(el, 'text')])
        elif filename.lower().endswith(".docx"):
            elements = partition_docx(filename=file_path)
            text_content = "\n".join([str(el) for el in elements if hasattr(el, 'text')])
        elif filename.lower().endswith(".txt"):
            elements = partition_text(filename=file_path)
            text_content = "\n".join([str(el) for el in elements if hasattr(el, 'text')])
        else:
            return "Unsupported file type."
        
        return text_content
    except Exception as e:
        return f"Error parsing document: {str(e)}"
