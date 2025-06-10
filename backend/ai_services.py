import os
from dotenv import load_dotenv
from pathlib import Path
from typing import List, Dict, Any, Optional

# .env 파일을 이 모듈의 최상단에서 로드하여, 임포트 순서에 관계없이
# llm 객체 초기화 전에 환경 변수가 확실히 로드되도록 합니다.
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.runnables import RunnableLambda # Added for logging
from pydantic import BaseModel, Field as PydanticField, ValidationError # Updated import

from pypdf import PdfReader
from . import models # Assuming models.py is in the same directory or accessible

# Gemini LLM을 초기화합니다.
# load_dotenv가 호출되었으므로, 라이브러리가 자동으로 환경에서 GOOGLE_API_KEY를 찾습니다.
# langchain 라이브러리가 자동으로 키를 찾도록 명시적인 파라미터를 제거하고,
# 모델 이름을 안정적인 최신 버전으로 업데이트합니다.
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-preview-05-20", temperature=0.7)

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
    text: str = PydanticField(..., description="Text content/title of this outline section") # Renamed from title
    id: str = PydanticField(..., description="A unique, URL-friendly ID for this section (e.g., 'introduction-to-calculus')")
    children: Optional[List['LLMOutlineItem']] = PydanticField(None, description="Nested outline items, if any")

LLMOutlineItem.update_forward_refs()

class LLMAINotes(BaseModel):
    summary: str = PydanticField(..., description="A concise summary of the provided text content.")
    key_concepts: List[LLMKeyConcept] = PydanticField(..., description="A list of 3-5 key concepts discussed in the text.")
    important_terms: Optional[List[LLMImportantTerm]] = PydanticField(None, description="A list of 5-7 important terms and their definitions from the text.") # Made optional
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

def _convert_llm_outline_to_model_outline(llm_item: LLMOutlineItem) -> models.OutlineItem:
    """Helper to recursively convert LLMOutlineItem instances to application model outline items."""
    children = []
    if llm_item.children: # Access as attribute
        children = [_convert_llm_outline_to_model_outline(child) for child in llm_item.children]
    
    return models.OutlineItem(
        title=llm_item.text, # Access as attribute
        id=llm_item.id,       # Access as attribute
        children=children if children else None)

async def suggest_notebook_for_text(text_content: str, existing_notebook_titles: Optional[List[str]] = None) -> Optional[str]:
    """Suggests a concise notebook title based on the provided text content using Gemini.

    Args:
        text_content: The text extracted from a PDF.
        existing_notebook_titles: An optional list of existing notebook titles to help the AI 
                                  suggest a new unique name or match an existing one if highly relevant.

    Returns:
        A string suggestion for a notebook title, or None if an error occurs or no content.
    """
    if not text_content:
        return None

    parser = StrOutputParser()

    # Prepare context about existing notebooks if provided
    existing_notebooks_prompt_segment = ""
    if existing_notebook_titles:
        titles_str = "\n - ".join(existing_notebook_titles)
        existing_notebooks_prompt_segment = (
            f"Consider the following existing notebook titles:\n - {titles_str}\n\n"
            "If the content is very similar to one of these, you can suggest that title. "
            "Otherwise, please suggest a new, unique, and descriptive title."
        )
    else:
        existing_notebooks_prompt_segment = "Please suggest a new, descriptive title."


    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are an expert academic assistant specializing in organizing study materials. "
                   "Your task is to analyze the provided text content and suggest a concise and descriptive title for a study notebook that would contain this content. "
                   "The title should ideally be 3-5 words long and clearly reflect the main subject or topic of the text. "
                   f"{existing_notebooks_prompt_segment}"
                   "Respond ONLY with the suggested notebook title string, and nothing else."),
        ("human", "Please suggest a notebook title for the following text content: \n\n--BEGIN TEXT CONTENT--\n{text_content}\n--END TEXT CONTENT--")
    ])

    chain = prompt_template | llm | parser

    try:
        # Summarize a portion of the text if it's too long to avoid exceeding token limits for this specific task
        # This task (title suggestion) might not need the full text if it's very extensive.
        # For now, we'll use the full text but keep this in mind for optimization.
        # A good heuristic might be the first N characters or a summary if the text is > M characters.
        # For example, if len(text_content) > 10000: text_for_prompt = text_content[:10000]
        text_for_prompt = text_content # Using full text for now

        suggested_title = await chain.ainvoke({"text_content": text_for_prompt})
        
        # Clean up the title: remove potential quotes or extra formatting if LLM adds them
        suggested_title = suggested_title.strip().replace('"', '').replace('\'', '')
        if suggested_title.lower().startswith("title:"):
            suggested_title = suggested_title[len("title:"):].strip()
        
        return suggested_title if suggested_title else None

    except Exception as e:
        print(f"Error suggesting notebook title with LLM: {e}")
        return None

