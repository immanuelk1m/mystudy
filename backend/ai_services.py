import os
from dotenv import load_dotenv
from pathlib import Path
from typing import List, Dict, Any, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

import logging # Added for this subtask
from cache_manager import cached_llm_call, cache_manager
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
import models # Assuming models.py is in the same directory or accessible

# Gemini LLM을 초기화합니다.
# load_dotenv가 호출되었으므로, 라이브러리가 자동으로 환경에서 GOOGLE_API_KEY를 찾습니다.
# langchain 라이브러리가 자동으로 키를 찾도록 명시적인 파라미터를 제거하고,
# 모델 이름을 안정적인 최신 버전으로 업데이트합니다.
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-preview-05-20", temperature=0.7)

# --- PDF Processing ---
def extract_text_from_pdf(pdf_file_path: str) -> str:
    """Extracts text from a given PDF file with optimized memory usage."""
    try:
        reader = PdfReader(pdf_file_path)
        text_parts = []
        
        # 메모리 효율성을 위해 페이지별로 처리
        for page_num, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text_parts.append(page_text.strip())
            except Exception as page_error:
                print(f"Error extracting text from page {page_num + 1} of {pdf_file_path}: {page_error}")
                continue
        
        return "\n".join(text_parts)
    except Exception as e:
        print(f"Error extracting text from PDF {pdf_file_path}: {e}")
        return ""

# 스레드 풀 생성 (PDF 처리용)
pdf_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="pdf_worker")

