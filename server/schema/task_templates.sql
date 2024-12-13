-- Task template tables
CREATE TABLE task_template_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('PANEL', 'CAROUSEL'))
);

CREATE TABLE task_templates (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES task_template_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    default_days_offset INTEGER,
    order_index INTEGER NOT NULL
);

-- Insert default categories and templates
INSERT INTO task_template_categories (name, type) VALUES
('Pre-Panel Setup', 'PANEL'),
('Panel Day', 'PANEL'),
('Post-Panel Tasks', 'PANEL'),
('Pre-Carousel Setup', 'CAROUSEL'),
('Carousel Day', 'CAROUSEL'),
('Post-Carousel Tasks', 'CAROUSEL');

-- Panel templates
INSERT INTO task_templates (category_id, title, description, default_days_offset, order_index) VALUES
(1, 'Send venue confirmation', 'Confirm venue booking and requirements', -14, 1),
(1, 'Distribute panel papers', 'Send necessary documentation to all participants', -7, 2),
(2, 'Room setup check', 'Ensure all rooms are properly set up', 0, 1),
(2, 'Welcome pack preparation', 'Prepare welcome packs for all attendees', 0, 2),
(3, 'Collect feedback forms', 'Gather all feedback forms from participants', 1, 1),
(3, 'Send thank you emails', 'Send thank you emails to all participants', 2, 2);

-- Carousel templates
INSERT INTO task_templates (category_id, title, description, default_days_offset, order_index) VALUES
(4, 'Schedule confirmation', 'Confirm schedule with all participants', -10, 1),
(4, 'Prepare materials', 'Prepare all necessary materials for carousel', -3, 2),
(5, 'Setup stations', 'Set up all carousel stations', 0, 1),
(5, 'Brief facilitators', 'Brief all facilitators on their roles', 0, 2),
(6, 'Compile evaluations', 'Compile all station evaluations', 1, 1),
(6, 'Update records', 'Update participant records with outcomes', 2, 2);