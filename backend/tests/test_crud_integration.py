import pytest
from sqlalchemy.orm import Session
from backend import crud, models

def test_create_notebook_and_chapters_fully_populates_db(db_session: Session):
    """
    Tests that create_notebook_and_chapters_from_processing correctly populates
    the notebooks, chapters, contents, and files tables in the database.
    """
    # 1. Mock generated_contents data
    notebook_title = "Test Integration Notebook"
    generated_contents = [
        models.DocumentContent(
            title="Chapter 1: Intro",
            metadata="Source: document1.pdf, Page: 1",
            documentContent=[{"type": "paragraph", "content": "This is the first chapter."}],
            aiNotes=models.AINotes(
                summary="Summary of chapter 1.",
                keyConcepts=[models.KeyConcept(term="Concept 1", definition="Def 1")],
                importantTerms=[models.ImportantTerm(term="Term 1", definition="Def 1")],
                outline=[models.OutlineItem(text="Outline 1", id="1")]
            ),
            quiz=[models.QuizQuestion(
                question="What is this?",
                options=["A", "B"],
                answerIndex=0,
                explanation="Because."
            )]
        ),
        models.DocumentContent(
            title="Chapter 2: Advanced Topics",
            metadata="Source: document2.pdf, Page: 10",
            documentContent=[{"type": "paragraph", "content": "This is the second chapter."}],
            aiNotes=models.AINotes(
                summary="Summary of chapter 2.",
                keyConcepts=[models.KeyConcept(term="Concept 2", definition="Def 2")],
                importantTerms=[models.ImportantTerm(term="Term 2", definition="Def 2")],
                outline=[models.OutlineItem(text="Outline 2", id="2")]
            ),
            quiz=[models.QuizQuestion(
                question="What is that?",
                options=["C", "D"],
                answerIndex=1,
                explanation="Just because."
            )]
        )
    ]

    # 2. Call the function to be tested
    notebook_id_str = crud.create_notebook_and_chapters_from_processing(
        db=db_session,
        notebook_title=notebook_title,
        generated_contents=generated_contents
    )

    assert notebook_id_str is not None
    notebook_id = int(notebook_id_str)

    # 3. Verify the data in the database using the test session
    # Use a separate query to get the notebook with all its relationships loaded
    notebook = crud.get_notebook_by_id(db_session, notebook_id)

    # Verify notebook creation
    assert notebook is not None
    assert notebook.title == notebook_title
    assert notebook.filesCount == 2

    # Verify the number of chapters
    assert len(notebook.chapters) == 2

    # Verify each chapter's contents and files
    for i, chapter in enumerate(sorted(notebook.chapters, key=lambda c: c.order)):
        expected_content = generated_contents[i]
        
        # Verify chapter details
        assert chapter.title == expected_content.title
        assert chapter.order == i + 1
        
        # Verify that at least one Content object is linked
        assert len(chapter.contents) == 1
        # Verify the data within the content object
        assert chapter.contents[0].data['title'] == expected_content.title

        # Verify that at least one File object is linked
        assert len(chapter.files) == 1
        # Verify file details
        expected_filename = expected_content.metadata.split(',')[0].replace('Source: ', '').strip()
        assert chapter.files[0].name == expected_filename
        assert chapter.files[0].type == "file"