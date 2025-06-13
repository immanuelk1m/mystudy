from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from .database import Base

class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String)
    description = Column(String)
    lastUpdated = Column(DateTime)
    filesCount = Column(Integer)

    chapters = relationship("Chapter", back_populates="notebook")

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String)
    order = Column(Integer)
    game_html = Column(Text, nullable=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"))

    notebook = relationship("Notebook", back_populates="chapters")
    files = relationship("File", back_populates="chapter")
    contents = relationship("Content", back_populates="chapter")

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String)
    path = Column(String)
    type = Column(String)
    chapter_id = Column(Integer, ForeignKey("chapters.id"))

    chapter = relationship("Chapter", back_populates="files")


class Content(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    data = Column(JSON)
    chapter_id = Column(Integer, ForeignKey("chapters.id"))

    chapter = relationship("Chapter", back_populates="contents")


# Pydantic schema for Notebook
class ContentSchema(BaseModel):
    id: int
    data: Dict[str, Any]

    class Config:
        from_attributes = True

class FileSchema(BaseModel):
    id: int
    name: str
    path: str
    type: str

    class Config:
        from_attributes = True

class ChapterSchema(BaseModel):
    id: int
    title: str
    order: int
    game_html: Optional[str] = None
    files: List[FileSchema] = []
    contents: List[ContentSchema] = []

    class Config:
        from_attributes = True

class NotebookSchema(BaseModel):
    id: int
    title: str
    description: str
    lastUpdated: datetime
    filesCount: int
    chapters: List[ChapterSchema] = []

    class Config:
        from_attributes = True

class ChapterList(BaseModel):
    chapters: List[ChapterSchema]

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
    text: str # Changed from title
    id: str
    children: Optional[List['OutlineItem']] = None # Recursive

OutlineItem.update_forward_refs() # For recursive model

class AINotes(BaseModel):
    summary: str
    keyConcepts: List[KeyConcept]
    importantTerms: List[Union[ImportantTerm, str]] # Changed line
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
