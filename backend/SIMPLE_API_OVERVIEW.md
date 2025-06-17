# 📚 백엔드 엔드포인트 한눈에 보기

이 문서는 `/backend` 폴더에서 정의된 FastAPI 엔드포인트를 처음 보는 사람도 이해하기 쉽게 설명합니다. 특히 PDF 일괄 처리에 사용된 **LangGraph** 파이프라인이 어떤 역할을 하는지 집중적으로 다룹니다.

---

## 기본 URL 구조

- 노트북 관련 기능: `/api/notebooks`
- PDF 일괄 처리 기능: `/api/batch-process-pdfs`

아래 표는 각 엔드포인트의 주요 동작을 간단히 정리한 것입니다.

| 경로 | 메서드 | 설명 |
|------|-------|------|
| `/api/notebooks` | `GET` | 모든 노트북 목록을 가져옵니다. `skip`과 `limit`으로 페이지를 조절할 수 있습니다. |
| `/api/notebooks/search` | `GET` | 제목에 특정 단어가 포함된 노트북을 찾습니다. |
| `/api/notebooks/cache/clear` | `POST` | 노트북 조회 결과를 캐시했다면 이를 지웁니다. |
| `/api/notebooks/admin/performance-stats` | `GET` | 데이터베이스 통계와 캐시 사용 정보를 확인합니다. |
| `/api/notebooks/{notebook_id}` | `GET` | 한 노트북의 전체 정보를 가져옵니다. `summary_only=true`를 주면 요약만 반환됩니다. |
| `/api/notebooks/{notebook_id}` | `PUT` | 제목이나 설명을 수정합니다. |
| `/api/notebooks/{notebook_id}` | `DELETE` | 노트북과 그 안의 데이터를 모두 삭제합니다. |
| `/api/notebooks/{notebook_id}/chapters` | `GET` | 해당 노트북의 챕터 목록을 조회합니다. |
| `/api/notebooks/{notebook_id}/content` | `GET` | 특정 챕터의 문서 내용을 가져옵니다. `path` 파라미터로 챕터 번호를 지정합니다. |
| `/api/notebooks/{notebook_id}/structure` | `GET` | 챕터와 연결된 파일·폴더 구조를 확인합니다. |
| `/api/notebooks/{notebook_id}/content/{chapter_number}/generate-ai-notes` | `POST` | 이미 존재하는 챕터 내용으로 AI 노트를 생성합니다. 작업은 백그라운드에서 진행됩니다. |
| `/api/notebooks/{notebook_id}/upload-and-create-chapter` | `POST` | PDF를 업로드하면 텍스트를 분석해 새 챕터를 만들어 저장합니다. |
| `/api/batch-process-pdfs/` | `POST` | 여러 PDF를 한 번에 업로드하여 LangGraph 파이프라인으로 처리합니다. 반환되는 `run_id`로 진행 상황을 조회할 수 있습니다. |
| `/api/batch-process-pdfs/logs/{run_id}` | `GET` | LangGraph 처리 과정에서 생성된 로그를 확인합니다. |
| `/api/batch-process-pdfs/progress/{task_id}` | `GET` | 파일별 현재 처리 단계를 조회합니다. |
| `/api/batch-process-pdfs/tasks` | `GET` | 진행 중인 모든 작업 목록을 봅니다. |

---

## LangGraph 파이프라인 소개

PDF 여러 개를 동시에 분석할 때는 `graph_processor.py`에 정의된 LangGraph 워크플로를 사용합니다. 이 파이프라인은 다음 네 단계로 구성됩니다.

1. **start_processing** – 업로드한 PDF에서 텍스트를 추출합니다.
2. **analyze_overall_structure** – 추출한 텍스트를 모두 모아 노트북 제목과 챕터 구성을 제안합니다.
3. **generate_chapter_content** – 각 챕터별로 세부 내용을 생성합니다. 요약, 핵심 개념, 퀴즈 등이 이 단계에서 만들어집니다.
4. **finish_processing** – 생성된 내용을 데이터베이스에 저장하고 최종 결과를 반환합니다.

각 단계의 실행 상태는 로그로 저장되며, `/api/batch-process-pdfs/logs/{run_id}`를 통해 확인할 수 있습니다. 파이프라인 덕분에 여러 문서를 순차적으로 분석하고 한 번에 노트북을 완성할 수 있습니다.

### 파이프라인 흐름 다이어그램

```
PDF 업로드
   │
   ▼
start_processing
   │
   ▼
analyze_overall_structure
   │
   ▼
generate_chapter_content
   │
   ▼
finish_processing
   │
   ▼
노트북 저장 완료
```

### 예시 시나리오

1. `math.pdf`와 `physics.pdf` 두 파일을 `/api/batch-process-pdfs/` 로 업로드합니다.
2. 서버가 파일을 받으면 각 PDF에서 텍스트를 추출하고 LangGraph 파이프라인을 시작합니다.
3. `analyze_overall_structure` 단계에서 두 파일의 내용을 조합해 노트북 제목과 챕터 구조를 제안합니다.
4. `generate_chapter_content` 단계에서 각 챕터에 대한 요약과 퀴즈가 생성됩니다.
5. `finish_processing` 단계에서 모든 결과가 데이터베이스에 저장되고 새로운 노트북 ID가 생성됩니다.
6. 최종적으로 `/api/notebooks/{notebook_id}`를 호출하여 생성된 노트북 내용을 볼 수 있습니다.

---

이렇게 정리된 엔드포인트와 LangGraph의 동작 방식을 참고하면 프로젝트의 백엔드 구조를 쉽게 파악할 수 있습니다.
