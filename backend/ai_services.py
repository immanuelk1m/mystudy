import os
from typing import List, Dict, Any, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel, Field as PydanticField # To avoid conflict with FastAPI's Field

from pypdf import PdfReader
from . import models # Assuming models.py is in the same directory or accessible

# Initialize the Gemini LLM
# It will automatically use GOOGLE_API_KEY from the environment
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", temperature=0.7)

# --- PDF Processing ---
def extract_text_from_pdf(pdf_file_path: str) -> str:
    """Extracts text from a given PDF file."""
    try:
        reader = PdfReader(pdf_file_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF {pdf_file_path}: {e}")
        # Consider raising a custom exception or returning an error indicator
        return ""

# --- AI Notes Generation Pydantic Models for LLM Output ---
# These help in getting structured JSON output from the LLM

class LLMKeyConceptDefinition(BaseModel):
    easy: Optional[str] = PydanticField(None, description="Simplified definition for beginners")
    medium: Optional[str] = PydanticField(None, description="Standard definition")
    hard: Optional[str] = PydanticField(None, description="Advanced or nuanced definition")

class LLMKeyConcept(BaseModel):
    term: str = PydanticField(..., description="The key concept or term")
    definition: str | LLMKeyConceptDefinition = PydanticField(..., description="Definition of the term, can be simple string or detailed levels")

class LLMImportantTerm(BaseModel):
    term: str = PydanticField(..., description="An important term related to the content")
    definition: str = PydanticField(..., description="A concise definition of the term")

class LLMOutlineItem(BaseModel):
    title: str = PydanticField(..., description="Title of this outline section")
    id: str = PydanticField(..., description="A unique, URL-friendly ID for this section (e.g., 'introduction-to-calculus')")
    children: Optional[List['LLMOutlineItem']] = PydanticField(None, description="Nested outline items, if any")

LLMOutlineItem.update_forward_refs()

class LLMAINotes(BaseModel):
    summary: str = PydanticField(..., description="A concise summary of the provided text content.")
    key_concepts: List[LLMKeyConcept] = PydanticField(..., description="A list of 3-5 key concepts discussed in the text.")
    important_terms: List[LLMImportantTerm] = PydanticField(..., description="A list of 5-7 important terms and their definitions from the text.")
    outline: List[LLMOutlineItem] = PydanticField(..., description="A hierarchical outline of the text content.")

async def generate_ai_notes_from_text(text_content: str) -> Optional[models.AINotes]:
    """Generates AI Notes (summary, key concepts, terms, outline) from text using Gemini."""
    if not text_content:
        return None

    parser = JsonOutputParser(pydantic_object=LLMAINotes)

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are an expert academic assistant. Your task is to analyze the provided text content and generate comprehensive AI Notes. "
                   "The AI Notes should include a summary, key concepts with definitions (some definitions can be simple strings, others can have 'easy', 'medium', 'hard' levels), important terms with definitions, and a hierarchical outline. "
                   "Ensure IDs for outline items are unique and URL-friendly (e.g., 'topic-subsection'). "
                   "Format your response as a JSON object that strictly adheres to the following Pydantic schema: \n{format_instructions}"),
        ("human", "Please generate AI Notes for the following text content: \n\n--BEGIN TEXT CONTENT--\n{text_content}\n--END TEXT CONTENT--")
    ])

    chain = prompt_template | llm | parser

    try:
        ai_notes_data = await chain.ainvoke({
            "text_content": text_content,
            "format_instructions": parser.get_format_instructions()
        })
        
        # Convert LLM output models to your application's Pydantic models (models.AINotes)
        # This mapping needs to be precise.
        return models.AINotes(
            summary=ai_notes_data.get('summary', ''),
            keyConcepts=[models.KeyConcept(
                term=kc.get('term'), 
                definition=kc.get('definition') # This handles both str and dict from LLMKeyConcept
            ) for kc in ai_notes_data.get('key_concepts', [])],
            importantTerms=[models.ImportantTerm(
                term=it.get('term'), 
                definition=it.get('definition')
            ) for it in ai_notes_data.get('important_terms', [])],
            outline=[_convert_llm_outline_to_model_outline(item) for item in ai_notes_data.get('outline', [])]
        )

    except Exception as e:
        print(f"Error generating AI notes with LLM: {e}")
        return None

def _convert_llm_outline_to_model_outline(llm_item: Dict[str, Any]) -> models.OutlineItem:
    """Helper to recursively convert LLM outline items to application model outline items."""
    return models.OutlineItem(
        title=llm_item.get('title'),
        id=llm_item.get('id'),
        children=([_convert_llm_outline_to_model_outline(child) for child in llm_item.get('children')] 
                    if llm_item.get('children') else None)
    )

# --- Full Chapter Generation from PDF Text ---

class LLMDocumentContentBlock(BaseModel):
    type: str = PydanticField(..., description="Type of content block, e.g., 'paragraph', 'heading'.")
    text: Optional[str] = PydanticField(None, description="Text content for paragraph, heading, etc.")
    level: Optional[int] = PydanticField(None, description="Heading level (e.g., 1, 2, 3) if type is 'heading'.")
    # Add other fields if LLM is expected to generate more complex blocks like lists, images, code

