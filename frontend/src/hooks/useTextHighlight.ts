import { useCallback, useEffect, useRef } from 'react';
import { useHighlight } from '@/contexts/HighlightContext';
import { toast } from 'sonner';

interface UseTextHighlightProps {
  notebookId: string;
  chapterId: string;
  containerRef: React.RefObject<HTMLElement>;
}

export const useTextHighlight = ({ notebookId, chapterId, containerRef }: UseTextHighlightProps) => {
  const {
    isHighlightMode,
    selectedClassId,
    addHighlight,
    removeHighlight,
    getHighlightsByChapter,
    getHighlightClass,
  } = useHighlight();

  const selectionRef = useRef<Selection | null>(null);

  // 텍스트 선택 이벤트 핸들러
  const handleTextSelection = useCallback(() => {
    if (!isHighlightMode || !selectedClassId || !containerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // 선택된 텍스트가 컨테이너 내부에 있는지 확인
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    // 하이라이트 클래스 정보 가져오기
    const highlightClass = getHighlightClass(selectedClassId);
    if (!highlightClass) return;

    try {
      // 선택된 텍스트를 하이라이트로 감싸기
      const highlightId = applyHighlight(range, highlightClass, selectedText);
      
      // 하이라이트 데이터 저장
      addHighlight({
        text: selectedText,
        classId: selectedClassId,
        notebookId,
        chapterId,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        containerSelector: getElementSelector(range.startContainer.parentElement || range.startContainer as Element),
      });

      // 선택 해제
      selection.removeAllRanges();
      
      toast.success(`"${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"가 하이라이트되었습니다.`);
    } catch (error) {
      console.error('하이라이트 적용 중 오류:', error);
      toast.error('하이라이트 적용에 실패했습니다.');
    }
  }, [isHighlightMode, selectedClassId, notebookId, chapterId, containerRef, addHighlight, getHighlightClass]);

  // 하이라이트 적용 함수
  const applyHighlight = useCallback((range: Range, highlightClass: any, text: string): string => {
    const highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 하이라이트 요소 생성
    const highlightElement = document.createElement('mark');
    highlightElement.id = highlightId;
    highlightElement.className = 'text-highlight';
    highlightElement.style.backgroundColor = highlightClass.backgroundColor;
    highlightElement.style.color = highlightClass.color;
    highlightElement.style.cursor = 'pointer';
    highlightElement.style.borderRadius = '2px';
    highlightElement.style.padding = '1px 2px';
    highlightElement.title = `${highlightClass.name}: ${text}`;
    
    // 더블클릭으로 하이라이트 제거 이벤트 추가
    highlightElement.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeHighlightElement(highlightId);
    });

    // 선택된 텍스트를 하이라이트 요소로 감싸기
    try {
      range.surroundContents(highlightElement);
    } catch (error) {
      // 복잡한 선택의 경우 다른 방법 사용
      const contents = range.extractContents();
      highlightElement.appendChild(contents);
      range.insertNode(highlightElement);
    }

    return highlightId;
  }, []);

  // 하이라이트 제거 함수
  const removeHighlightElement = useCallback((highlightId: string) => {
    const element = document.getElementById(highlightId);
    if (element) {
      const parent = element.parentNode;
      if (parent) {
        // 하이라이트 요소의 내용을 부모에 직접 삽입
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
        
        // 텍스트 노드 정리
        parent.normalize();
      }
      
      // 데이터에서도 제거
      removeHighlight(highlightId);
      toast.success('하이라이트가 제거되었습니다.');
    }
  }, [removeHighlight]);

  // 요소의 CSS 선택자 생성
  const getElementSelector = useCallback((element: Element): string => {
    if (element.id) {
      return `#${element.id}`;
    }
    
    let selector = element.tagName.toLowerCase();
    
    if (element.className) {
      selector += '.' + element.className.split(' ').join('.');
    }
    
    // 부모 요소와의 관계를 포함한 더 구체적인 선택자 생성
    let parent = element.parentElement;
    if (parent && parent !== containerRef.current) {
      selector = getElementSelector(parent) + ' > ' + selector;
    }
    
    return selector;
  }, [containerRef]);

  // 기존 하이라이트 복원
  const restoreHighlights = useCallback(() => {
    if (!containerRef.current) return;

    const highlights = getHighlightsByChapter(notebookId, chapterId);
    
    highlights.forEach((highlight) => {
      try {
        const highlightClass = getHighlightClass(highlight.classId);
        if (!highlightClass) return;

        // 컨테이너에서 텍스트 찾기 및 하이라이트 적용
        const walker = document.createTreeWalker(
          containerRef.current!,
          NodeFilter.SHOW_TEXT,
          null
        );

        let node;
        while (node = walker.nextNode()) {
          const textContent = node.textContent || '';
          const index = textContent.indexOf(highlight.text);
          
          if (index !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + highlight.text.length);
            
            // 이미 하이라이트된 텍스트인지 확인
            const existingHighlight = document.getElementById(highlight.id);
            if (!existingHighlight) {
              applyHighlight(range, highlightClass, highlight.text);
            }
            break;
          }
        }
      } catch (error) {
        console.error('하이라이트 복원 중 오류:', error);
      }
    });
  }, [notebookId, chapterId, containerRef, getHighlightsByChapter, getHighlightClass, applyHighlight]);

  // 이벤트 리스너 등록
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      // 약간의 지연을 두어 선택이 완료된 후 처리
      setTimeout(handleTextSelection, 10);
    };

    container.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleTextSelection, containerRef]);

  // 하이라이트 복원 (컴포넌트 마운트 시)
  useEffect(() => {
    if (containerRef.current) {
      // DOM이 완전히 렌더링된 후 하이라이트 복원
      setTimeout(restoreHighlights, 100);
    }
  }, [restoreHighlights, notebookId, chapterId]);

  return {
    removeHighlightElement,
    restoreHighlights,
  };
};