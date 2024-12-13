import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tasksRouter from './routes/tasks.js';
import panelsRouter from './routes/panels.js';
import candidatesRouter from './routes/candidates.js';
import worshipScheduleRouter from './routes/worship-schedule.js';
import analyticsRouter from './routes/analytics.js';
import calendarRouter from './routes/calendar.js';
import reportsRouter from './routes/reports.js';
import importRouter from './routes/import.js';

import { pool } from './db.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/tasks', tasksRouter);
app.use('/api/panels', panelsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/worship-schedule', worshipScheduleRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/import', importRouter);
console.log('Calendar routes registered');

// Add a catch-all route for debugging
app.use((req, res, next) => {
  console.log('Request received:', {
    method: req.method,
    path: req.path,
    params: req.params
  });
  next();
});

// Move this BEFORE the '/:id' route to prevent conflicts
app.get('/api/panels/with-tasks', async (req, res) => {
  try {
    console.log('Fetching panels with tasks...');
    
    const result = await pool.query(`
      WITH panel_counts AS (
        SELECT 
          panel_id,
          COUNT(DISTINCT CASE WHEN attendee_type = 'C' THEN attendee_id END) as candidate_count,
          COUNT(DISTINCT CASE WHEN attendee_type = 'A' THEN attendee_id END) as adviser_count
        FROM panel_attendees
        GROUP BY panel_id
      )
      SELECT 
        p.id,
        p.panel_name,
        p.panel_date,
        p.panel_type,
        ps.name as panel_secretary,
        ps.email as secretary_email,
        pc.candidate_count,
        pc.adviser_count,
        COALESCE(
          json_agg(
            CASE WHEN t.id IS NOT NULL THEN
              json_build_object(
                'id', t.id,
                'title', t.title,
                'description', t.description,
                'due_date', t.due_date,
                'completed', t.completed,
                'task_type', t.task_type
              )
            ELSE NULL END
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tasks,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.completed THEN t.id END) as completed_tasks
      FROM panels p
      LEFT JOIN panel_counts pc ON p.id = pc.panel_id
      LEFT JOIN panel_attendees pa_s ON p.id = pa_s.panel_id AND pa_s.attendee_type = 'S'
      LEFT JOIN panel_secretaries ps ON pa_s.attendee_id = ps.id
      LEFT JOIN tasks t ON p.id = t.panel_id
      GROUP BY 
        p.id, 
        p.panel_name, 
        p.panel_date, 
        p.panel_type, 
        ps.name, 
        ps.email,
        pc.candidate_count,
        pc.adviser_count
      ORDER BY p.panel_date DESC
    `);

    console.log('Query completed, found panels:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching panels with tasks:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all panels with related information
app.get('/api/panels', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        v.name as venue_name,
        COUNT(DISTINCT pa_c.id) as candidate_count,
        COUNT(DISTINCT pa_a.id) as adviser_count,
        calculate_season(p.panel_date) as calculated_season
      FROM panels p
      LEFT JOIN panel_venues v ON p.venue_id = v.id
      LEFT JOIN panel_attendees pa_c ON p.id = pa_c.panel_id AND pa_c.attendee_type = 'C'
      LEFT JOIN panel_attendees pa_a ON p.id = pa_a.panel_id AND pa_a.attendee_type = 'A'
      GROUP BY p.id, v.name
      ORDER BY p.panel_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get panel details including attendees
app.get('/api/panels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get panel details with venue info
    const panelResult = await pool.query(`
      SELECT 
        p.*,
        v.name as venue_name,
        p.panel_type
      FROM panels p
      LEFT JOIN panel_venues v ON p.venue_id = v.id
      WHERE p.id = $1
    `, [id]);

    // Get attendees including secretary info
    const attendeesResult = await pool.query(`
      SELECT 
        pa.*,
        CASE 
          WHEN pa.attendee_type = 'C' THEN c.forenames || ' ' || c.surname
          WHEN pa.attendee_type = 'A' THEN a.forenames || ' ' || a.surname
          WHEN pa.attendee_type = 'S' THEN ps.name
        END as attendee_name,
        CASE
          WHEN pa.attendee_type = 'C' THEN c.email
          WHEN pa.attendee_type = 'A' THEN a.email
          WHEN pa.attendee_type = 'S' THEN ps.email
        END as email,
        CASE
          WHEN pa.attendee_type = 'S' THEN ps.tel
        END as secretary_tel,
        CASE
          WHEN pa.attendee_type = 'C' THEN c.sponsored_ministry
        END as sponsored_ministry,
        pa.mfa_or_pfa,
        pa.mp1_or_2,
        pa.attendee_team,
        CASE
          WHEN pa.attendee_type = 'A' THEN (
            SELECT COUNT(DISTINCT prev_pa.panel_id)
            FROM panel_attendees prev_pa
            JOIN panels prev_p ON prev_pa.panel_id = prev_p.id
            WHERE prev_pa.attendee_id = pa.attendee_id
            AND prev_pa.attendee_type = 'A'
            AND prev_p.panel_date < p.panel_date
            AND prev_p.panel_type = p.panel_type
          )
        END as previous_panels_count
      FROM panel_attendees pa
      LEFT JOIN candidates c ON pa.attendee_id = c.id AND pa.attendee_type = 'C'
      LEFT JOIN advisers a ON pa.attendee_id = a.id AND pa.attendee_type = 'A'
      LEFT JOIN panel_secretaries ps ON pa.attendee_id = ps.id AND pa.attendee_type = 'S'
      JOIN panels p ON pa.panel_id = p.id
      WHERE pa.panel_id = $1
      ORDER BY 
        CASE 
          WHEN pa.attendee_type = 'A' THEN 0
          ELSE 1
        END,
        pa.attendee_team NULLS LAST,
        CASE 
          WHEN pa.mfa_or_pfa = 'MFA' THEN 1
          WHEN pa.mfa_or_pfa = 'PFA' THEN 2
          ELSE 3
        END,
        CASE 
          WHEN pa.mp1_or_2 = 'MP1' THEN 1
          WHEN pa.mp1_or_2 = 'MP2' THEN 2
          ELSE 3
        END,
        attendee_name
    `, [id]);
    
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE panel_id = $1 ORDER BY due_date',
      [id]
    );
    
    // Find secretary in attendees
    const secretary = attendeesResult.rows.find(a => a.attendee_type === 'S');
    
    res.json({
      panel: panelResult.rows[0],
      secretary: secretary || null,
      attendees: attendeesResult.rows.filter(a => a.attendee_type !== 'S'),
      tasks: tasksResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add this after the existing panel routes
app.patch('/api/tasks/:id/toggle-complete', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE tasks 
      SET 
        completed = NOT completed,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling task completion:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});