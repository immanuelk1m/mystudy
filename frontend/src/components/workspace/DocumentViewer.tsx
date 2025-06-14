import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MessageSquare, Book, CheckSquare, Volume2, CheckCircle, XCircle, Podcast, ChevronLeft, ChevronRight, Gamepad2, Loader2 } from 'lucide-react';
import { toast } from 'sonner'; // sonner import 추가
import PodcastView from './PodcastView'; // PodcastView import 추가
import { generateChapterGame } from '@/services/api'; // generateChapterGame import 추가

// Define types for props
interface DocumentContent {
  game_html?: string;
  title: string;
  metadata: string;
  documentContent: Array<{ type: string; level?: number; text?: string; items?: string[] }>;
  aiNotes: {
    summary: string;
    keyConcepts: Array<{ term: string; definition: string | { easy: string; medium: string; hard: string } }>;
    importantTerms: Array<{ term: string; definition: string }>;
    outline: Array<{ title: string; id: string }>;
  };
  quiz: Array<{
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string; // explanation 필드 추가
  }>;
}

// FileStructureItem 타입 정의 (Workspace와 공유)
interface FileStructureItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileStructureItem[];
}


interface DocumentViewerProps {
  notebookId: string;
  selectedChapter: string | null;
  documentData: DocumentContent | null; // Accept fetched data
  fileStructure: FileStructureItem[]; // fileStructure prop은 여전히 Sidebar에 필요하므로 받지만, 오디오 경로는 여기서 직접 구성
}

type ExplanationLevel = 'easy' | 'medium' | 'hard';