class LLMQuizQuestion(BaseModel):
    question: str = PydanticField(..., description="The quiz question.")
    options: List[str] = PydanticField(..., description="A list of 2-4 multiple choice options.")
    answer_index: int = PydanticField(..., description="The 0-based index of the correct option in the options list.")
    explanation: str = PydanticField(..., description="A brief explanation for the correct answer.")

class LLMGeneratedChapter(BaseModel):
    title: str = PydanticField(..., description="A concise and relevant title for the chapter based on the text.")
    metadata: str = PydanticField(..., description="Short metadata, e.g., 'Source: Uploaded PDF - [original_pdf_filename], Text length: [length] chars'.")
    document_content_blocks: List[LLMDocumentContentBlock] = PydanticField(..., description="A list of content blocks (paragraphs, headings) derived from the text. Aim for logical structure.")
    ai_notes: LLMAINotes = PydanticField(..., description="Comprehensive AI notes including summary, key concepts, important terms, and outline based on the text.")
    quiz: List[LLMQuizQuestion] = PydanticField(..., description="A short quiz with 2-3 questions based on the text content.")

async def generate_chapter_from_pdf_text(text_content: str, original_pdf_filename: str) -> Optional[models.DocumentContent]:
    """Generates full chapter content (title, metadata, content blocks, AINotes, quiz) from PDF text using Gemini."""
    if not text_content:
        return None

    parser = JsonOutputParser(pydantic_object=LLMGeneratedChapter)

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", f"You are an expert content creator and academic assistant. Your task is to analyze the provided text, which was extracted from a PDF named '{original_pdf_filename}', and generate a complete, well-structured chapter. "
                   "The chapter should include: a concise title, metadata (mentioning the source PDF and text length), a series of document content blocks (like paragraphs and headings to structure the main information), comprehensive AI Notes (summary, key concepts, important terms, outline), and a short quiz (2-3 questions). "
                   "For document_content_blocks, use 'paragraph' for general text and 'heading' for section titles (specify 'level' for headings, e.g., 2 for main sections, 3 for subsections). "
                   "Ensure IDs for outline items within AI Notes are unique and URL-friendly. "
                   "Format your entire response as a single JSON object that strictly adheres to the following Pydantic schema: \n{{format_instructions}}"),
        ("human", "Please generate a full chapter from the following text content: \n\n--BEGIN TEXT CONTENT--\n{text_content}\n--END TEXT CONTENT--\n\nRemember to include a title, metadata, document_content_blocks, ai_notes, and a quiz in your response.")
    ])

    chain = prompt_template | llm | parser

    try:
        # Calculate text length for metadata
        text_length = len(text_content)
        metadata_info = f"Source: Uploaded PDF - {original_pdf_filename}, Text length: {text_length} chars (approx.)"

        generated_chapter_data = await chain.ainvoke({
            "text_content": text_content,
            "original_pdf_filename": original_pdf_filename, # For the prompt context
            "format_instructions": parser.get_format_instructions()
        })

        # Map LLM output to application's models.DocumentContent
        doc_content_blocks_from_llm = generated_chapter_data.get('document_content_blocks', [])
        app_doc_content_blocks = []
        for block_data in doc_content_blocks_from_llm:
            # Basic mapping, assuming LLM provides 'type' and other relevant fields like 'text', 'level'
            app_block = {'type': block_data.get('type')}
            if 'text' in block_data:
                app_block['text'] = block_data['text']
            if 'level' in block_data and block_data.get('type') == 'heading':
                app_block['level'] = block_data['level']
            app_doc_content_blocks.append(app_block)
        
        ai_notes_from_llm = generated_chapter_data.get('ai_notes', {})
        app_ai_notes = models.AINotes(
            summary=ai_notes_from_llm.get('summary', ''),
            keyConcepts=[models.KeyConcept(
                term=kc.get('term'), 
                definition=kc.get('definition') 
            ) for kc in ai_notes_from_llm.get('key_concepts', [])],
            importantTerms=[models.ImportantTerm(
                term=it.get('term'), 
                definition=it.get('definition')
            ) for it in ai_notes_from_llm.get('important_terms', [])],
            outline=[_convert_llm_outline_to_model_outline(item) for item in ai_notes_from_llm.get('outline', [])]
        )

        quiz_from_llm = generated_chapter_data.get('quiz', [])
        app_quiz = [models.QuizQuestion(
            question=q.get('question'),
            options=q.get('options'),
            answerIndex=q.get('answer_index'), # Ensure field name matches your model if different
            explanation=q.get('explanation')
        ) for q in quiz_from_llm]

        return models.DocumentContent(
            title=generated_chapter_data.get('title', 'Untitled Chapter'),
            metadata=generated_chapter_data.get('metadata', metadata_info), # Use LLM metadata, fallback to basic
            documentContent=app_doc_content_blocks, # Mapped content blocks
            aiNotes=app_ai_notes,
            quiz=app_quiz
        )

    except Exception as e:
        print(f"Error generating full chapter with LLM: {e}")
        # import traceback
        # traceback.print_exc()
        return None
