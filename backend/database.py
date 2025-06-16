from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import StaticPool
import sqlite3

import os

# Get the absolute path to the database file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'data', 'database.db')
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# SQLite 성능 최적화 설정
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={
        "check_same_thread": False,
        "timeout": 30,  # 30초 타임아웃
    },
    poolclass=StaticPool,
    pool_pre_ping=True,  # 연결 상태 확인
    pool_recycle=3600,   # 1시간마다 연결 재생성
    echo=False  # 프로덕션에서는 False
)

# SQLite 성능 최적화를 위한 PRAGMA 설정
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        # 성능 최적화 설정
        cursor.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging
        cursor.execute("PRAGMA synchronous=NORMAL")  # 동기화 레벨 조정
        cursor.execute("PRAGMA cache_size=10000")  # 캐시 크기 증가
        cursor.execute("PRAGMA temp_store=MEMORY")  # 임시 저장소를 메모리로
        cursor.execute("PRAGMA mmap_size=268435456")  # 256MB 메모리 맵
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()