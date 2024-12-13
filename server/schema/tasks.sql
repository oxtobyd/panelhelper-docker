-- New tables for tasks and notes

-- Tasks table for both panels and carousels
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    panel_id BIGINT REFERENCES panels(id),
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('PANEL', 'CAROUSEL')),
    assigned_to VARCHAR(255)
);

-- Notes table for candidates and advisers
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    candidate_id BIGINT REFERENCES candidates(id),
    adviser_id BIGINT REFERENCES advisers(id),
    created_by VARCHAR(255),
    note_type VARCHAR(50) NOT NULL CHECK (note_type IN ('CANDIDATE', 'ADVISER'))
);

-- Indexes for better query performance
CREATE INDEX idx_tasks_panel_id ON tasks(panel_id);
CREATE INDEX idx_notes_candidate_id ON notes(candidate_id);
CREATE INDEX idx_notes_adviser_id ON notes(adviser_id);