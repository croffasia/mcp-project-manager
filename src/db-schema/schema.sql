-- MCP Task Manager Database Schema
-- Tables for storing ideas, epics, tasks, bugs, and research items

CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('idea', 'epic', 'task', 'bug', 'research')),
    parent_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'done', 'blocked', 'deferred')),
    dependencies TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES entities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS progress_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    type TEXT DEFAULT 'update' CHECK (type IN ('update', 'comment', 'blocker', 'completion')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_parent_id ON entities(parent_id);
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_priority ON entities(priority);
CREATE INDEX IF NOT EXISTS idx_progress_notes_entity_id ON progress_notes(entity_id);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_entities_updated_at
    AFTER UPDATE ON entities
    FOR EACH ROW
    BEGIN
        UPDATE entities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;