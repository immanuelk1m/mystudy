from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

class Notebook(BaseModel):
    id: str
    title: str
    description: str
    lastUpdated: datetime
    filesCount: int

class Chapter(BaseModel):
    id: int  # Chapter ID (e.g., index + 1)
    title: str
    notebook_id: str # To match Notebook.id type

class ChapterList(BaseModel):
    chapters: List[Chapter] # Use the new Chapter model

# For aiNotes
class KeyConceptDefinition(BaseModel):
    easy: Optional[str] = None
    medium: Optional[str] = None
    hard: Optional[str] = None

class KeyConcept(BaseModel):
    term: str
    definition: Union[str, KeyConceptDefinition]

class ImportantTerm(BaseModel):
    term: str
    definition: str

class OutlineItem(BaseModel):
    title: str
    id: str
    children: Optional[List['OutlineItem']] = None # Recursive

OutlineItem.update_forward_refs() # For recursive model

class AINotes(BaseModel):
    summary: str
    keyConcepts: List[KeyConcept]
    importantTerms: List[ImportantTerm]
    outline: List[OutlineItem]

# For Quiz
class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answerIndex: int
    explanation: str

# For Document Content Blocks (flexible for now)
class DocumentContentBlock(BaseModel):
    type: str = Field(..., description="Type of content block (e.g., 'heading', 'paragraph', 'code').")
    content: str = Field(..., description="The actual content of the block.")
    level: Optional[int] = Field(None, description="Heading level (1-6) for 'heading' type blocks.")

# Main Document Content Model
class DocumentContent(BaseModel):
    title: str
    metadata: str
    documentContent: List[Dict[str, Any]] = Field(..., description="A list of content blocks, where each block is a dictionary with 'type', 'content', and optional 'level'.")
    aiNotes: AINotes
    quiz: List[QuizQuestion]

# For File Structure
class FileStructureItem(BaseModel):
    name: str
    type: str # Literal['file', 'folder'] would be more strict
    path: str
    children: Optional[List['FileStructureItem']] = None # Recursive

FileStructureItem.update_forward_refs() # For recursive model
