import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from backend.main import app
from backend.models import Base
from backend.database import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Apply overrides before yielding client
def override_get_db():
    database = None
    try:
        database = TestingSessionLocal()
        yield database
    finally:
        if database:
            database.close()

@pytest.fixture(scope="function")
def db():
    connection = engine.connect()
    transaction = connection.begin()
    db_session = TestingSessionLocal(bind=connection)

    # Begin a nested transaction (optional, but good practice)
    nested = connection.begin_nested()

    @event.listens_for(db_session, "after_transaction_end")
    def end_savepoint(session, transaction):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    def override_get_db():
        try:
            yield db_session
        finally:
            pass # The main fixture will handle cleanup

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield db_session
    finally:
        db_session.close()
        transaction.rollback()
        connection.close()
        # Clear the override after the test
        app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def client():
    """
    A TestClient instance that can be used to make requests to the application.
    The client is created once per module and tables are created for the module.
    """
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)