import json
import asyncio
from typing import TypedDict, Annotated, Sequence, List
import operator
from langgraph.graph import StateGraph, END
from . import ai_services, crud # Import the ai_services and crud modules
import os

# 상태 정의
class ProcessingState(TypedDict):
    pdf_file_path: str
    pdf_text: str
    document_class: str
    segmented_chapters: List[str]
    generated_content: Annotated[Sequence[dict], operator.add]
    final_result: str

# 노드 구현
def start_processing(state: ProcessingState) -> ProcessingState:
    print("---PDF 처리 시작---")
    print(f"입력 파일: {state['pdf_file_path']}")
    # PDF 텍스트 추출
    text = ai_services.extract_text_from_pdf(state['pdf_file_path'])
    if not text:
        # 텍스트 추출 실패 시 처리 중단 또는 오류 처리
        print(f"오류: {state['pdf_file_path']}에서 텍스트를 추출할 수 없습니다.")
        state['final_result'] = "Error: Could not extract text from PDF."
        # END로 직접 이동하도록 상태를 조작할 수 있지만, 여기서는 간단히 다음 노드로 진행
        state['pdf_text'] = ""
    else:
        state['pdf_text'] = text
    return state

def classify_document(state: ProcessingState) -> ProcessingState:
    print("---문서 분류 중---")
    pdf_text = state.get('pdf_text')
    if not pdf_text:
        print("분류할 텍스트가 없어 이 단계를 건너뜁니다.")
        state['document_class'] = "Unclassified"
        return state

    try:
        # 기존 노트북(클래스) 목록 로드
        with open('backend/data/notebooks.json', 'r', encoding='utf-8') as f:
            notebooks_data = json.load(f)
        existing_classes = [notebook['title'] for notebook in notebooks_data]

        # AI 서비스를 호출하여 문서 분류
        classification_result = asyncio.run(ai_services.classify_pdf_text(pdf_text, existing_classes))
        
        if classification_result:
            print(f"문서 분류 결과: {classification_result}")
            state['document_class'] = classification_result
        else:
            print("문서 분류에 실패했습니다.")
            state['document_class'] = "Classification Failed"

    except FileNotFoundError:
        print("오류: notebooks.json 파일을 찾을 수 없습니다. 기본값으로 설정합니다.")
        state['document_class'] = "Unclassified (no notebook list)"
    except Exception as e:
        print(f"문서 분류 중 오류 발생: {e}")
        state['document_class'] = "Classification Error"
        
    return state

def segment_chapters(state: ProcessingState) -> ProcessingState:
    print("---챕터 분할 중---")
    pdf_text = state.get('pdf_text')
    document_class = state.get('document_class', 'Unclassified')

    if not pdf_text:
        print("분할할 텍스트가 없어 이 단계를 건너뜁니다.")
        state['segmented_chapters'] = []
        return state

    print(f"분류된 클래스 '{document_class}'에 대한 챕터 분할을 진행합니다.")
    
    try:
        # AI 서비스를 호출하여 텍스트를 챕터로 분할
        chapters_result = asyncio.run(ai_services.segment_text_into_chapters(pdf_text, document_class))
        
        if chapters_result:
            print(f"{len(chapters_result)}개의 챕터로 성공적으로 분할했습니다.")
            state['segmented_chapters'] = chapters_result
        else:
            print("챕터 분할에 실패했거나 챕터를 찾지 못했습니다.")
            state['segmented_chapters'] = []

    except Exception as e:
        print(f"챕터 분할 중 오류 발생: {e}")
        state['segmented_chapters'] = []
        
    return state

def generate_chapter_content(state: ProcessingState) -> ProcessingState:
    print("---챕터별 콘텐츠 생성 중---")
    chapters = state.get('segmented_chapters', [])
    pdf_path = state.get('pdf_file_path', 'unknown.pdf')
    original_filename = os.path.basename(pdf_path)

    if not chapters:
        print("콘텐츠를 생성할 챕터가 없습니다.")
        state['generated_content'] = []
        return state

    generated_contents = []
    # 비동기적으로 각 챕터 처리
    # asyncio.run을 사용하여 각 코루틴을 실행합니다.
    # 실제 프로덕션 환경에서는 asyncio.gather를 사용하여 병렬로 실행하는 것이 더 효율적일 수 있습니다.
    for i, chapter_text in enumerate(chapters):
        print(f"챕터 {i+1}/{len(chapters)} 콘텐츠 생성 시작...")
        try:
            # ai_services.generate_chapter_from_pdf_text가 코루틴이므로 asyncio.run으로 실행
            content = asyncio.run(ai_services.generate_chapter_from_pdf_text(chapter_text, original_filename))
            if content:
                generated_contents.append(content)
                print(f"챕터 {i+1} 콘텐츠 생성 완료.")
            else:
                print(f"챕터 {i+1} 콘텐츠 생성에 실패했습니다.")
        except Exception as e:
            print(f"챕터 {i+1} 콘텐츠 생성 중 오류 발생: {e}")
    
    state['generated_content'] = generated_contents
    print(f"총 {len(generated_contents)}개의 챕터에 대한 콘텐츠 생성을 완료했습니다.")
    return state


def finish_processing(state: ProcessingState) -> ProcessingState:
    print("---모든 처리 완료 및 파일 저장 중---")
    notebook_title = state.get('document_class')
    generated_content = state.get('generated_content')

    if not notebook_title or not generated_content:
        error_msg = "최종 결과를 저장하기 위한 정보(노트북 제목 또는 생성된 콘텐츠)가 부족합니다."
        print(error_msg)
        state['final_result'] = f"Error: {error_msg}"
        return state

    try:
        # crud 함수를 호출하여 파일 시스템에 결과 저장
        notebook_id = crud.create_notebook_and_chapters_from_processing(
            notebook_title=notebook_title,
            generated_contents=generated_content
        )

        if notebook_id:
            success_msg = f"'{notebook_title}' 노트북(ID: {notebook_id})에 {len(generated_content)}개의 챕터가 성공적으로 처리 및 저장되었습니다."
            print(success_msg)
            state['final_result'] = success_msg
        else:
            error_msg = "CRUD 작업을 통해 노트북과 챕터를 저장하는 데 실패했습니다."
            print(error_msg)
            state['final_result'] = f"Error: {error_msg}"

    except Exception as e:
        error_msg = f"최종 처리 및 저장 단계에서 예외 발생: {e}"
        print(error_msg)
        state['final_result'] = f"Error: {error_msg}"
        
    return state

# 그래프 정의
workflow = StateGraph(ProcessingState)

# 노드 추가
workflow.add_node("start_processing", start_processing)
workflow.add_node("classify_document", classify_document)
workflow.add_node("segment_chapters", segment_chapters)
workflow.add_node("generate_chapter_content", generate_chapter_content)
workflow.add_node("finish_processing", finish_processing)

# 엣지 연결
workflow.add_edge("start_processing", "classify_document")
workflow.add_edge("classify_document", "segment_chapters")
workflow.add_edge("segment_chapters", "generate_chapter_content")
workflow.add_edge("generate_chapter_content", "finish_processing")
workflow.add_edge("finish_processing", END)

# 시작점 설정
workflow.set_entry_point("start_processing")

# 그래프 컴파일
app = workflow.compile()

# 그래프 실행 함수
def run_graph(pdf_file_path: str):
    # 'generated_content'는 operator.add에 의해 누적되므로 빈 리스트로 초기화해야 합니다.
    # 나머지 키는 첫 번째 노드에서 채워집니다.
    inputs = {"pdf_file_path": pdf_file_path, "generated_content": []}
    return app.invoke(inputs)