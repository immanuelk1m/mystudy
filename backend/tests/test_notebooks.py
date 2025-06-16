from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.models import Notebook, Chapter, File, Content
from datetime import datetime
import json

def test_read_notebooks(client: TestClient, db_session: Session):
    # Setup: Create a notebook to ensure the list is not empty
    notebook = Notebook(title="Test Notebook", description="A test notebook", lastUpdated=datetime.utcnow(), filesCount=0)
    db_session.add(notebook)
    db_session.commit()

    response = client.get("/api/notebooks")
    assert response.status_code == 200
    response_data = response.json()
    assert isinstance(response_data, list)
    assert len(response_data) > 0
    assert response_data[0]['title'] == "Test Notebook"


def test_get_single_notebook_with_details(client: TestClient, db_session: Session):
    # 1. Test Data Creation
    # Notebook
    test_notebook = Notebook(
        title="Detailed Test Notebook",
        description="A notebook for detailed testing.",
        lastUpdated=datetime.utcnow(),
        filesCount=2
    )
    db_session.add(test_notebook)
    db_session.commit()
    db_session.refresh(test_notebook)

    # Chapters
    chapter1 = Chapter(title="Chapter 1", order=1, notebook_id=test_notebook.id)
    chapter2 = Chapter(title="Chapter 2", order=2, notebook_id=test_notebook.id)
    db_session.add_all([chapter1, chapter2])
    db_session.commit()
    db_session.refresh(chapter1)
    db_session.refresh(chapter2)

    # Files
    file1 = File(name="file1.txt", path="/files/file1.txt", type="text/plain", chapter_id=chapter1.id)
    file2 = File(name="file2.txt", path="/files/file2.txt", type="text/plain", chapter_id=chapter2.id)
    db_session.add_all([file1, file2])
    db_session.commit()
    db_session.refresh(file1)
    db_session.refresh(file2)

    # Contents
    content1 = Content(data={"key": "value1"}, chapter_id=chapter1.id)
    content2 = Content(data={"key": "value2"}, chapter_id=chapter2.id)
    db_session.add_all([content1, content2])
    db_session.commit()
    db_session.refresh(content1)
    db_session.refresh(content2)


    # 2. API Call
    response = client.get(f"/api/notebooks/{test_notebook.id}")

    # 3. Assertions
    assert response.status_code == 200
    data = response.json()

    # Notebook details
    assert data["id"] == test_notebook.id
    assert data["title"] == "Detailed Test Notebook"

    # Chapters
    assert len(data["chapters"]) == 2
    assert data["chapters"][0]["title"] == "Chapter 1"
    assert data["chapters"][1]["title"] == "Chapter 2"

    # Files in chapters
    assert len(data["chapters"][0]["files"]) == 1
    assert data["chapters"][0]["files"][0]["name"] == "file1.txt"
    assert len(data["chapters"][1]["files"]) == 1
    assert data["chapters"][1]["files"][0]["name"] == "file2.txt"

    # Contents in chapters
    assert len(data["chapters"][0]["contents"]) == 1
    assert data["chapters"][0]["contents"][0]["data"] == {"key": "value1"}
    assert len(data["chapters"][1]["contents"]) == 1
    assert data["chapters"][1]["contents"][0]["data"] == {"key": "value2"}
