import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.models import Base

# Use a dedicated in-memory SQLite database for the entire test session
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

# This engine is created once per test session
@pytest.fixture(scope="session")
def engine():
    return create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

@pytest.fixture(scope="session")
def TestingSessionLocal(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database(engine):
    """
    Create and drop tables once for the entire test session.
    This runs automatically due to autouse=True.
    """
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(engine, TestingSessionLocal):
    """
    Provides a transactional scope for each test function.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session, engine, monkeypatch):
    """
    A fixture to create a test client. This is the key part:
    1. It patches the database engine in the `database` module.
    2. THEN, it imports the `app`, so the app's lifespan event uses the patched engine.
    3. It overrides the `get_db` dependency to use the transactional session.
    """
    monkeypatch.setattr("backend.database.engine", engine)

    from backend.main import app
    from backend.database import get_db

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()