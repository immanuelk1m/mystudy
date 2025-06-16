#!/usr/bin/env python3
"""
Database migration script to add indexes for query optimization.
Run this script to add indexes to existing database tables.
"""

import os
import sys
from sqlalchemy import create_engine, text
from database import DATABASE_URL

def add_indexes():
    """Add indexes to improve query performance."""
    engine = create_engine(DATABASE_URL)
    
    # List of index creation statements
    index_statements = [
        # Notebook table indexes
        "CREATE INDEX IF NOT EXISTS idx_notebooks_title ON notebooks(title);",
        "CREATE INDEX IF NOT EXISTS idx_notebooks_lastUpdated ON notebooks(lastUpdated);",
        "CREATE INDEX IF NOT EXISTS idx_notebook_title_updated ON notebooks(title, lastUpdated);",
        
        # Chapter table indexes
        "CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(\"order\");",
        "CREATE INDEX IF NOT EXISTS idx_chapters_notebook_id ON chapters(notebook_id);",
        "CREATE INDEX IF NOT EXISTS idx_chapter_notebook_order ON chapters(notebook_id, \"order\");",
        
        # File table indexes
        "CREATE INDEX IF NOT EXISTS idx_files_chapter_id ON files(chapter_id);",
        
        # Content table indexes
        "CREATE INDEX IF NOT EXISTS idx_contents_chapter_id ON contents(chapter_id);",
    ]
    
    try:
        with engine.connect() as connection:
            print("Adding database indexes for query optimization...")
            
            for statement in index_statements:
                print(f"Executing: {statement}")
                connection.execute(text(statement))
                
            connection.commit()
            print("✅ All indexes added successfully!")
            
    except Exception as e:
        print(f"❌ Error adding indexes: {e}")
        return False
    
    return True

def main():
    """Main function to run the migration."""
    print("🚀 Starting database index migration...")
    
    if add_indexes():
        print("🎉 Migration completed successfully!")
        return 0
    else:
        print("💥 Migration failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())