# --- Full Chapter Generation from PDF Text ---

class LLMDocumentContentBlock(BaseModel):
    block_type: str = PydanticField(..., description="Type of content block, e.g., 'paragraph', 'heading'.") # Renamed from 'type'
    text: Optional[str] = PydanticField(None, description="Text content for paragraph, heading, etc.")
    level: Optional[int] = PydanticField(None, description="Heading level (e.g., 1, 2, 3) if type is 'heading'.")
    # image_url: Optional[str] = PydanticField(None, description="URL for image content if type is 'image'.") lists, images, code

class LLMQuizQuestion(BaseModel):
    question: str = PydanticField(..., description="The quiz question.")
    type: str = PydanticField(..., description="Type of quiz question, e.g., 'multiple_choice', 'short_answer'.")
    options: Optional[List[str]] = PydanticField(None, description="A list of 2-4 multiple choice options, if type is 'multiple_choice'.")
    answer_index: Optional[int] = PydanticField(None, description="The 0-based index of the correct option, if type is 'multiple_choice'.")
    answer: Optional[str] = PydanticField(None, description="The correct answer text, if type is 'short_answer'.")
    explanation: Optional[str] = PydanticField(None, description="A brief explanation for the correct answer.")

class LLMMetadata(BaseModel):
    source_pdf: str = PydanticField(..., description="The original PDF filename provided by the LLM.")
    text_length_characters: int = PydanticField(..., description="The approximate length of the text content in characters, provided by the LLM.")

class LLMGeneratedChapter(BaseModel):
    title: str = PydanticField(..., description="A concise and relevant title for the chapter based on the text.")
    metadata: LLMMetadata = PydanticField(..., description="Structured metadata about the source text, including PDF filename and length.")
    document_content_blocks: List[LLMDocumentContentBlock] = PydanticField(..., description="A list of content blocks (paragraphs, headings).")
    ai_notes: LLMAINotes = PydanticField(..., description="AI-generated notes (summary, key concepts, terms, outline).")
    quiz: List[LLMQuizQuestion] = PydanticField(..., description="A short quiz with 2-3 questions based on the text content.")

async def generate_content_for_chapter(text_content: str, original_pdf_filename: str) -> Optional[models.DocumentContent]:
    """
    Analyzes a chapter's text and generates a structured DocumentContent object,
    including a title, summary, and other AI-generated notes.
    This function is designed to be more robust and replaces the older, more complex `generate_chapter_from_pdf_text`.

    Args:
        text_content: The text of the chapter.
        original_pdf_filename: The filename of the source PDF for metadata.

    Returns:
        A `models.DocumentContent` object or None if generation fails.
    """
    if not text_content:
        print("[CONTENT GEN] Error: No text content provided.")
        return None

    # We will generate a title and AI Notes (summary, key concepts, etc.)
    # We are simplifying the model for now to ensure reliability. The LLM will
    # produce a title and an AINotes object. The rest will be constructed.
    class LLMChapterTitleAndSummary(BaseModel):
        title: str = PydanticField(..., description="A concise and relevant title for the chapter based on the text.")
        summary: str = PydanticField(..., description="A concise summary of the provided text content.")

    parser = JsonOutputParser(pydantic_object=LLMChapterTitleAndSummary)

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are an expert academic assistant. Your task is to analyze the provided text and generate a concise title and a summary for it. "
                   "Format your response as a JSON object with 'title' and 'summary' keys, adhering to the following Pydantic schema:\n{format_instructions}"),
        ("human", "Please generate a title and summary for the following text:\n\n--BEGIN TEXT CONTENT--\n{text_content}\n--END TEXT CONTENT--")
    ])

    chain = prompt_template | llm | parser

    try:
        # Generate title and summary
        generated_data = await chain.ainvoke({"text_content": text_content, "format_instructions": parser.get_format_instructions()})

        title = generated_data.get("title", "Untitled Chapter")
        summary = generated_data.get("summary", "")

        # For now, we'll create a simple DocumentContent structure.
        # The `documentContent` will just be a single paragraph block with the original text.
        # The `aiNotes` will contain the generated summary.
        # `quiz` and other complex parts are omitted for stability, as per the user request.

        document_blocks = [
            models.DocumentContentBlock(type="paragraph", text=text_content)
        ]

        ai_notes = models.AINotes(
            summary=summary,
            keyConcepts=[], # To be implemented later if needed
            importantTerms=[], # To be implemented later if needed
            outline=[] # To be implemented later if needed
        )
        
        metadata = f"Source: {original_pdf_filename}, Text length: {len(text_content)} chars"

        # Construct the final DocumentContent object
        # Ensure all required fields for DocumentContent are present.
        document_content = models.DocumentContent(
            title=title,
            metadata=metadata,
            documentContent=document_blocks,
            aiNotes=ai_notes,
            quiz=[] # Quiz is required, so provide an empty list.
        )
        
        print(f"[CONTENT GEN] Successfully generated content for chapter: '{title}'")
        return document_content

    except Exception as e:
        print(f"[CONTENT GEN] Error generating chapter content with LLM: {e}")
        return None

async def classify_pdf_text(text_content: str, existing_classes: List[str]) -> Optional[str]:
    """
    Analyzes the text content and classifies it into one of the existing classes
    or suggests a new class if no suitable match is found.

    Args:
        text_content: The text extracted from the PDF.
        existing_classes: A list of existing class titles (e.g., from notebooks.json).

    Returns:
        A string representing the determined class name, or None if an error occurs.
    """
    if not text_content:
        return None

    parser = StrOutputParser()

    classes_str = "\n - ".join(existing_classes)
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are an expert academic librarian. Your task is to analyze the provided text and determine the most appropriate subject class for it. "
                   "You are given a list of existing classes. First, try to classify the document into one of these existing classes. "
                   f"Existing classes:\n - {classes_str}\n\n"
                   "If the text fits well into one of the existing classes, respond with that exact class name. "
                   "If the text represents a new, distinct topic not covered by the existing classes, suggest a new, concise class name (e.g., 'Quantum Mechanics', 'Ancient Roman History'). "
                   "Respond ONLY with the single, most appropriate class name and nothing else."),
        ("human", "Please classify the following text:\n\n--BEGIN TEXT CONTENT--\n{text_content}\n--END TEXT CONTENT--")
    ])

    chain = prompt_template | llm | parser

    try:
        # Use a portion of the text to keep the request focused and efficient for classification
        text_for_prompt = text_content[:15000] if len(text_content) > 15000 else text_content
        
        classification = await chain.ainvoke({"text_content": text_for_prompt})
        
        # Clean up the output
        classification = classification.strip().replace('"', '').replace("'", "")
        if classification.lower().startswith("class:"):
            classification = classification[len("class:"):].strip()
            
        return classification if classification else None

    except Exception as e:
        print(f"Error classifying text with LLM: {e}")
        return None
async def segment_text_into_chapters(text_content: str, document_class: str) -> Optional[List[str]]:
    """
    Segments the given text into meaningful chapters based on the document's class.

    Args:
        text_content: The full text content of the document.
        document_class: The classification of the document (e.g., 'Economics', 'History').

    Returns:
        A list of strings, where each string is the text of a chapter, or None on error.
    """
    if not text_content:
        return None

    # We expect a simple list of strings as output, so a basic parser is sufficient.
    # The real magic is in the prompt.
    parser = StrOutputParser()

    # The prompt needs to be carefully engineered to guide the LLM.
    # We ask for the output to be a JSON array of strings for robust parsing.
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "You are an expert in content analysis and structuring. Your task is to segment a long text document into logical, semantically complete chapters. "
                   "Consider the document's overall topic, which is '{document_class}'. "
                   "Each chapter should represent a coherent sub-topic or section of the main content. Avoid creating chapters that are too short (e.g., just a few sentences) or excessively long. "
                   "The output MUST be a JSON-formatted array of strings, where each string is the full text of a chapter. "
                   "For example: [\"Chapter 1 text...\", \"Chapter 2 text...\", \"Chapter 3 text...\"]"
                   "Do not include any other text or explanation outside of this JSON array."),
        ("human", "Please segment the following text into chapters:\n\n--BEGIN TEXT CONTENT--\n{text_content}\n--END TEXT CONTENT--")
    ])

    chain = prompt_template | llm | parser

    try:
        raw_output = await chain.ainvoke({
            "text_content": text_content,
            "document_class": document_class
        })
        
        # The output should be a JSON string representing a list.
        # We'll parse it to get the actual list of strings.
        import json
        # A simple cleanup to remove potential markdown code fences
        if raw_output.strip().startswith("```json"):
            raw_output = raw_output.strip()[7:-3].strip()
        elif raw_output.strip().startswith("```"):
             raw_output = raw_output.strip()[3:-3].strip()


        chapters = json.loads(raw_output)
        
        if isinstance(chapters, list) and all(isinstance(c, str) for c in chapters):
            return chapters
        else:
            print(f"Error: LLM output was not a list of strings after parsing. Got: {type(chapters)}")
            return None

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from LLM output: {e}")
        print(f"Raw LLM output was: {raw_output}")
        return None
    except Exception as e:
        print(f"Error segmenting text into chapters with LLM: {e}")
        return None
