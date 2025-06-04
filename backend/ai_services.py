import os
from typing import List, Dict, Any, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.runnables import RunnableLambda # Added for logging
from pydantic import BaseModel, Field as PydanticField # Updated import

from pypdf import PdfReader
from . import models # Assuming models.py is in the same directory or accessible

# Initialize the Gemini LLM
# It will automatically use GOOGLE_API_KEY from the environment
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

def _convert_llm_outline_to_model_outline(llm_item: LLMOutlineItem) -> models.OutlineItem:
    """Helper to recursively convert LLMOutlineItem instances to application model outline items."""
    children = []
    if llm_item.children: # Access as attribute
        children = [_convert_llm_outline_to_model_outline(child) for child in llm_item.children]
    
    return models.OutlineItem(
        title=llm_item.title, # Access as attribute
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
                   "IMPORTANT for 'ai_notes.key_concepts': Each item in the 'key_concepts' list MUST have a non-null 'term' (string) AND a non-null 'definition' (which can be a simple string OR a KeyConceptDefinition object). If 'definition' is a KeyConceptDefinition object, at least one of its 'easy', 'medium', or 'hard' fields must be a string; others can be null if not applicable. These fields are critical for successful parsing. "
                   "Ensure IDs for outline items within AI Notes are unique and URL-friendly. "
                   "Format your entire response as a single JSON object that strictly adheres to the following Pydantic schema: \n{{format_instructions}}"),
        ("human", "Please generate a full chapter from the following text content: \n\n--BEGIN TEXT CONTENT--\n{text_content}\n--END TEXT CONTENT--\n\nRemember to include a title, metadata, document_content_blocks, ai_notes, and a quiz in your response.")
    ])

    def _log_llm_output_before_parsing(item):
        print("--- LLM RAW OUTPUT START ---")
        if hasattr(item, 'content'): # AIMessage
            print(item.content)
        else: # Raw string or other type
            print(item)
        print("--- LLM RAW OUTPUT END ---")
        return item
    
    chain = prompt_template | llm | RunnableLambda(_log_llm_output_before_parsing) | parser

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
        # generated_chapter_data is an instance of LLMGeneratedChapter

        app_doc_content_blocks = []
        # LLMGeneratedChapter.document_content_blocks is required, so generated_chapter_data.document_content_blocks should exist.
        for block in generated_chapter_data.document_content_blocks: # block is LLMDocumentContentBlock
            app_block_data = {'type': block.type}
            if block.text is not None:
                app_block_data['text'] = block.text
            if block.type == 'heading' and block.level is not None:
                app_block_data['level'] = block.level
            app_doc_content_blocks.append(app_block_data)
        
        # ai_notes_from_llm is an LLMAINotes instance, also required in LLMGeneratedChapter
        ai_notes_from_llm = generated_chapter_data.ai_notes
        
        app_key_concepts = []
        if ai_notes_from_llm.key_concepts: # key_concepts is required in LLMAINotes
            for kc in ai_notes_from_llm.key_concepts: # kc is LLMKeyConcept
                app_key_concepts.append(models.KeyConcept(term=kc.term, definition=kc.definition))

        app_important_terms = []
        if ai_notes_from_llm.important_terms: # important_terms is required in LLMAINotes
            for it in ai_notes_from_llm.important_terms: # it is LLMImportantTerm
                app_important_terms.append(models.ImportantTerm(term=it.term, definition=it.definition))

        app_outline = []
        if ai_notes_from_llm.outline: # outline is required in LLMAINotes
            app_outline = [_convert_llm_outline_to_model_outline(item) for item in ai_notes_from_llm.outline] # item is LLMOutlineItem

        app_ai_notes = models.AINotes(
            summary=ai_notes_from_llm.summary, # summary is required in LLMAINotes
            keyConcepts=app_key_concepts,
            importantTerms=app_important_terms,
            outline=app_outline
        )

        app_quiz = []
        # quiz is required in LLMGeneratedChapter
        for q_llm in generated_chapter_data.quiz: # q_llm is LLMQuizQuestion
            app_quiz.append(models.QuizQuestion(
                question=q_llm.question,
                options=q_llm.options,
                answerIndex=q_llm.answer_index,
                explanation=q_llm.explanation
            ))
        
        # Fallback for metadata if LLM doesn't provide it (though it's required in LLMGeneratedChapter)
        final_metadata = generated_chapter_data.metadata
        if not final_metadata: # Should not happen if LLM adheres to schema
             final_metadata = f"Source: Uploaded PDF - {original_pdf_filename}, Text length: {len(text_content)} chars (approx.)"

        return models.DocumentContent(
            title=generated_chapter_data.title, # title is required in LLMGeneratedChapter
            metadata=final_metadata,
            documentContent=app_doc_content_blocks,
            aiNotes=app_ai_notes,
            quiz=app_quiz
        )

    except Exception as e:
        print(f"Error generating full chapter with LLM: {e}")
        # import traceback
        # traceback.print_exc()
        return None
