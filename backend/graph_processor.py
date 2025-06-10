import json
import asyncio
from typing import TypedDict, Annotated, Sequence, List, Dict, Any
import operator
from langgraph.graph import StateGraph, END
from . import ai_services, crud # Import the ai_services and crud modules
import os

# 상태 정의
class ProcessingState(TypedDict):
    run_id: str
    pdf_file_paths: List[str]  # Changed from single path to list
    all_pdf_texts: List[Dict[str, str]] # List of {'filename': str, 'text': str}
    notebook_title: str # Unified title for the notebook
    holistic_chapters: List[Dict[str, any]] # Chapters from the holistic analysis
    generated_content: Annotated[Sequence[dict], operator.add]
    log_entries: Annotated[Sequence[dict], operator.add]
    final_result: str


# 노드 구현
def start_processing(state: ProcessingState) -> ProcessingState:
    print("---배치 PDF 처리 시작---")
    pdf_paths = state['pdf_file_paths']
    print(f"입력 파일들: {', '.join(pdf_paths)}")
    
    all_texts = []
    for pdf_path in pdf_paths:
        text = ai_services.extract_text_from_pdf(pdf_path)
        if text:
            all_texts.append({
                "filename": os.path.basename(pdf_path),
                "text": text
            })
        else:
            print(f"경고: {pdf_path}에서 텍스트를 추출하지 못했습니다. 이 파일은 건너뜁니다.")
    
    if not all_texts:
        state['final_result'] = "Error: Could not extract text from any of the provided PDFs."
        # This should ideally lead to an end state.
        state['all_pdf_texts'] = []
    else:
        state['all_pdf_texts'] = all_texts

    snapshot = {k: v for k, v in state.items() if k not in ['all_pdf_texts', 'log_entries']}
    log_entry = {"node": "start_processing", "status": "completed", "state_snapshot": snapshot}
    state['log_entries'].append(log_entry)
    return state

async def analyze_overall_structure(state: ProcessingState) -> ProcessingState:
    print("---전체 구조 분석 중---")
    all_pdf_texts = state.get('all_pdf_texts')

    if not all_pdf_texts:
        print("분석할 텍스트가 없어 이 단계를 건너뜁니다.")
        state['notebook_title'] = "Untitled Notebook"
        state['holistic_chapters'] = []
        return state

    try:
        structure_result = await ai_services.analyze_holistic_structure(all_pdf_texts)
        
        if structure_result:
            state['notebook_title'] = structure_result.notebook_title
            # Pydantic model to dict for state
            state['holistic_chapters'] = [chapter.dict() for chapter in structure_result.chapters]
            print(f"통합 노트북 제목 '{state['notebook_title']}' 및 {len(state['holistic_chapters'])}개의 챕터 구조 생성 완료.")
        else:
            print("전체 구조 분석에 실패했습니다.")
            state['notebook_title'] = "Analysis Failed"
            state['holistic_chapters'] = []

    except Exception as e:
        print(f"전체 구조 분석 중 오류 발생: {e}")
        state['notebook_title'] = "Analysis Error"
        state['holistic_chapters'] = []
        
    snapshot = {k: v for k, v in state.items() if k not in ['all_pdf_texts', 'log_entries']}
    log_entry = {"node": "analyze_overall_structure", "status": "completed", "state_snapshot": snapshot}
    state['log_entries'].append(log_entry)
    return state

async def generate_chapter_content(state: ProcessingState) -> ProcessingState:
    print("---통합 챕터별 콘텐츠 생성 중---")
    chapters = state.get('holistic_chapters', [])

    if not chapters:
        print("콘텐츠를 생성할 챕터가 없습니다.")
        state['generated_content'] = []
        return state

    tasks = []
    for chapter_data in chapters:
        tasks.append(ai_services.generate_content_for_chapter(
            chapter_title=chapter_data['chapter_title'],
            chapter_text=chapter_data['chapter_full_text'],
            original_pdf_filename=chapter_data['source_pdf_filename']
        ))

    print(f"{len(chapters)}개 챕터에 대한 콘텐츠 생성 작업 시작...")
    generated_contents_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    generated_contents = []
    for i, result in enumerate(generated_contents_results):
        if isinstance(result, Exception):
            print(f"Error during content generation for chapter {i+1}: {result}")
        elif result is not None:
            generated_contents.append(result)
            # The success message is now printed inside ai_services.py
        else:
            # This case handles when generate_content_for_chapter explicitly returns None
            print(f"Failed to generate content for chapter {i+1}. The generation function returned None.")

    state['generated_content'] = generated_contents
    print(f"총 {len(generated_contents)}개의 챕터에 대한 콘텐츠 생성을 완료했습니다.")
    snapshot = {k: v for k, v in state.items() if k not in ['pdf_text', 'log_entries']}
    log_entry = {"node": "generate_chapter_content", "status": "completed", "state_snapshot": snapshot}
    state['log_entries'].append(log_entry)
    return state


