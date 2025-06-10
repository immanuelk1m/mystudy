# 백엔드 연동 필요 기능 목록

## 1. 노트북 목록 로드
현재 로컬 JSON 파일에서 로드하는 노트북 목록을 백엔드 API를 통해 가져와야 합니다.
*   관련 파일: [`src/pages/Index.tsx:26`](src/pages/Index.tsx:26), [`src/pages/Workspace.tsx:68`](src/pages/Workspace.tsx:68)

## 2. 챕터 목록 로드
로컬 JSON 파일에서 로드하는 챕터 목록을 백엔드 API를 통해 가져와야 합니다.
*   관련 파일: [`src/components/dashboard/ChapterSelectionDialog.tsx:39`](src/components/dashboard/ChapterSelectionDialog.tsx:39)

## 3. 문서 내용 (AI 노트, 퀴즈 포함) 로드
문서 관련 모든 데이터(제목, 내용, AI 생성 노트, 퀴즈 등)를 백엔드 API를 통해 동적으로 제공받아야 합니다.
*   관련 파일: [`src/components/workspace/DocumentViewer.tsx`](src/components/workspace/DocumentViewer.tsx) (데이터는 상위 컴포넌트에서 fetch)

## 4. 오디오 파일 경로 및 재생
오디오 파일을 백엔드에서 관리하고, 스트리밍 URL 또는 파일을 API를 통해 제공받아야 합니다.
*   관련 파일: [`src/components/workspace/DocumentViewer.tsx:84`](src/components/workspace/DocumentViewer.tsx:84), [`src/components/workspace/DocumentViewer.tsx:143`](src/components/workspace/DocumentViewer.tsx:143), [`src/components/workspace/DocumentViewer.tsx:526`](src/components/workspace/DocumentViewer.tsx:526)

## 5. 게스트 사용자 인증
`localStorage` 기반의 임시 게스트 인증을 백엔드와 연동된 안전한 사용자 인증 시스템으로 대체해야 합니다.
*   관련 파일: [`src/contexts/GuestContext.tsx:22`](src/contexts/GuestContext.tsx:22), [`src/contexts/GuestContext.tsx:29`](src/contexts/GuestContext.tsx:29), [`src/contexts/GuestContext.tsx:34`](src/contexts/GuestContext.tsx:34)

## 6. 퀴즈 진행 상황 및 결과 저장
사용자의 퀴즈 답변, 채점 결과, '모름' 표시 등을 백엔드에 저장하여 학습 진행 상황을 관리해야 합니다.
*   관련 파일: [`src/components/workspace/DocumentViewer.tsx`](src/components/workspace/DocumentViewer.tsx) (관련 상태 및 핸들러)

## 7. AI 노트 주요 개념 설명 난이도 저장
사용자별 AI 노트 설명 난이도 설정을 백엔드에 저장해야 합니다.
*   관련 파일: [`src/components/workspace/DocumentViewer.tsx`](src/components/workspace/DocumentViewer.tsx) (관련 상태 및 핸들러)

## 8. 파일 업로드 (추정)
파일 업로드 기능을 백엔드 스토리지와 연동해야 합니다.
*   관련 파일: [`src/components/dashboard/UploadButton.tsx`](src/components/dashboard/UploadButton.tsx), [`src/components/uploads/FileUploader.tsx`](src/components/uploads/FileUploader.tsx)

## 9. 노트북 생성 (추정)
노트북 생성 기능을 백엔드 API와 연동하여 데이터베이스에 정보를 저장해야 합니다.
*   관련 파일: [`src/components/dashboard/CreateNotebookButton.tsx`](src/components/dashboard/CreateNotebookButton.tsx)