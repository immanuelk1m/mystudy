"""
Progress tracking system for PDF upload and processing
"""
import time
import uuid
from typing import Dict, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum
import threading

class ProgressStatus(Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    EXTRACTING_TEXT = "extracting_text"
    GENERATING_AI_CONTENT = "generating_ai_content"
    SAVING_TO_DATABASE = "saving_to_database"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class ProgressStep:
    name: str
    status: ProgressStatus
    progress: int  # 0-100
    message: str
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    error: Optional[str] = None

@dataclass
class ProcessingProgress:
    task_id: str
    notebook_id: int
    filename: str
    status: ProgressStatus
    overall_progress: int  # 0-100
    current_step: str
    steps: List[ProgressStep]
    started_at: float
    completed_at: Optional[float] = None
    result: Optional[Dict] = None
    error: Optional[str] = None

class ProgressTracker:
    def __init__(self):
        self._tasks: Dict[str, ProcessingProgress] = {}
        self._lock = threading.Lock()
    
    def create_task(self, notebook_id: int, filename: str) -> str:
        """Create a new processing task and return task ID"""
        task_id = str(uuid.uuid4())
        
        steps = [
            ProgressStep("파일 업로드", ProgressStatus.PENDING, 0, "파일 업로드 대기 중"),
            ProgressStep("텍스트 추출", ProgressStatus.PENDING, 0, "PDF 텍스트 추출 대기 중"),
            ProgressStep("AI 콘텐츠 생성", ProgressStatus.PENDING, 0, "AI 콘텐츠 생성 대기 중"),
            ProgressStep("데이터베이스 저장", ProgressStatus.PENDING, 0, "데이터베이스 저장 대기 중"),
        ]
        
        progress = ProcessingProgress(
            task_id=task_id,
            notebook_id=notebook_id,
            filename=filename,
            status=ProgressStatus.PENDING,
            overall_progress=0,
            current_step="파일 업로드",
            steps=steps,
            started_at=time.time()
        )
        
        with self._lock:
            self._tasks[task_id] = progress
        
        return task_id
    
    def update_step(self, task_id: str, step_name: str, status: ProgressStatus, 
                   progress: int, message: str, error: Optional[str] = None):
        """Update a specific step's progress"""
        with self._lock:
            if task_id not in self._tasks:
                return
            
            task = self._tasks[task_id]
            
            # Find and update the step
            for step in task.steps:
                if step.name == step_name:
                    step.status = status
                    step.progress = progress
                    step.message = message
                    step.error = error
                    
                    if status == ProgressStatus.PENDING and step.started_at is None:
                        step.started_at = time.time()
                    elif status in [ProgressStatus.COMPLETED, ProgressStatus.FAILED]:
                        step.completed_at = time.time()
                    
                    break
            
            # Update overall progress
            completed_steps = sum(1 for step in task.steps if step.status == ProgressStatus.COMPLETED)
            task.overall_progress = int((completed_steps / len(task.steps)) * 100)
            task.current_step = step_name
            
            # Update task status
            if status == ProgressStatus.FAILED:
                task.status = ProgressStatus.FAILED
                task.error = error
                task.completed_at = time.time()
            elif all(step.status == ProgressStatus.COMPLETED for step in task.steps):
                task.status = ProgressStatus.COMPLETED
                task.completed_at = time.time()
                task.overall_progress = 100
            else:
                task.status = status
    
    def set_result(self, task_id: str, result: Dict):
        """Set the final result for a completed task"""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id].result = result
    
    def get_progress(self, task_id: str) -> Optional[Dict]:
        """Get current progress for a task"""
        with self._lock:
            if task_id in self._tasks:
                return asdict(self._tasks[task_id])
            return None
    
    def get_all_tasks(self, notebook_id: Optional[int] = None) -> List[Dict]:
        """Get all tasks, optionally filtered by notebook_id"""
        with self._lock:
            tasks = list(self._tasks.values())
            if notebook_id is not None:
                tasks = [task for task in tasks if task.notebook_id == notebook_id]
            return [asdict(task) for task in tasks]
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Remove tasks older than max_age_hours"""
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        with self._lock:
            to_remove = []
            for task_id, task in self._tasks.items():
                if current_time - task.started_at > max_age_seconds:
                    to_remove.append(task_id)
            
            for task_id in to_remove:
                del self._tasks[task_id]

# Global progress tracker instance
progress_tracker = ProgressTracker()