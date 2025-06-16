"""
Performance monitoring utilities for database queries.
"""

import time
import logging
from functools import wraps
from typing import Callable, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

# Configure logging for performance monitoring
logging.basicConfig(level=logging.INFO)
performance_logger = logging.getLogger("performance")

def monitor_query_performance(func: Callable) -> Callable:
    """Decorator to monitor database query performance."""
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Log slow queries (> 1 second)
            if execution_time > 1.0:
                performance_logger.warning(
                    f"Slow query detected: {func.__name__} took {execution_time:.2f}s"
                )
            else:
                performance_logger.info(
                    f"Query {func.__name__} executed in {execution_time:.3f}s"
                )
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            performance_logger.error(
                f"Query {func.__name__} failed after {execution_time:.3f}s: {str(e)}"
            )
            raise
    
    return wrapper

def analyze_query_plan(db: Session, query_sql: str) -> dict:
    """Analyze the execution plan of a SQL query."""
    try:
        # Get query execution plan
        explain_query = f"EXPLAIN QUERY PLAN {query_sql}"
        result = db.execute(text(explain_query))
        
        plan_lines = []
        for row in result:
            plan_lines.append(str(row))
        
        return {
            "query": query_sql,
            "execution_plan": plan_lines,
            "analysis": _analyze_plan_performance(plan_lines)
        }
        
    except Exception as e:
        return {
            "query": query_sql,
            "error": str(e),
            "execution_plan": [],
            "analysis": {"warning": "Could not analyze query plan"}
        }

def _analyze_plan_performance(plan_lines: list) -> dict:
    """Analyze query plan for performance issues."""
    analysis = {
        "has_table_scan": False,
        "uses_index": False,
        "recommendations": []
    }
    
    plan_text = " ".join(plan_lines).lower()
    
    # Check for table scans
    if "scan table" in plan_text:
        analysis["has_table_scan"] = True
        analysis["recommendations"].append("Consider adding indexes to avoid table scans")
    
    # Check for index usage
    if "using index" in plan_text or "search using" in plan_text:
        analysis["uses_index"] = True
    else:
        analysis["recommendations"].append("Query may benefit from additional indexes")
    
    # Check for sorting
    if "use temp b-tree for order by" in plan_text:
        analysis["recommendations"].append("Consider adding index on ORDER BY columns")
    
    return analysis

def get_database_stats(db: Session) -> dict:
    """Get database statistics for performance monitoring."""
    try:
        stats = {}
        
        # Table sizes
        tables = ["notebooks", "chapters", "files", "contents"]
        for table in tables:
            count_query = f"SELECT COUNT(*) FROM {table}"
            result = db.execute(text(count_query))
            stats[f"{table}_count"] = result.scalar()
        
        # Index usage (SQLite specific)
        try:
            index_query = "SELECT name FROM sqlite_master WHERE type='index'"
            result = db.execute(text(index_query))
            stats["indexes"] = [row[0] for row in result]
        except:
            stats["indexes"] = []
        
        return stats
        
    except Exception as e:
        return {"error": str(e)}

class QueryProfiler:
    """Context manager for profiling database queries."""
    
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.start_time = None
        
    def __enter__(self):
        self.start_time = time.time()
        performance_logger.info(f"Starting operation: {self.operation_name}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        execution_time = time.time() - self.start_time
        
        if exc_type is None:
            performance_logger.info(
                f"Operation {self.operation_name} completed in {execution_time:.3f}s"
            )
        else:
            performance_logger.error(
                f"Operation {self.operation_name} failed after {execution_time:.3f}s: {exc_val}"
            )

# Example usage:
# @monitor_query_performance
# def my_database_function(db: Session):
#     return db.query(Model).all()
#
# with QueryProfiler("complex_operation"):
#     result = complex_database_operation()