const DocumentViewer = ({ notebookId, selectedChapter, documentData, fileStructure }: DocumentViewerProps) => { // fileStructure prop 받기
  const [isPlaying, setIsPlaying] = useState(false);
  const [unknownStatus, setUnknownStatus] = useState<Record<number, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, number | null>>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Record<number, boolean | null>>({});
  const [audioPath, setAudioPath] = useState<string | null>(null); // State to store audio path
  const [isPodcastStarted, setIsPodcastStarted] = useState(false); // 팟캐스트 시작 상태
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [gameHtml, setGameHtml] = useState<string | null>(null);
  // 각 주요 개념별 설명 난이도 상태. key: concept.term, value: ExplanationLevel
  const [keyConceptExplanationLevels, setKeyConceptExplanationLevels] = useState<Record<string, ExplanationLevel>>({});

  useEffect(() => {
    if (documentData?.game_html) {
      setGameHtml(documentData.game_html);
    } else {
      setGameHtml(null);
    }
    setIsGeneratingGame(false);
  }, [documentData]);


  // documentData.aiNotes.keyConcepts가 변경되거나 처음 로드될 때 각 개념의 초기 난이도를 'medium'으로 설정
  useEffect(() => {
    if (documentData?.aiNotes?.keyConcepts) {
      const initialLevels: Record<string, ExplanationLevel> = {};
      documentData.aiNotes.keyConcepts.forEach(concept => {
        initialLevels[concept.term] = 'medium';
      });
      setKeyConceptExplanationLevels(initialLevels);
    }
  }, [documentData?.aiNotes?.keyConcepts]);


  // notebookId와 selectedChapter가 변경될 때 오디오 파일 경로 구성
  useEffect(() => {
    let determinedPath: string | null = null;

    if (notebookId && selectedChapter) {
      // selectedChapter 문자열에서 챕터 번호(첫 번째 숫자) 추출
      // "1" 또는 "1. 행렬과 연립방정식" 모두 지원
      const chapterNumberMatch = selectedChapter.match(/^(\d+)/);

      if (chapterNumberMatch && chapterNumberMatch[1]) {
        const chapterNumber = chapterNumberMatch[1];
        // 과목 ID와 챕터 번호를 사용하여 오디오 파일 경로 구성
        // 예: /data/content/1/1.wav 또는 /data/content/3/2.wav
        determinedPath = `/data/content/${notebookId}/${chapterNumber}.wav`;
        console.log("Constructed audio path based on notebook ID and chapter number:", determinedPath);
      } else {
        // 챕터 번호를 추출할 수 없는 경우 (예: "개요" 챕터)
        console.warn("Could not extract chapter number from selectedChapter:", selectedChapter);
        // 이 경우 determinedPath는 null로 유지되어 버튼 비활성화
      }
    } else {
        console.warn("Notebook ID or Chapter not available to determine audio path.");
         // determinedPath는 null로 유지
    }

    // 최종적으로 결정된 오디오 경로로 상태 업데이트
    setAudioPath(determinedPath);

  }, [notebookId, selectedChapter]); // notebookId 또는 selectedChapter가 변경될 때마다 실행


  // '모름' 상태 토글 함수
  const handleUnknownChange = (qIndex: number, checked: boolean) => {
    setUnknownStatus(prev => ({ ...prev, [qIndex]: checked }));
    // '모름' 체크 시 해당 문제 답변 초기화 (선택적)
    if (checked) {
      setUserAnswers(prev => ({ ...prev, [qIndex]: null }));
    }
  };

  // 사용자 답변 변경 핸들러
  const handleAnswerChange = (qIndex: number, optionIndex: string) => {
    setUserAnswers(prev => ({ ...prev, [qIndex]: parseInt(optionIndex, 10) }));
    // '모름' 체크 해제
    setUnknownStatus(prev => ({ ...prev, [qIndex]: false }));
    // 결과 표시 중 답변 변경 시 결과 숨김 (선택적)
    // if (showResults) {
    //   setShowResults(false);
    //   setResults({});
    // }
  };

  // 답변 확인 및 채점 핸들러
  const handleCheckAnswers = () => {
    if (!documentData) return;
    const newResults: Record<number, boolean | null> = {};
    documentData.quiz.forEach((q, qIndex) => {
      // '모름' 체크된 문제는 채점하지 않음 (null 처리)
      if (unknownStatus[qIndex]) {
        newResults[qIndex] = null;
      } else {
        newResults[qIndex] = userAnswers[qIndex] === q.answerIndex;
      }
    });
    setResults(newResults);
    setShowResults(true);
  };

  // 오디오 재생 핸들러
  const handlePlayAudio = () => {
    if (audioPath) {
      // audioPath는 이미 public 폴더를 기준으로 한 상대 경로입니다.
      const audio = new Audio(audioPath);

      // 오디오 이벤트 리스너 추가 (선택적)
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = (e) => {
         console.error("Audio playback error:", e);
         setIsPlaying(false); // 에러 시 재생 상태 초기화
         toast.error("오디오 재생 중 오류가 발생했습니다."); // 사용자에게 알림
      };

      audio.play().catch(error => {
        console.error("Error playing audio:", error);
        setIsPlaying(false); // 에러 시 재생 상태 초기화
        toast.error("오디오 재생을 시작할 수 없습니다. 파일이 존재하지 않거나 형식이 지원되지 않을 수 있습니다."); // 사용자에게 알림
      });
    } else {
      console.warn("No audio path determined for this chapter.");
      toast.info("이 챕터에 대한 오디오 파일이 없습니다."); // 사용자에게 알림
    }
  };

  const handleGenerateGame = async () => {
    if (!notebookId || !selectedChapter) {
      toast.error("게임 생성을 위해 노트북과 챕터를 선택해야 합니다.");
      return;
    }

    // selectedChapter에서 chapterId(숫자) 추출
    // "1" 또는 "1. 챕터 제목" 형식 모두 허용
    const chapterIdMatch = selectedChapter.match(/^(\d+)/);
    if (!chapterIdMatch) {
      toast.error("유효한 챕터 ID를 찾을 수 없습니다.");
      return;
    }
    const chapterId = chapterIdMatch[1];

    setIsGeneratingGame(true);
    toast.info("챕터 게임 생성을 시작합니다...");

    try {
      const result = await generateChapterGame(notebookId, chapterId);
      setGameHtml(result.game_html);
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to generate chapter game:", error);
      toast.error(error instanceof Error ? error.message : "게임 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingGame(false);
    }
  };

  const handleStartPodcast = () => {
    setIsPodcastStarted(true);
  };

  // 개별 주요 개념의 설명 난이도 변경 핸들러
  const handleKeyConceptExplanationLevelChange = (term: string, newLevel: ExplanationLevel) => {
    setKeyConceptExplanationLevels(prevLevels => ({
      ...prevLevels,
      [term]: newLevel,
    }));
  };

  const getExplanationLevelText = (level: ExplanationLevel | undefined) => {
    if (!level) return '보통'; // 기본값
    switch (level) {
      case 'easy': return '쉬움';
      case 'medium': return '보통';
      case 'hard': return '어려움';
      default: return '보통';
    }
  };

  // Render document content based on the fetched data structure
  const renderDocumentContent = (content: DocumentContent['documentContent']) => {
    return content.map((block, index) => {
      switch (block.type) {
        case 'heading':
          const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;
          return <HeadingTag key={index} className={`mt-4 ${block.level === 2 ? 'text-xl font-semibold' : 'text-lg font-medium'}`}>{block.text}</HeadingTag>;
        case 'paragraph':
          return <p key={index} className="mt-2">{block.text}</p>;
        case 'list':
          return (
            <ul key={index} className="list-disc pl-6 space-y-1 mt-2">
              {block.items?.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
            </ul>
          );
        // Add more cases for other content types (e.g., images, code blocks)
        default:
          return null;
      }
    });
  };

  if (!documentData) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        문서 내용을 불러올 수 없습니다.
      </div>
    ); // Or a loading/error state if not handled by parent
  }


  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="notes" className="h-full flex flex-col">
        <div className="border-b">
          <div className="flex items-center justify-between px-4">
            <TabsList>
              <TabsTrigger value="notes" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>AI 노트</span>
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex items-center gap-1">
                <CheckSquare className="h-4 w-4" />
                <span>퀴즈</span>
              </TabsTrigger>
              <TabsTrigger value="review" className="flex items-center gap-1">
                <Book className="h-4 w-4" /> {/* 오답 노트 아이콘 추가 */}
                <span>오답 노트</span>
              </TabsTrigger>
              <TabsTrigger value="podcast" className="flex items-center gap-1">
                <Podcast className="h-4 w-4" /> {/* Podcast 아이콘 추가 */}
                <span>팟캐스트</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {/* Game functionality */}
              {gameHtml ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-1 h-8">
                      <Gamepad2 className="h-4 w-4" />
                      게임 플레이
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-4xl h-[80vh]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>챕터 게임</AlertDialogTitle>
                      <AlertDialogDescription>
                        게임을 통해 학습한 내용을 복습해보세요.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="w-full h-full border rounded-md overflow-hidden">
                      <iframe
                        srcDoc={gameHtml}
                        title="Chapter Game"
                        className="w-full h-full"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogAction>닫기</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 h-8"
                  onClick={handleGenerateGame}
                  disabled={isGeneratingGame}
                >
                  {isGeneratingGame ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="h-4 w-4" />
                      해당 챕터 게임 생성하기
                    </>
                  )}
                </Button>
              )}


              {/* Audio functionality */}
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 h-8"
                onClick={handlePlayAudio} // 수정된 핸들러 사용
                // audioPath가 null이거나 재생 중이면 버튼 비활성화
                disabled={!audioPath || isPlaying}
              >
                <Volume2 className="h-4 w-4" />
                {isPlaying ? '재생 중...' : '듣기'} {/* 재생 상태에 따라 텍스트 변경 (선택적) */}
              </Button>
            </div>
          </div>
        </div>


        <TabsContent value="notes" className="flex-grow p-4 overflow-auto">
          <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-md p-6">
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">AI 생성 노트</h1>
              <p className="text-muted-foreground text-sm italic">
                "{documentData.title}"에서 생성됨
                {selectedChapter && ` - 챕터: ${selectedChapter}`}
              </p>

              <div className="bg-secondary/30 p-4 rounded-md border border-border mt-4">
                <h2 className="text-lg font-medium">요약</h2>
                <p className="mt-2">
                  {documentData.aiNotes.summary}
                </p>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-medium mb-2">주요 개념</h2>
                <ul className="space-y-3">
                  {documentData.aiNotes.keyConcepts.map((concept, index) => {
                    const currentLevel = keyConceptExplanationLevels[concept.term] || 'medium';
                    const levelOrder: ExplanationLevel[] = ['easy', 'medium', 'hard'];
                    const currentIndex = levelOrder.indexOf(currentLevel);

                    const canDecreaseLevel = currentIndex > 0;
                    const canIncreaseLevel = currentIndex < levelOrder.length - 1;

                    const decreaseLevel = () => {
                      if (canDecreaseLevel) {
                        handleKeyConceptExplanationLevelChange(concept.term, levelOrder[currentIndex - 1]);
                      }
                    };

                    const increaseLevel = () => {
                      if (canIncreaseLevel) {
                        handleKeyConceptExplanationLevelChange(concept.term, levelOrder[currentIndex + 1]);
                      }
                    };

                    return (
                      <li key={index} className="key-concept-item group border-l-2 border-primary pl-4 py-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{concept.term}</span>
                          <div className="difficulty-controls opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={decreaseLevel}
                              disabled={!canDecreaseLevel}
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <span className="text-xs font-medium w-12 text-center">
                              {getExplanationLevelText(currentLevel)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={increaseLevel}
                              disabled={!canIncreaseLevel}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm mt-1">
                          {typeof concept.definition === 'string'
                            ? concept.definition
                            : concept.definition[currentLevel]}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-medium">중요 용어</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {documentData.aiNotes.importantTerms.map((term, index) => (
                    <div key={index} className="bg-accent/50 p-3 rounded-md">
                      <h3 className="font-medium">{term.term}</h3>
                      <p className="text-sm">{term.definition}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </TabsContent>

        <TabsContent value="quiz" className="flex-grow p-4 overflow-auto">
          <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-md p-6">
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">지식 확인 퀴즈</h1>

              <p className="text-muted-foreground text-sm italic">
                "{documentData.title}"에서 생성된 퀴즈
                {selectedChapter && ` - Chapter: ${selectedChapter}`}
              </p>

              <div className="space-y-8 mt-6">
                {documentData.quiz.map((q, qIndex) => (
                  <div key={qIndex} className="border rounded-md p-4 relative"> {/* relative 추가 */}
                    <div className="flex justify-between items-start"> {/* 질문과 체크박스 정렬 */}
                      <div>
                        <h3 className="font-medium">질문 {qIndex + 1}</h3>
                        <p className="mt-1">{q.question}</p>
                      </div>
                      <div className="flex items-center space-x-2 absolute top-4 right-4"> {/* 체크박스 위치 조정 */}
                        <Checkbox
                          id={`unknown-${qIndex}`}
                          checked={unknownStatus[qIndex] || false}
                          onCheckedChange={(checked) => handleUnknownChange(qIndex, !!checked)}
                        />
                        <label
                          htmlFor={`unknown-${qIndex}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          모름
                        </label>
                      </div>
                    </div>

                    <RadioGroup
                      value={userAnswers[qIndex]?.toString() ?? ""}
                      onValueChange={(value) => handleAnswerChange(qIndex, value)}
                      className="space-y-2 mt-3"
                      disabled={unknownStatus[qIndex]} // '모름' 체크 시 비활성화
                    >
                      {q.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center">
                          <RadioGroupItem value={optionIndex.toString()} id={`q${qIndex}-o${optionIndex}`} />
                          <label htmlFor={`q${qIndex}-o${optionIndex}`} className="ml-2 block text-sm">{option}</label>
                        </div>
                      ))}
                    </RadioGroup>

                    {/* 채점 결과 및 해설 표시 */}
                    {showResults && (
                      <Alert
                        variant={results[qIndex] === null ? "default" : results[qIndex] ? "default" : "destructive"} // shadcn 기본 variant 사용 (success 없음)
                        className="mt-4"
                      >
                        {results[qIndex] === null ? (
                          <AlertTitle className="flex items-center gap-1">
                             🤔 모름
                          </AlertTitle>
                        ) : results[qIndex] ? (
                          <AlertTitle className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" /> 정답
                          </AlertTitle>
                        ) : (
                          <AlertTitle className="flex items-center gap-1">
                            <XCircle className="h-4 w-4 text-red-600" /> 오답
                          </AlertTitle>
                        )}
                        <AlertDescription>
                          {q.explanation}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center mt-8">
                <Button onClick={handleCheckAnswers}>답변 확인</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 오답 노트 탭 콘텐츠 */}
        <TabsContent value="review" className="flex-grow p-4 overflow-auto">
          <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-md p-6">
            <h1 className="text-2xl font-bold mb-6">오답 노트</h1>

            {!showResults ? (
              <p className="text-muted-foreground text-center">퀴즈를 풀고 답변을 확인해주세요.</p>
            ) : (
              (() => {
                const incorrectOrUnknownQuestions = documentData.quiz.filter((_, qIndex) =>
                  results[qIndex] === false || unknownStatus[qIndex] === true
                );

                if (incorrectOrUnknownQuestions.length === 0) {
                  return <p className="text-muted-foreground text-center">오답 노트에 표시할 문제가 없습니다.</p>;
                }

                return (
                  <div className="space-y-8">
                    {documentData.quiz.map((q, qIndex) => {
                      const isIncorrect = results[qIndex] === false;
                      const isUnknown = unknownStatus[qIndex] === true;

                      if (!isIncorrect && !isUnknown) return null; // 오답 또는 모름이 아니면 렌더링 안 함

                      return (
                        <div key={qIndex} className="border rounded-md p-4">
                          <h3 className="font-medium">질문 {qIndex + 1}</h3>
                          <p className="mt-1 mb-3">{q.question}</p>

                          <div className="space-y-2">
                            {q.options.map((option, optionIndex) => {
                              const isCorrectAnswer = optionIndex === q.answerIndex;
                              const isUserSelectedAnswer = userAnswers[qIndex] === optionIndex;

                              let labelClass = "ml-2 block text-sm";
                              if (isCorrectAnswer) {
                                labelClass += " text-green-600 font-semibold"; // 정답 강조
                              } else if (isUserSelectedAnswer && isIncorrect) {
                                labelClass += " text-red-600 line-through"; // 사용자가 선택한 오답
                              }

                              return (
                                <div key={optionIndex} className="flex items-center">
                                  {/* 오답노트에서는 선택 비활성화 */}
                                  <input
                                    type="radio"
                                    id={`review-q${qIndex}-o${optionIndex}`}
                                    name={`review-q${qIndex}`}
                                    value={optionIndex.toString()}
                                    checked={isUserSelectedAnswer || (isUnknown && isCorrectAnswer)} // 모름일 경우 정답 표시, 오답일 경우 사용자 선택 표시
                                    disabled
                                    className="mr-2"
                                  />
                                  <label htmlFor={`review-q${qIndex}-o${optionIndex}`} className={labelClass}>
                                    {option}
                                    {isCorrectAnswer && " (정답)"}
                                    {isUserSelectedAnswer && isIncorrect && " (선택한 오답)"}
                                    {isUnknown && isCorrectAnswer && " (정답)"}
                                    {isUnknown && !isCorrectAnswer && ""} {/* 모름 선택 시 오답 표시는 안 함 */}
                                  </label>
                                </div>
                              );
                            })}
                             {isUnknown && (
                                <p className="text-sm text-blue-600 mt-1">🤔 '모름'으로 표시한 문제입니다.</p>
                             )}
                          </div>

                          <Alert variant="default" className="mt-4 bg-secondary/50">
                            <AlertTitle>해설</AlertTitle>
                            <AlertDescription>
                              {q.explanation}
                            </AlertDescription>
                          </Alert>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        </TabsContent>

        {/* 팟캐스트 탭 콘텐츠 */}
        <TabsContent value="podcast" className="flex-grow p-4 overflow-auto">
          <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-md p-6">
            <h1 className="text-2xl font-bold mb-6">팟캐스트</h1>
            {isPodcastStarted ? (
              <PodcastView audioSrc={audioPath || '/data/content/1/1.wav'} />
            ) : (
              <div className="flex justify-center">
                <Button onClick={handleStartPodcast}>팟캐스트 시작</Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentViewer;