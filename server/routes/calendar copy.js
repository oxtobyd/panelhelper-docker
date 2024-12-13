import express from 'express';
import ical from 'ical-generator';
import { pool } from '../db.js';

const router = express.Router();

router.get('/tasks/:secretaryName.ics', async (req, res) => {
  const { secretaryName } = req.params;
  
  try {
    console.log('Executing query for secretary:', secretaryName);
    const result = await pool.query(`
      SELECT 
        t.*,
        p.panel_name,
        p.panel_date,
        p.panel_type,
        ps.name as panel_secretary
      FROM tasks t
      JOIN panels p ON t.panel_id = p.id
      JOIN panel_attendees pa ON p.id = pa.panel_id AND pa.attendee_type = 'S'
      JOIN panel_secretaries ps ON pa.attendee_id = ps.id
      WHERE ps.name = $1
      AND t.due_date >= NOW() - INTERVAL '9 days'
      ORDER BY t.due_date ASC
    `, [secretaryName]);

    const calendar = ical({
      name: `Panel Tasks - ${secretaryName}`,
      timezone: 'Europe/London',
      url: `https://helper.oxtobyhome.co.uk/api/calendar/tasks/${encodeURIComponent(secretaryName)}.ics`
    });

    result.rows.forEach(task => {
      calendar.createEvent({
        start: new Date(task.due_date),
        end: new Date(task.due_date),
        summary: `${task.title} - ${task.panel_name}`,
        description: task.description,
        location: task.panel_type,
        allDay: true
      });
    });
    
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(calendar.toString());
  } catch (error) {

    res.status(500).json({ 
      error: error.message || 'Failed to generate calendar',
      details: error.stack
    });
  }
});

export default router; 