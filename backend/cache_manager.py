"""
AI 서비스를 위한 캐싱 시스템
LLM 호출 결과를 캐시하여 성능을 향상시킵니다.
"""

import hashlib
import json
import os
import time
from typing import Any, Optional, Dict
from pathlib import Path
import asyncio
from functools import wraps

# 캐시 디렉토리 설정
CACHE_DIR = Path(__file__).parent / 'data' / 'cache'
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# 캐시 설정
CACHE_EXPIRY_HOURS = 24  # 24시간 후 캐시 만료
MAX_CACHE_SIZE_MB = 500  # 최대 캐시 크기 500MB

class CacheManager:
    """LLM 호출 결과를 캐시하는 매니저"""
    
    def __init__(self):
        self.cache_dir = CACHE_DIR
        self.expiry_seconds = CACHE_EXPIRY_HOURS * 3600
        
    def _get_cache_key(self, text_content: str, prompt_type: str, **kwargs) -> str:
        """텍스트 내용과 프롬프트 타입을 기반으로 캐시 키 생성"""
        # 텍스트 내용과 추가 파라미터를 포함한 해시 생성
        content_hash = hashlib.sha256(text_content.encode()).hexdigest()
        params_str = json.dumps(kwargs, sort_keys=True)
        params_hash = hashlib.sha256(params_str.encode()).hexdigest()
        
        return f"{prompt_type}_{content_hash[:16]}_{params_hash[:8]}"
    
    def _get_cache_path(self, cache_key: str) -> Path:
        """캐시 키에 대한 파일 경로 반환"""
        return self.cache_dir / f"{cache_key}.json"
    
    def _is_cache_valid(self, cache_path: Path) -> bool:
        """캐시 파일이 유효한지 확인"""
        if not cache_path.exists():
            return False
        
        # 파일 수정 시간 확인
        file_age = time.time() - cache_path.stat().st_mtime
        return file_age < self.expiry_seconds
    
    def get_cached_result(self, text_content: str, prompt_type: str, **kwargs) -> Optional[Dict[str, Any]]:
        """캐시된 결과 조회"""
        cache_key = self._get_cache_key(text_content, prompt_type, **kwargs)
        cache_path = self._get_cache_path(cache_key)
        
        if self._is_cache_valid(cache_path):
            try:
                with open(cache_path, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                print(f"[CACHE] Cache hit for {prompt_type}: {cache_key[:16]}...")
                return cached_data
            except (json.JSONDecodeError, IOError) as e:
                print(f"[CACHE] Error reading cache file {cache_path}: {e}")
                # 손상된 캐시 파일 삭제
                cache_path.unlink(missing_ok=True)
        
        return None
    
    def save_to_cache(self, text_content: str, prompt_type: str, result: Dict[str, Any], **kwargs):
        """결과를 캐시에 저장"""
        cache_key = self._get_cache_key(text_content, prompt_type, **kwargs)
        cache_path = self._get_cache_path(cache_key)
        
        try:
            cache_data = {
                'timestamp': time.time(),
                'prompt_type': prompt_type,
                'result': result,
                'metadata': kwargs
            }
            
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=2, ensure_ascii=False)
            
            print(f"[CACHE] Cached result for {prompt_type}: {cache_key[:16]}...")
            
        except IOError as e:
            print(f"[CACHE] Error saving to cache: {e}")
    
    def cleanup_expired_cache(self):
        """만료된 캐시 파일들을 정리"""
        cleaned_count = 0
        total_size = 0
        
        for cache_file in self.cache_dir.glob("*.json"):
            if not self._is_cache_valid(cache_file):
                cache_file.unlink()
                cleaned_count += 1
            else:
                total_size += cache_file.stat().st_size
        
        # 캐시 크기가 제한을 초과하면 오래된 파일부터 삭제
        if total_size > MAX_CACHE_SIZE_MB * 1024 * 1024:
            cache_files = list(self.cache_dir.glob("*.json"))
            cache_files.sort(key=lambda x: x.stat().st_mtime)
            
            while total_size > MAX_CACHE_SIZE_MB * 1024 * 1024 * 0.8:  # 80%까지 줄임
                if not cache_files:
                    break
                oldest_file = cache_files.pop(0)
                total_size -= oldest_file.stat().st_size
                oldest_file.unlink()
                cleaned_count += 1
        
        if cleaned_count > 0:
            print(f"[CACHE] Cleaned up {cleaned_count} expired/excess cache files")

# 전역 캐시 매니저 인스턴스
cache_manager = CacheManager()

def cached_llm_call(prompt_type: str):
    """LLM 호출을 캐시하는 데코레이터"""
    def decorator(func):
        @wraps(func)
        async def wrapper(text_content: str, *args, **kwargs):
            # 캐시 확인
            cached_result = cache_manager.get_cached_result(text_content, prompt_type, **kwargs)
            if cached_result:
                return cached_result['result']
            
            # 캐시 미스 - 실제 함수 호출
            result = await func(text_content, *args, **kwargs)
            
            # 결과가 있으면 캐시에 저장
            if result:
                cache_manager.save_to_cache(text_content, prompt_type, result, **kwargs)
            
            return result
        return wrapper
    return decorator

# 백그라운드에서 주기적으로 캐시 정리
async def periodic_cache_cleanup():
    """주기적으로 캐시를 정리하는 백그라운드 태스크"""
    while True:
        await asyncio.sleep(3600)  # 1시간마다 실행
        cache_manager.cleanup_expired_cache()

# 애플리케이션 시작 시 백그라운드 태스크 시작
def start_cache_cleanup_task():
    """캐시 정리 백그라운드 태스크 시작"""
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(periodic_cache_cleanup())
    except RuntimeError:
        # 이벤트 루프가 없는 경우 무시
        pass