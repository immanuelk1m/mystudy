import React, { createContext, useContext, useState, useCallback } from 'react';

// 형광펜 클래스 타입 정의
export interface HighlightClass {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  createdAt: Date;
  updatedAt: Date;
}

// 하이라이트 데이터 타입 정의
export interface Highlight {
  id: string;
  text: string;
  classId: string;
  notebookId: string;
  chapterId: string;
  startOffset: number;
  endOffset: number;
  containerSelector: string;
  createdAt: Date;
}

// 컨텍스트 타입 정의
interface HighlightContextType {
  // 하이라이트 클래스 관리
  highlightClasses: HighlightClass[];
  addHighlightClass: (name: string, color: string, backgroundColor: string) => string;
  updateHighlightClass: (id: string, name: string, color: string, backgroundColor: string) => void;
  removeHighlightClass: (id: string) => void;
  getHighlightClass: (id: string) => HighlightClass | undefined;
  
  // 하이라이트 관리
  highlights: Highlight[];
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => string;
  removeHighlight: (id: string) => void;
  getHighlightsByChapter: (notebookId: string, chapterId: string) => Highlight[];
  
  // 현재 선택된 클래스
  selectedClassId: string | null;
  setSelectedClassId: (classId: string | null) => void;
  
  // 하이라이트 모드
  isHighlightMode: boolean;
  setIsHighlightMode: (mode: boolean) => void;
}

const HighlightContext = createContext<HighlightContextType | undefined>(undefined);

// 기본 하이라이트 클래스들
const defaultHighlightClasses: HighlightClass[] = [
  {
    id: 'yellow',
    name: '중요',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'green',
    name: '이해함',
    color: '#065f46',
    backgroundColor: '#d1fae5',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'red',
    name: '모르는 부분',
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'blue',
    name: '복습 필요',
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const HighlightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highlightClasses, setHighlightClasses] = useState<HighlightClass[]>(defaultHighlightClasses);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>('yellow');
  const [isHighlightMode, setIsHighlightMode] = useState(false);

  // 하이라이트 클래스 관리 함수들
  const addHighlightClass = useCallback((name: string, color: string, backgroundColor: string): string => {
    const id = `custom-${Date.now()}`;
    const newClass: HighlightClass = {
      id,
      name,
      color,
      backgroundColor,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setHighlightClasses(prev => [...prev, newClass]);
    return id;
  }, []);

  const updateHighlightClass = useCallback((id: string, name: string, color: string, backgroundColor: string) => {
    setHighlightClasses(prev => prev.map(cls => 
      cls.id === id 
        ? { ...cls, name, color, backgroundColor, updatedAt: new Date() }
        : cls
    ));
  }, []);

  const removeHighlightClass = useCallback((id: string) => {
    // 해당 클래스를 사용하는 하이라이트들도 제거
    setHighlights(prev => prev.filter(highlight => highlight.classId !== id));
    setHighlightClasses(prev => prev.filter(cls => cls.id !== id));
    
    // 선택된 클래스가 제거된 경우 선택 해제
    if (selectedClassId === id) {
      setSelectedClassId(null);
    }
  }, [selectedClassId]);

  const getHighlightClass = useCallback((id: string): HighlightClass | undefined => {
    return highlightClasses.find(cls => cls.id === id);
  }, [highlightClasses]);

  // 하이라이트 관리 함수들
  const addHighlight = useCallback((highlight: Omit<Highlight, 'id' | 'createdAt'>): string => {
    const id = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newHighlight: Highlight = {
      ...highlight,
      id,
      createdAt: new Date(),
    };
    setHighlights(prev => [...prev, newHighlight]);
    return id;
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setHighlights(prev => prev.filter(highlight => highlight.id !== id));
  }, []);

  const getHighlightsByChapter = useCallback((notebookId: string, chapterId: string): Highlight[] => {
    return highlights.filter(highlight => 
      highlight.notebookId === notebookId && highlight.chapterId === chapterId
    );
  }, [highlights]);

  const value: HighlightContextType = {
    highlightClasses,
    addHighlightClass,
    updateHighlightClass,
    removeHighlightClass,
    getHighlightClass,
    highlights,
    addHighlight,
    removeHighlight,
    getHighlightsByChapter,
    selectedClassId,
    setSelectedClassId,
    isHighlightMode,
    setIsHighlightMode,
  };

  return (
    <HighlightContext.Provider value={value}>
      {children}
    </HighlightContext.Provider>
  );
};

export const useHighlight = (): HighlightContextType => {
  const context = useContext(HighlightContext);
  if (context === undefined) {
    throw new Error('useHighlight must be used within a HighlightProvider');
  }
  return context;
};