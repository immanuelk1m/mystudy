from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

class Notebook(BaseModel):
    id: str
    title: str
    description: str
    lastUpdated: datetime
    filesCount: int

class ChapterList(BaseModel):
    chapters: List[str]

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
    type: str
    # Add other common fields or use Dict[str, Any] for more flexibility
    text: Optional[str] = None
    level: Optional[int] = None # For headings
    # ... other potential fields like src for images, code for code blocks, etc.
    # For maximum flexibility initially, allow any other fields:
    # class Config:
    #     extra = "allow"

# Main Document Content Model
class DocumentContent(BaseModel):
    title: str
    metadata: str
    documentContent: List[Dict[str, Any]] # Using Dict for flexibility as per spec
    aiNotes: AINotes
    quiz: List[QuizQuestion]

# For File Structure
class FileStructureItem(BaseModel):
    name: str
    type: str # Literal['file', 'folder'] would be more strict
    path: str
    children: Optional[List['FileStructureItem']] = None # Recursive

FileStructureItem.update_forward_refs() # For recursive model
