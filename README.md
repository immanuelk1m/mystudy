# 🤖 AI 기반 학습 노트 플랫폼

## 🚀 데모 영상

<video src="https://github.com/immanuelk1m/mystudy/raw/main/demo/demo.mp4" width="100%" controls></video>

## 📝 1. 프로젝트 개요

본 프로젝트는 사용자가 업로드한 문서를 기반으로 AI와 상호작용하며 학습할 수 있는 플랫폼입니다. 사용자는 문서를 업로드하여 챕터별로 학습 노트를 생성하고, AI 챗봇과 질의응답을 통해 깊이 있는 학습을 진행할 수 있습니다. React 기반의 동적인 프론트엔드와 Python(FastAPI)으로 구현된 강력한 백엔드로 구성되어 있습니다.

## ✨ 2. 주요 기능

파일 구조와 컴포넌트 명을 기반으로 유추한 주요 기능은 다음과 같습니다.

*   **📄 문서 업로드:** 사용자는 학습할 PDF 문서를 시스템에 업로드할 수 있습니다.
*   **📚 노트북/챕터 관리:** 업로드된 문서는 노트북 단위로 관리되며, 각 노트북은 여러 챕터로 구성됩니다.
*   **뷰어:** 사용자는 업로드한 문서를 웹에서 직접 확인할 수 있습니다.
*   **🤖 AI 챗봇:** 문서 내용에 기반하여 AI와 실시간으로 질의응답을 할 수 있습니다.
*   **🎧 팟캐스트/오디오 뷰:** 학습 콘텐츠를 오디오 형태로 들을 수 있는 기능을 제공합니다.
*   **👤 사용자 인증:** 회원가입 및 로그인 기능을 통해 개인화된 학습 환경을 제공합니다.
*   **💎 프리미엄 플랜:** 추가 기능 및 혜택을 제공하는 유료 구독 모델이 존재합니다.

## 🛠️ 3. 기술 스택

### Frontend

*   **Framework:** React
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS, shadcn/ui (Radix UI)
*   **State Management:** React Query
*   **Routing:** React Router
*   **Form:** React Hook Form

### Backend

*   **Framework:** FastAPI
*   **Language:** Python
*   **AI/LLM:** LangChain, Google Generative AI
*   **Web Server:** Uvicorn
*   **Data Validation:** Pydantic
*   **Dependencies:** `requirements.txt` 참고

## 🚀 4. 시작 가이드

로컬 환경에서 프로젝트를 실행하는 방법은 다음과 같습니다.

1.  **저장소 복제:**
    ```bash
    git clone https://github.com/immanuelk1m/mystudy.git
    cd your-repository
    ```

2.  **의존성 설치:**
    `Makefile`에 정의된 명령어를 사용하여 프론트엔드와 백엔드의 의존성을 각각 설치합니다.

    ```bash
    # 백엔드 의존성 설치 (uv 사용)
    make install-backend-deps

    # 프론트엔드 의존성 설치 (npm 사용)
    make install-frontend-deps
    ```

3.  **환경 변수 설정:**
    `backend/.env.example` 파일을 복사하여 `backend/.env` 파일을 생성하고, 필요한 환경 변수(예: Google API 키)를 설정합니다.

4.  **개발 서버 실행:**
    `Makefile`의 `dev` (또는 `run`) 명령어를 사용하여 프론트엔드와 백엔드 서버를 동시에 실행합니다.

    ```bash
    make dev
    ```

    *   프론트엔드 서버: `http://localhost:3000`
    *   백엔드 서버: `http://localhost:8000`

## 📂 5. 프로젝트 구조

*   **`frontend/`**: React와 TypeScript로 구현된 사용자 인터페이스(UI) 관련 코드가 위치합니다. 사용자가 직접 상호작용하는 모든 화면과 컴포넌트가 포함됩니다.
*   **`backend/`**: FastAPI로 구현된 API 서버 및 비즈니스 로직 관련 코드가 위치합니다. AI 모델 연동, 데이터 처리, 사용자 인증 등 핵심 로직을 담당합니다.