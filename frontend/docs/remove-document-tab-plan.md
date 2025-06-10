# 작업 공간 문서 탭 제거 계획

## 목표
작업 공간 화면에서 "문서" 탭을 제거하고 "AI 노트"와 "퀴즈" 탭만 남깁니다.

## 분석.
- `src/components/workspace/Sidebar.tsx`: 사이드바 네비게이션을 담당하지만, 탭 구조 자체는 여기서 관리하지 않습니다. 파일 구조와 AI 개요 데이터를 받아서 표시합니다.
- `src/pages/Workspace.tsx`: `Sidebar`와 `DocumentViewer` 컴포넌트에 데이터를 전달합니다. `documentData` 객체에 문서 내용, AI 노트, 퀴즈 데이터가 모두 포함되어 있습니다.
- `src/components/workspace/DocumentViewer.tsx`: `Tabs` 컴포넌트를 사용하여 "문서", "AI 노트", "퀴즈" 탭을 구현하고 각 탭의 내용을 렌더링합니다.

따라서 `DocumentViewer.tsx` 파일을 수정하여 목표를 달성할 수 있습니다.

## 실행 계획
1.  `src/components/workspace/DocumentViewer.tsx` 파일을 수정합니다.
2.  "문서" 탭에 해당하는 `<TabsTrigger value="document">...</TabsTrigger>` 부분을 제거합니다.
3.  "문서" 탭 내용에 해당하는 `<TabsContent value="document">...</TabsContent>` 부분을 제거합니다.
4.  `<Tabs defaultValue="document" ...>` 부분에서 `defaultValue`를 "notes"로 변경하여 AI 노트 탭이 기본으로 표시되도록 합니다.

## 계획 다이어그램

```mermaid
graph TD
    A[사용자 요청: 문서 탭 제거] --> B{파일 분석};
    B --> C[src/components/workspace/Sidebar.tsx];
    B --> D[src/pages/Workspace.tsx];
    B --> E[src/components/workspace/DocumentViewer.tsx];
    C --> F[사이드바는 네비게이션 역할];
    D --> G[Workspace는 데이터 전달];
    E --> H[DocumentViewer가 탭 구현];
    H --> I[DocumentViewer.tsx 수정 필요];
    I --> J[문서 TabsTrigger 제거];
    I --> K[문서 TabsContent 제거];
    I --> L[Tabs defaultValue 변경 (document -> notes)];
    L --> M[수정된 DocumentViewer.tsx];
    M --> N{사용자 확인 요청};
    N --> O[계획 확정];
    O --> P[코드 모드로 전환하여 수정 진행];