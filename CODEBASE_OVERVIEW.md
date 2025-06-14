# Codebase Overview

이 문서는 `mystudy` 저장소의 전체 구조와 주요 파일 역할을 보다 자세히 정리한 가이드입니다. 프로젝트는 학습 자료를 AI로 분석하고 노트 형식으로 제공하는 풀스택 웹 애플리케이션을 목표로 합니다.

## 프로젝트 개요

- **백엔드**: FastAPI와 LangChain 기반으로 PDF 처리 및 AI 노트 생성을 담당합니다.
- **프론트엔드**: React + TypeScript로 사용자 인터페이스를 구성합니다.
- **데이터**: 초기 단계에서는 SQLite와 JSON 파일을 함께 사용합니다.

README의 기술 스택 표를 옮기면 다음과 같습니다.

```
| 구분       | 기술                                                  |
| :--------- | :-------------------------------------------------- |
| **Frontend** | `React`, `TypeScript`, `Vite`, `Tailwind CSS`, `shadcn/ui`           |
| **Backend**  | `FastAPI`, `Python`, `LangChain`, `Google Generative AI`, `Uvicorn` |
```

## 최상위 디렉터리

| 경로            | 설명                                                                           |
|-----------------|--------------------------------------------------------------------------------|
| `backend/`      | API 서버 소스, 데이터 파일, 테스트 코드가 모여 있습니다.                        |
| `frontend/`     | 웹 애플리케이션과 관련 문서가 위치합니다.                                       |
| `demo/`         | 서비스 사용 모습을 담은 GIF 등 시연 자료를 보관합니다.                         |
| `Makefile`      | 서버 실행, 의존성 설치 등 개발 편의 명령어가 정의되어 있습니다.               |
| `README.md`     | 프로젝트 소개와 로컬 실행 방법을 안내합니다.                                   |

아래 절에서는 각 서브디렉터리의 구성 요소를 좀 더 상세히 살펴봅니다.

## 백엔드(`backend/`)

주요 모듈과 파일 구조는 다음과 같습니다.

| 경로/파일                 | 역할                                                                 |
|---------------------------|--------------------------------------------------------------------|
| `main.py`                 | FastAPI 앱 객체 생성 및 라우터 등록                                  |
| `routers/`                | API 엔드포인트 정의. `notebooks.py`는 노트북 관리, `batch_processing.py`는 여러 PDF를 한번에 처리하는 기능을 제공합니다. |
| `models.py`               | SQLAlchemy 모델과 Pydantic 스키마 정의                               |
| `crud.py`                 | 데이터베이스 접근, JSON 파일 입출력, 파일 업로드 등 핵심 로직 모음     |
| `ai_services.py`          | Google Gemini API를 사용해 요약, AI 노트, 퀴즈 등을 생성             |
| `graph_processor.py`      | LangGraph로 구성한 PDF 일괄 처리 워크플로우                          |
| `database.py`             | SQLite 데이터베이스 연결과 세션 관리                                  |
| `requirements.txt`        | 백엔드 파이썬 의존성 목록                                            |
| `data/`                   | `database.db` 파일과 `logs/` 폴더(배치 처리 기록 등)를 보관            |
| `tests/`                  | `pytest` 기반 테스트 모음. `conftest.py`는 임시 DB 설정을, `test_notebooks.py`는 API 검증을 담당합니다. |
| `.env.example`            | Google API 키 등 환경 변수를 채워 넣기 위한 예시 파일                |
| `backend_api_documentation.md` | 프론트엔드와 협의한 API 명세 및 구현 지침을 담은 문서            |

## 프론트엔드(`frontend/`)

React 기반 웹 UI가 들어 있는 폴더이며, 주요 구성은 다음과 같습니다.

| 경로/파일                   | 설명                                                                 |
|-----------------------------|--------------------------------------------------------------------|
| `src/`                      | 애플리케이션 소스. 페이지, 컴포넌트, 서비스 모듈이 위치합니다.       |
| `src/pages/`                | 주요 라우트 컴포넌트. `Workspace.tsx`는 학습 화면, `Index.tsx`는 노트북 목록을 렌더링합니다. |
| `src/components/`           | 재사용 가능한 UI 구성요소. `workspace/` 하위에는 문서 뷰어와 사이드바 등이 있습니다. |
| `src/contexts/`             | React Context를 활용한 전역 상태 관리 모듈                          |
| `src/hooks/`                | 커스텀 훅 예: 모바일 판별, 토스트 알림                              |
| `src/services/api.ts`       | 백엔드 REST API 호출을 담당하는 래퍼 함수들                           |
| `public/`                   | favicon과 robots.txt 등 정적 자산                                    |
| `docs/`                     | 기능 개선 제안 등 프론트엔드 관련 문서                                |
| `memory-bank/`              | 진행 상황 메모, 의사결정 기록 등을 남기는 내부 참조용 문서             |
| `package.json` 및 `vite.config.ts` | 프론트엔드 빌드 및 의존성 설정 파일                               |

`frontend/backend_integration_points.md` 문서에는 어느 컴포넌트가 어떤 API와 연결되는지 세부 항목이 정리되어 있으니 참고하면 좋습니다.

## 기타 자료

- `demo/demo.gif` – 실제 서비스 흐름을 보여주는 짧은 애니메이션
- `Makefile` – `make dev` 명령으로 프론트엔드와 백엔드를 동시에 실행할 수 있습니다.

## 정리

이 문서는 저장소의 큰 그림을 파악하는 데 필요한 기본 정보를 제공합니다. 세부 구현을 확인할 때는 각 폴더의 README나 주석, 그리고 `backend_api_documentation.md` 같은 보조 문서를 함께 참고하면 전체 개발 흐름을 이해하는 데 도움이 됩니다.