def finish_processing(state: ProcessingState) -> ProcessingState:
    print("---모든 처리 완료 및 파일 저장 중---")
    notebook_title = state.get('notebook_title') # Use the new unified title
    generated_content = state.get('generated_content')
    run_id = state.get('run_id')

    if not notebook_title or generated_content is None:
        error_msg = "최종 결과를 저장하기 위한 정보(노트북 제목 또는 생성된 콘텐츠)가 부족합니다."
        print(error_msg)
        state['final_result'] = f"Error: {error_msg}"
    else:
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

    # Log the final state before saving the logs
    snapshot = {k: v for k, v in state.items() if k not in ['pdf_text', 'log_entries']}
    log_entry = {"node": "finish_processing", "status": "completed", "state_snapshot": snapshot}
    state['log_entries'].append(log_entry)
    
    # Save all accumulated logs to a file
    if run_id:
        # Convert log entries to be JSON serializable before saving
        serializable_logs = crud.convert_to_serializable(state['log_entries'])
        if not crud.save_run_log(run_id, serializable_logs):
            print(f"Warning: Failed to save run log for run_id: {run_id}")
    else:
        print("Warning: run_id not found, skipping log saving.")
        
    return state

# 그래프 정의
workflow = StateGraph(ProcessingState)

# 노드 추가
workflow.add_node("start_processing", start_processing)
workflow.add_node("analyze_overall_structure", analyze_overall_structure) # New node
workflow.add_node("generate_chapter_content", generate_chapter_content)
workflow.add_node("finish_processing", finish_processing)

# 엣지 연결
workflow.add_edge("start_processing", "analyze_overall_structure")
workflow.add_edge("analyze_overall_structure", "generate_chapter_content")
workflow.add_edge("generate_chapter_content", "finish_processing")
workflow.add_edge("finish_processing", END)

# 시작점 설정
workflow.set_entry_point("start_processing")

# 그래프 컴파일
app = workflow.compile()

# 그래프 실행 함수
# 그래프 실행 함수
async def run_graph(run_id: str, pdf_file_paths: List[str]):
    """
    Runs the graph using the stream method, logging each step with a serializable state snapshot.
    """
    # 초기 상태 정의
    state = {
        "run_id": run_id,
        "pdf_file_paths": pdf_file_paths,
        "generated_content": [],
        "log_entries": [],
        "all_pdf_texts": [],
        "notebook_title": "",
        "holistic_chapters": [],
        "final_result": ""
    }
    run_logs = []
    
    # LangGraph 실행을 위한 설정
    config = {"recursion_limit": 10}

    final_state = {}
    # app.stream을 사용하여 그래프 실행 및 각 단계 로깅
    async for step in app.astream(state, config):
        node_name = list(step.keys())[0]
        state = list(step.values())[0]
        final_state = state  # 마지막 상태를 계속 업데이트

        # 상태 스냅샷을 직렬화 가능한 형식으로 변환
        serializable_snapshot = crud.convert_to_serializable(state)
        
        log_entry = {
            "node": node_name,
            "status": "completed",
            "state_snapshot": serializable_snapshot,
        }
        run_logs.append(log_entry)
        print(f"--- Executing node: {node_name} ---")

        # 오류 발생 시 조기 중단
        if state.get("final_result", "").startswith("Error:"):
            print(f"Stopping execution due to error after {node_name}.")
            break
            
    # 실행 로그 저장
    if run_id:
        if not crud.save_run_log(run_id, run_logs):
            print(f"Warning: Failed to save run log for run_id: {run_id}")
    else:
        print("Warning: run_id not found, skipping log saving.")

    # 최종 상태 반환
    return final_state