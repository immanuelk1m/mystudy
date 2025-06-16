#!/usr/bin/env python3
"""
기존 AI 노트 데이터를 난이도별 정의로 마이그레이션하는 스크립트
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Dict, Any

from ai_services import llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field as PydanticField

class DifficultyLevels(BaseModel):
    easy: str = PydanticField(..., description="Simplified definition for beginners")
    medium: str = PydanticField(..., description="Standard definition")
    hard: str = PydanticField(..., description="Advanced or nuanced definition")

async def convert_simple_definition_to_levels(term: str, simple_definition: str) -> DifficultyLevels:
    """단순 정의를 난이도별 정의로 변환"""
    parser = JsonOutputParser(pydantic_object=DifficultyLevels)
    
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "모든 생성되는 텍스트는 반드시 한국어로 작성해 주십시오. "
                   "You are an expert academic assistant. Your task is to convert a simple definition into three difficulty levels. "
                   "Create three versions of the definition: "
                   "- 'easy': Simple, beginner-friendly explanation suitable for someone new to the topic "
                   "- 'medium': Standard academic definition with appropriate detail "
                   "- 'hard': Advanced, nuanced explanation with technical depth and context "
                   "Format your response as a JSON object: \n{format_instructions}"),
        ("human", "Term: {term}\nSimple Definition: {definition}\n\nPlease create three difficulty levels for this definition.")
    ])
    
    chain = prompt_template | llm | parser
    
    try:
        result = await chain.ainvoke({
            "term": term,
            "definition": simple_definition,
            "format_instructions": parser.get_format_instructions()
        })
        return DifficultyLevels(**result)
    except Exception as e:
        print(f"Error converting definition for '{term}': {e}")
        # 폴백: 기존 정의를 medium으로 사용
        return DifficultyLevels(
            easy=f"{term}에 대한 기본적인 설명입니다.",
            medium=simple_definition,
            hard=f"{simple_definition} 이는 더 깊은 이해와 맥락적 분석이 필요한 개념입니다."
        )

async def migrate_content_file(file_path: str) -> bool:
    """개별 콘텐츠 파일을 마이그레이션"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'aiNotes' not in data or 'keyConcepts' not in data['aiNotes']:
            print(f"Skipping {file_path}: No keyConcepts found")
            return True
        
        key_concepts = data['aiNotes']['keyConcepts']
        updated = False
        
        for concept in key_concepts:
            if isinstance(concept.get('definition'), str):
                print(f"Converting definition for '{concept['term']}'...")
                difficulty_levels = await convert_simple_definition_to_levels(
                    concept['term'], 
                    concept['definition']
                )
                concept['definition'] = {
                    'easy': difficulty_levels.easy,
                    'medium': difficulty_levels.medium,
                    'hard': difficulty_levels.hard
                }
                updated = True
        
        if updated:
            # 백업 생성
            backup_path = file_path + '.backup'
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            # 업데이트된 파일 저장
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"Updated {file_path}")
        
        return True
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

async def migrate_database_content():
    """데이터베이스의 콘텐츠를 마이그레이션"""
    from database import SessionLocal
    from models import Content
    
    db = SessionLocal()
    try:
        contents = db.query(Content).all()
        
        for content in contents:
            if not content.data or 'aiNotes' not in content.data:
                continue
                
            ai_notes = content.data['aiNotes']
            if 'keyConcepts' not in ai_notes:
                continue
            
            updated = False
            for concept in ai_notes['keyConcepts']:
                if isinstance(concept.get('definition'), str):
                    print(f"Converting DB definition for '{concept['term']}'...")
                    difficulty_levels = await convert_simple_definition_to_levels(
                        concept['term'], 
                        concept['definition']
                    )
                    concept['definition'] = {
                        'easy': difficulty_levels.easy,
                        'medium': difficulty_levels.medium,
                        'hard': difficulty_levels.hard
                    }
                    updated = True
            
            if updated:
                db.commit()
                print(f"Updated content ID {content.id}")
        
    finally:
        db.close()

async def main():
    """메인 마이그레이션 함수"""
    print("Starting difficulty levels migration...")
    
    # 1. JSON 파일들 마이그레이션
    content_dir = Path("data/content")
    if content_dir.exists():
        for json_file in content_dir.rglob("*.json"):
            await migrate_content_file(str(json_file))
    
    # 2. 데이터베이스 콘텐츠 마이그레이션
    print("Migrating database content...")
    await migrate_database_content()
    
    print("Migration completed!")

if __name__ == "__main__":
    asyncio.run(main())