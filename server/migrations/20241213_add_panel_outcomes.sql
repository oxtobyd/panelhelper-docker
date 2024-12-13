-- Create panel_outcomes table
CREATE TABLE IF NOT EXISTS panel_outcomes (
    id SERIAL PRIMARY KEY,
    candidate_name VARCHAR(200),
    diocese_name VARCHAR(100),
    national_adviser_name VARCHAR(100),
    completed_date DATE,
    love_for_god INTEGER,
    call_to_ministry INTEGER,
    love_for_people INTEGER,
    wisdom INTEGER,
    fruitfulness INTEGER,
    potential INTEGER,
    panel_result_text TEXT,
    panel_name VARCHAR(50),
    raw_season VARCHAR(10),
    calculated_season VARCHAR(10),
    bishops_decision VARCHAR(50),
    bishops_note TEXT,
    candidate_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(candidate_id, panel_name)
);

-- Create import_history table
CREATE TABLE IF NOT EXISTS import_history (
    id SERIAL PRIMARY KEY,
    import_type VARCHAR(50) NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    error TEXT,
    filename VARCHAR(255),
    records_processed INTEGER,
    records_successful INTEGER,
    records_failed INTEGER
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_panel_outcomes_updated_at
    BEFORE UPDATE ON panel_outcomes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