async def extract_text_from_pdf_async(pdf_file_path: str) -> str:
    """비동기적으로 PDF에서 텍스트를 추출"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(pdf_executor, extract_text_from_pdf, pdf_file_path)

# --- AI Notes Generation Pydantic Models for LLM Output ---
# These help in getting structured JSON output from the LLM

class LLMKeyConceptDefinition(BaseModel):
    easy: str = PydanticField(..., description="Simplified definition for beginners")
    medium: str = PydanticField(..., description="Standard definition")
    hard: str = PydanticField(..., description="Advanced or nuanced definition")

class LLMKeyConcept(BaseModel):
    term: str = PydanticField(..., description="The key concept or term")
    definition: LLMKeyConceptDefinition = PydanticField(..., description="Definition of the term with easy, medium, and hard difficulty levels")

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

@cached_llm_call("ai_notes")
async def generate_ai_notes_from_text(text_content: str) -> Optional[models.AINotes]:
    """Generates AI Notes (summary, key concepts, terms, outline) from text using Gemini."""
    if not text_content:
        return None

    parser = JsonOutputParser(pydantic_object=LLMAINotes)

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "모든 생성되는 텍스트는 반드시 한국어로 작성해 주십시오. 응답은 한국어로만 제공되어야 합니다. "
                   "You are an expert academic assistant. Your task is to analyze the provided text content and generate comprehensive AI Notes. "
                   "The AI Notes should include a summary, key concepts with definitions, important terms with definitions, and a hierarchical outline. "
                   "For key concepts, ALWAYS provide definitions with three difficulty levels: 'easy', 'medium', and 'hard'. "
                   "- 'easy': Simple, beginner-friendly explanation suitable for someone new to the topic "
                   "- 'medium': Standard academic definition with appropriate detail "
                   "- 'hard': Advanced, nuanced explanation with technical depth and context "
                   "Ensure IDs for outline items are unique and URL-friendly (e.g., 'topic-subsection'). "
                   "Format your response as a JSON object that strictly adheres to the following Pydantic schema: \n{format_instructions}"),
        ("human", "Please generate AI Notes for the following text content. Make sure to provide three difficulty levels (easy, medium, hard) for ALL key concept definitions: \n\n--BEGIN TEXT CONTENT--\n{text_content}\n--END TEXT CONTENT--")
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
                definition=models.KeyConceptDefinition(
                    easy=kc.get('definition', {}).get('easy', ''),
                    medium=kc.get('definition', {}).get('medium', ''),
                    hard=kc.get('definition', {}).get('hard', '')
                )
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
        text=llm_item.text, # Access as attribute, map to 'text' in models.OutlineItem
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
        ("system", "모든 생성되는 텍스트는 반드시 한국어로 작성해 주십시오. 응답은 한국어로만 제공되어야 합니다. "
                   "You are an expert academic assistant specializing in organizing study materials. "
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

def _transform_llm_outline_item(item: Dict[str, Any]) -> None:
    """Recursively transforms 'title' to 'text' in an LLM-generated outline item dictionary."""
    if isinstance(item, dict): # Ensure item is a dict before processing
        if 'title' in item:
            item['text'] = item.pop('title')

        if 'children' in item and isinstance(item['children'], list):
            for child in item['children']:
                _transform_llm_outline_item(child) # Recursive call

# --- Full Chapter Generation from PDF Text ---

class LLMDocumentContentBlock(BaseModel):
    type: str = PydanticField(..., description="Type of content block (e.g., 'heading', 'paragraph', 'code').")
    content: str = PydanticField(..., description="The actual content of the block.")
    level: Optional[int] = PydanticField(None, description="Heading level (1-6) for 'heading' type blocks.")
    # image_url: Optional[str] = PydanticField(None, description="URL for image content if type is 'image'.") lists, images, code

class LLMQuizQuestion(BaseModel):
    question: str = PydanticField(..., description="The quiz question.")
    options: List[str] = PydanticField(..., description="A list of 2-4 multiple choice options.")
    answer_index: int = PydanticField(..., alias="answerIndex", description="The 0-based index of the correct option.")
    explanation: str = PydanticField(..., description="A brief explanation for the correct answer.")

class LLMMetadata(BaseModel):
    source_pdf: str = PydanticField(..., description="The original PDF filename provided by the LLM.")
    text_length_characters: int = PydanticField(..., description="The approximate length of the text content in characters, provided by the LLM.")

class LLMGeneratedChapter(BaseModel):
    title: str = PydanticField(..., description="A concise and relevant title for the chapter based on the text.")
    metadata: LLMMetadata = PydanticField(..., description="Structured metadata about the source text, including PDF filename and length.")
    document_content_blocks: List[LLMDocumentContentBlock] = PydanticField(..., description="A list of content blocks (paragraphs, headings).")
    ai_notes: LLMAINotes = PydanticField(..., description="AI-generated notes (summary, key concepts, terms, outline).")
    quiz: List[LLMQuizQuestion] = PydanticField(..., description="A short quiz with 2-3 questions based on the text content.")

@cached_llm_call("chapter_content")
async def generate_chapter_from_pdf_text(pdf_text: str, original_pdf_filename: str) -> Optional[models.DocumentContent]:
    """
    Wrapper function that generates a chapter from PDF text.
    Uses the first part of the text to generate a title, then calls generate_content_for_chapter.
    """
    if not pdf_text:
        return None
    
    # Generate a simple title from the filename or first few words
    title = original_pdf_filename.replace('.pdf', '').replace('_', ' ').title()
    if len(title) > 100:
        title = title[:100] + "..."
    
    return await generate_content_for_chapter(title, pdf_text, original_pdf_filename)

async def generate_content_for_chapter(chapter_title: str, chapter_text: str, original_pdf_filename: str) -> Optional[models.DocumentContent]:
    """
    Analyzes a chapter's text and generates a structured DocumentContent object,
    including summary, key concepts, important terms, outline, and a quiz.
    The title is passed in directly from the holistic analysis step.

    Args:
        chapter_title: The title for the chapter.
        chapter_text: The text content of the chapter.
        original_pdf_filename: The filename of the source PDF for metadata.

    Returns:
        A `models.DocumentContent` object or None if generation fails.
    """
    if not chapter_text:
        print("[CONTENT GEN] Error: No chapter text provided.")
        return None

    # Use the comprehensive LLMGeneratedChapter model for the output.
    parser = JsonOutputParser(pydantic_object=LLMGeneratedChapter)

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "모든 생성되는 텍스트는 반드시 한국어로 작성해 주십시오. 응답은 한국어로만 제공되어야 합니다. "
                   "You are an expert academic assistant. Your task is to analyze the provided text content and generate a complete, structured chapter document. "
                   "The document must include: "
                   "1. A concise and relevant title (you can refine the provided one if necessary). This must be in Korean. "
                   "2. Metadata including the source PDF filename and text length. "
                   "3. The full content broken down into logical blocks (headings, paragraphs). All text in these blocks must be in Korean. "
                   "4. Comprehensive AI Notes (summary, key concepts, important terms, outline). All text in AI Notes must be in Korean. "
                   "   - For key concepts, ALWAYS provide definitions with three difficulty levels: 'easy', 'medium', and 'hard'. "
                   "   - 'easy': Simple, beginner-friendly explanation suitable for someone new to the topic "
                   "   - 'medium': Standard academic definition with appropriate detail "
                   "   - 'hard': Advanced, nuanced explanation with technical depth and context "
                   "5. A quiz section containing a list of 2-3 multiple-choice questions designed to test understanding of the material. "
                   "   - Each quiz question must be an object strictly following this JSON structure: "
                   "     ```json\n"
                   "     {{\n"
                   "       \"question\": \"여기에 한국어로 된 질문을 넣어주세요.\",\n"
                   "       \"options\": [\n"
                   "         \"한국어 옵션 1\",\n"
                   "         \"한국어 옵션 2\",\n"
                   "         \"한국어 옵션 3\",\n"
                   "         \"한국어 옵션 4\"\n"
                   "       ],\n"
                   "       \"answerIndex\": 0, // 0부터 시작하는 정수형 인덱스 (옵션 리스트 기준)\n"
                   "       \"explanation\": \"여기에 한국어로 된 정답 해설을 넣어주세요.\"\n"
                   "     }}\n"
                   "     ```\n"
                   "   - `question` 필드는 명확하고 완전한 한국어 문장이어야 합니다.\n"
                   "   - `options` 필드는 최소 3개에서 최대 5개의 한국어 선택지를 포함하는 리스트여야 합니다.\n"
                   "   - `answerIndex` 필드는 `options` 리스트에서 정답에 해당하는 선택지의 0부터 시작하는 정확한 정수 인덱스여야 하며, 반드시 포함되어야 합니다.\n"
                   "   - `explanation` 필드는 정답에 대한 간결하고 명확한 한국어 해설이어야 합니다.\n"
                   "   - 모든 텍스트 필드(question, options, explanation)는 반드시 한국어로 작성되어야 합니다.\n"
                   "   - 예시 퀴즈 질문:\n"
                   "     ```json\n"
                   "     {{\n"
                   "       \"question\": \"대한민국의 수도는 어디입니까?\",\n"
                   "       \"options\": [\"부산\", \"서울\", \"인천\", \"대구\"],\n"
                   "       \"answerIndex\": 1,\n"
                   "       \"explanation\": \"서울은 대한민국의 공식 수도입니다.\"\n"
                   "     }}\n"
                   "     ```\n"
                   "Ensure your entire response is a single JSON object that strictly adheres to the Pydantic schema provided via {format_instructions}. "
                   "Pay close attention to the quiz structure and ensure all its elements are correctly formatted and in Korean."),
        ("human", "The chapter is titled '{chapter_title}'. The source PDF is '{original_pdf_filename}'. "
                  "Please generate a complete chapter document for the following text:\n\n--BEGIN TEXT CONTENT--\n{text_content}\n--END TEXT CONTENT--")
    ])

    chain = prompt_template | llm | parser

    try:
        generated_data = await chain.ainvoke({
            "text_content": chapter_text,
            "chapter_title": chapter_title,
            "original_pdf_filename": original_pdf_filename,
            "format_instructions": parser.get_format_instructions()
        })

        # --- DEBUG: Log raw LLM output ---
        import json
        print("[DEBUG] Raw LLM Output for Quiz Generation:")
        print(json.dumps(generated_data, indent=2, ensure_ascii=False))
        # --- END DEBUG ---

        # Early exit if LLM output parsing failed or is not a dictionary
        if not isinstance(generated_data, dict):
            logging.error(
                f"[CONTENT GEN] LLM output for chapter '{chapter_title}' (source: {original_pdf_filename}) "
                f"was not a valid dictionary or was None after parsing. Type: {type(generated_data)}"
            )
            return None

        # Transform outline: 'title' to 'text' in generated_data before LLMGeneratedChapter parsing
        if isinstance(generated_data, dict) and \
           'ai_notes' in generated_data and \
           isinstance(generated_data.get('ai_notes'), dict) and \
           'outline' in generated_data['ai_notes'] and \
           isinstance(generated_data['ai_notes'].get('outline'), list):

            for outline_item_data in generated_data['ai_notes']['outline']:
                _transform_llm_outline_item(outline_item_data) # Apply transformation in-place

        # Clean important_terms in generated_data before passing to LLMGeneratedChapter
        if 'ai_notes' in generated_data and 'important_terms' in generated_data['ai_notes']:
            raw_important_terms = generated_data['ai_notes'].get('important_terms', []) # Use .get for safety
            if raw_important_terms is None: # Handle explicit null from LLM
                raw_important_terms = []

            cleaned_important_terms = []
            for item in raw_important_terms:
                if isinstance(item, str):
                    cleaned_important_terms.append(
                        models.ImportantTerm(term=item, definition="Placeholder: Definition to be reviewed or generated.").dict()
                    )
                elif isinstance(item, dict):
                    # Ensure it has 'term'. 'definition' can be missing and handled by placeholder.
                    if 'term' in item:
                         cleaned_important_terms.append(
                             models.ImportantTerm(term=item.get('term'), definition=item.get('definition', "Placeholder: Definition missing.")).dict()
                         )
                    else:
                        # If term is missing, it's a malformed dict for our purposes.
                        print(f"Warning: Malformed dict in important_terms (missing 'term'): {item}")
                        cleaned_important_terms.append(
                            models.ImportantTerm(term="Missing term", definition=item.get('definition', "Placeholder: Malformed item.")).dict()
                        )
                else:
                    print(f"Warning: Unexpected item type in important_terms: {type(item)}, value: {item}")
                    cleaned_important_terms.append(
                         models.ImportantTerm(term=str(item), definition="Placeholder: Unexpected data type encountered.").dict()
                    )
            generated_data['ai_notes']['important_terms'] = cleaned_important_terms

        # Transform document_content_blocks: join list of strings in 'content' field
        if isinstance(generated_data, dict) and \
           'document_content_blocks' in generated_data and \
           isinstance(generated_data.get('document_content_blocks'), list):

            for block in generated_data['document_content_blocks']:
                if isinstance(block, dict) and 'content' in block and isinstance(block['content'], list):
                    # Join list of strings into a single string, separated by newlines.
                    block['content'] = '\n'.join(str(c) for c in block['content']) # Ensure all items are strings

        # Process quiz data: transform 'answer' text to 'answerIndex'
        if 'quiz' in generated_data and isinstance(generated_data.get('quiz'), list):
            processed_quiz_questions = []
            for question_dict in generated_data['quiz']:
                if not isinstance(question_dict, dict):
                    logging.warning(f"[CONTENT GEN] Skipping non-dictionary item in quiz data for chapter '{chapter_title}', PDF '{original_pdf_filename}': {question_dict}")
                    continue

                options = question_dict.get('options')
                answer_text = question_dict.get('answer') # LLM might provide 'answer' as text

                # Scenario 1: 'answerIndex' is present (ideal case from LLM based on LLMQuizQuestion model)
                if 'answerIndex' in question_dict:
                    # Ensure 'answer' text field is removed if 'answerIndex' is authoritative
                    if 'answer' in question_dict:
                        del question_dict['answer']
                    processed_quiz_questions.append(question_dict)
                    continue

                # Scenario 2: 'answerIndex' is missing, but 'answer' text and 'options' are present
                if isinstance(answer_text, str) and isinstance(options, list) and options:
                    try:
                        answer_index = -1
                        for i, opt_text in enumerate(options):
                            if str(opt_text).strip().lower() == str(answer_text).strip().lower():
                                answer_index = i
                                break

                        if answer_index != -1:
                            question_dict['answerIndex'] = answer_index
                        else:
                            logging.warning(
                                f"[CONTENT GEN] Could not find answer '{answer_text}' in options {options} for question '{question_dict.get('question')}' "
                                f"in chapter '{chapter_title}', PDF '{original_pdf_filename}'. Setting answerIndex to 0 as fallback."
                            )
                            question_dict['answerIndex'] = 0 # Fallback

                        if 'answer' in question_dict: # Remove the text 'answer' field
                            del question_dict['answer']
                        processed_quiz_questions.append(question_dict)

                    except Exception as e:
                        logging.error(
                            f"[CONTENT GEN] Error processing quiz question '{question_dict.get('question')}' in chapter '{chapter_title}', PDF '{original_pdf_filename}': {e}. Skipping."
                        )
                        continue # Skip this problematic question

                # Scenario 3: Not enough info to determine answerIndex (e.g. no 'answer' text, or no 'options')
                else:
                    logging.warning(
                        f"[CONTENT GEN] Skipping quiz question due to missing 'answer' text, 'options' list, or 'answerIndex' for question "
                        f"'{question_dict.get('question')}' in chapter '{chapter_title}', PDF '{original_pdf_filename}'."
                    )
                    continue # Skip this question

            generated_data['quiz'] = processed_quiz_questions

        # The parser returns a dict. We can now build our DocumentContent from it.
        llm_chapter = LLMGeneratedChapter(**generated_data)

        # Convert LLM-specific models to our application's models
        ai_notes = models.AINotes(
            summary=llm_chapter.ai_notes.summary,
            keyConcepts=[models.KeyConcept(**kc.dict()) for kc in llm_chapter.ai_notes.key_concepts],
            importantTerms=[models.ImportantTerm(**it.dict()) for it in llm_chapter.ai_notes.important_terms or []],
            outline=[_convert_llm_outline_to_model_outline(item) for item in llm_chapter.ai_notes.outline]
        )

        quiz_items = [models.QuizQuestion(
            question=q.question,
            options=q.options,
            answerIndex=q.answer_index,
            explanation=q.explanation
        ) for q in llm_chapter.quiz]
        
        metadata_str = f"Source: {llm_chapter.metadata.source_pdf}, Text length: {llm_chapter.metadata.text_length_characters} chars"

        document_content = models.DocumentContent(
            title=llm_chapter.title,
            metadata=metadata_str,
            documentContent=[block.dict() for block in llm_chapter.document_content_blocks],
            aiNotes=ai_notes,
            quiz=quiz_items
        )

        print(f"[CONTENT GEN] Successfully generated full content for chapter: '{llm_chapter.title}'")
        return document_content

    except ValidationError as e:
        print(f"[CONTENT GEN] Pydantic validation error in LLM output: {e.json()}")
        return None
    except Exception as e:
        print(f"[CONTENT GEN] Unexpected error in generate_content_for_chapter: {e}")
        import traceback
        traceback.print_exc()
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
        ("system", "모든 생성되는 텍스트는 반드시 한국어로 작성해 주십시오. 응답은 한국어로만 제공되어야 합니다. "
                   "You are an expert academic librarian. Your task is to analyze the provided text and determine the most appropriate subject class for it. "
                   "You are given a list of existing classes. First, try to classify the document into one of these existing classes. "
                   f"Existing classes:\n - {classes_str}\n\n"
                   "If the text fits well into one of the existing classes, respond with that exact class name. "
                   "If the text represents a new, distinct topic not covered by the existing classes, suggest a new, concise class name (e.g., '양자 역학', '고대 로마사'). " # Korean examples
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
        ("system", "모든 생성되는 텍스트는 반드시 한국어로 작성해 주십시오. 응답은 한국어로만 제공되어야 합니다. " # Though this prompt mainly structures existing text
                   "You are an expert in content analysis and structuring. Your task is to segment a long text document into logical, semantically complete chapters. "
                   "The input text will be in Korean. Ensure that the segmented chapter texts remain in Korean. " # Reinforce input/output language
                   "Consider the document's overall topic, which is '{document_class}'. "
                   "Each chapter should represent a coherent sub-topic or section of the main content. Avoid creating chapters that are too short (e.g., just a few sentences) or excessively long. "
                   "The output MUST be a JSON-formatted array of strings, where each string is the full text of a chapter. "
                   "For example: [\"한국어 챕터 1 전문...\", \"한국어 챕터 2 전문...\", \"한국어 챕터 3 전문...\"]" # Korean example
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

# --- Holistic Structure Analysis ---

class HolisticChapter(BaseModel):
    chapter_title: str = PydanticField(..., description="The concise title for this chapter.")
    source_pdf_filename: str = PydanticField(..., description="The original filename of the PDF this chapter's content comes from.")
    chapter_content_summary: str = PydanticField(..., description="A brief summary of what this chapter will cover, based on the source text.")
    # This represents the full text for the chapter, which will be passed to the next step.
    chapter_full_text: str = PydanticField(..., description="The full, complete text content that makes up this chapter.")


class HolisticStructure(BaseModel):
    notebook_title: str = PydanticField(..., description="A single, unified, and concise title for the entire notebook, synthesizing all provided documents.")
    chapters: List[HolisticChapter] = PydanticField(..., description="A logically ordered list of chapters that combines content from all provided PDFs into a coherent learning path.")


async def analyze_holistic_structure(all_pdf_texts: List[Dict[str, str]]) -> Optional[HolisticStructure]:
    """
    Analyzes text from multiple PDFs to create a single, unified notebook title and a holistic chapter structure.

    Args:
        all_pdf_texts: A list of dictionaries, where each dict contains 'filename' and 'text'.

    Returns:
        A `HolisticStructure` object containing the unified title and chapter list, or None on failure.
    """
    if not all_pdf_texts:
        return None

    parser = JsonOutputParser(pydantic_object=HolisticStructure)

    # Prepare the combined text for the prompt
    combined_text_input = ""
    for pdf_data in all_pdf_texts:
        combined_text_input += f"--- START OF DOCUMENT: {pdf_data['filename']} ---\n\n"
        combined_text_input += f"{pdf_data['text']}\n\n"
        combined_text_input += f"--- END OF DOCUMENT: {pdf_data['filename']} ---\n\n"

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "모든 생성되는 텍스트는 반드시 한국어로 작성해 주십시오. 응답은 한국어로만 제공되어야 합니다. "
                   "You are an expert curriculum designer. Your task is to analyze the content from multiple documents and create a single, unified, and coherent study notebook structure. "
                   "All generated titles and summaries must be in Korean. " # Specific reinforcement
                   "First, create a single, overarching title for the entire notebook that synthesizes the topics from all documents. This title must be in Korean. "
                   "Second, break down the combined content into a logical sequence of chapters. Each chapter should cover a specific sub-topic and be sourced from the provided texts. Chapter titles and summaries must be in Korean. "
                   "It is crucial that you identify which original document each chapter's content comes from. "
                   "The final output must be a JSON object that strictly adheres to the following Pydantic schema:\n{format_instructions}"),
        ("human", "Please create a holistic notebook structure from the following documents:\n\n{combined_text}")
    ])

    chain = prompt_template | llm | parser

    try:
        # Use a summary if the combined text is excessively long to avoid token limits.
        # For now, we'll try with the full text.
        text_for_prompt = combined_text_input
        if len(text_for_prompt) > 100000: # Example threshold
             print("Warning: Combined text is very long, consider summarization for performance.")


        holistic_structure_data = await chain.ainvoke({
            "combined_text": text_for_prompt,
            "format_instructions": parser.get_format_instructions()
        })
        
        # The parser should have already converted this to the Pydantic model.
        # We can perform a final validation/instantiation here.
        return HolisticStructure(**holistic_structure_data)

    except ValidationError as e:
        print(f"[HOLISTIC ANALYSIS] Pydantic validation error in LLM output: {e}")
        return None
    except Exception as e:
        print(f"[HOLISTIC ANALYSIS] Unexpected error in analyze_holistic_structure: {e}")
        import traceback
        traceback.print_exc()
        return None

# --- Interactive Story Game Generation ---

