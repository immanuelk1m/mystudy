# 성능 최적화 가이드

이 문서는 백엔드 애플리케이션의 성능 최적화 방법과 모니터링에 대해 설명합니다.

## 🚀 적용된 최적화

### 1. 데이터베이스 쿼리 최적화

#### Eager Loading
- `selectinload()`: 1:N 관계에서 N+1 쿼리 문제 해결
- `joinedload()`: 1:1 관계에서 JOIN을 통한 단일 쿼리 실행
- `subqueryload()`: 복잡한 관계에서 서브쿼리 사용

```python
# 최적화 전
notebooks = db.query(models.Notebook).all()  # N+1 쿼리 발생

# 최적화 후
notebooks = db.query(models.Notebook).options(
    selectinload(models.Notebook.chapters)
).all()  # 단일 쿼리로 해결
```

#### 인덱스 최적화
- 자주 검색되는 컬럼에 인덱스 추가
- 복합 인덱스로 쿼리 패턴 최적화
- Foreign Key에 인덱스 추가

```sql
-- 추가된 인덱스들
CREATE INDEX idx_notebooks_title ON notebooks(title);
CREATE INDEX idx_notebooks_lastUpdated ON notebooks(lastUpdated);
CREATE INDEX idx_notebook_title_updated ON notebooks(title, lastUpdated);
CREATE INDEX idx_chapter_notebook_order ON chapters(notebook_id, "order");
```

### 2. 캐싱 시스템

#### LRU 캐시
- `@lru_cache` 데코레이터로 함수 결과 캐싱
- 메모리 사용량 제한으로 안정성 확보

```python
@lru_cache(maxsize=128)
def get_notebooks_cached(db_id: int) -> List[models.Notebook]:
    # 캐시된 결과 반환
```

#### 캐시 관리
- 캐시 클리어 API 제공
- 캐시 통계 모니터링

### 3. 쿼리 최적화 함수

#### 요약 정보 조회
```python
def get_notebook_summary(db: Session, notebook_id: int):
    """전체 데이터 로딩 없이 요약 정보만 조회"""
    
def get_chapters_summary(db: Session, notebook_id: int):
    """챕터 요약 정보만 조회"""
```

#### 페이지네이션
```python
def get_notebooks_with_pagination(db: Session, skip: int = 0, limit: int = 10):
    """대용량 데이터 처리를 위한 페이지네이션"""
```

#### 검색 최적화
```python
def search_notebooks_by_title(db: Session, search_term: str, limit: int = 20):
    """인덱스를 활용한 빠른 검색"""
```

### 4. 성능 모니터링

#### 쿼리 성능 모니터링
```python
@monitor_query_performance
def my_database_function(db: Session):
    # 실행 시간 자동 로깅
```

#### 성능 분석 도구
- 쿼리 실행 계획 분석
- 데이터베이스 통계 수집
- 캐시 히트율 모니터링

## 📊 성능 모니터링

### API 엔드포인트

#### 성능 통계 조회
```
GET /api/notebooks/admin/performance-stats
```

응답 예시:
```json
{
    "database_stats": {
        "notebooks_count": 100,
        "chapters_count": 500,
        "files_count": 1000,
        "contents_count": 500,
        "indexes": ["idx_notebooks_title", "idx_chapter_notebook_order"]
    },
    "cache_info": {
        "notebooks_cache": {
            "hits": 85,
            "misses": 15,
            "maxsize": 128,
            "currsize": 45
        }
    }
}
```

#### 캐시 클리어
```
POST /api/notebooks/cache/clear
```

### 성능 지표

#### 응답 시간 목표
- 단일 노트북 조회: < 100ms
- 노트북 목록 조회: < 200ms
- 검색 쿼리: < 150ms

#### 캐시 효율성
- 캐시 히트율: > 80%
- 메모리 사용량: < 512MB

## 🔧 최적화 권장사항

### 1. 쿼리 패턴 분석
- 자주 사용되는 쿼리 패턴 식별
- N+1 쿼리 문제 모니터링
- 느린 쿼리 로그 분석

### 2. 인덱스 관리
- 쿼리 실행 계획 정기 검토
- 사용되지 않는 인덱스 제거
- 복합 인덱스 최적화

### 3. 캐시 전략
- 캐시 만료 정책 설정
- 메모리 사용량 모니터링
- 캐시 무효화 전략 수립

### 4. 데이터베이스 최적화
- 정기적인 VACUUM 실행 (SQLite)
- 통계 정보 업데이트
- 데이터베이스 크기 모니터링

## 🚨 성능 문제 해결

### 느린 쿼리 식별
1. 성능 모니터링 로그 확인
2. 쿼리 실행 계획 분석
3. 인덱스 추가 또는 최적화

### 메모리 사용량 증가
1. 캐시 크기 조정
2. 불필요한 데이터 로딩 제거
3. 메모리 누수 확인

### 응답 시간 증가
1. 데이터베이스 연결 풀 확인
2. 쿼리 최적화
3. 캐시 히트율 개선

## 📈 향후 개선 계획

### 1. 고급 캐싱
- Redis 도입 검토
- 분산 캐싱 시스템
- 캐시 워밍 전략

### 2. 데이터베이스 최적화
- 읽기 전용 복제본 활용
- 파티셔닝 전략
- 연결 풀 최적화

### 3. 모니터링 강화
- APM 도구 도입
- 실시간 성능 대시보드
- 알림 시스템 구축

## 🛠️ 도구 및 명령어

### 데이터베이스 마이그레이션
```bash
python backend/migrate_add_indexes.py
```

### 성능 테스트
```bash
# 부하 테스트 예시
curl -X GET "http://localhost:8000/api/notebooks?limit=100"
```

### 캐시 상태 확인
```bash
curl -X GET "http://localhost:8000/api/notebooks/admin/performance-stats"
```

---

이 가이드는 지속적으로 업데이트되며, 새로운 최적화 기법이 적용될 때마다 문서가 갱신됩니다.