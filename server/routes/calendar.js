import express from 'express';
import ical from 'ical-generator';
import { pool } from '../db.js';

const router = express.Router();

// Helper function to add working days to a date
const addWorkingDays = (date, days) => {
  const result = new Date(date);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysAdded++;
    }
  }
  return result;
};

// Helper function to move weekend dates to previous Friday
const adjustWeekendDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 0) { // Sunday
    d.setDate(d.getDate() - 2);
  } else if (day === 6) { // Saturday
    d.setDate(d.getDate() - 1);
  }
  return d;
};

router.get('/tasks/:secretaryName.ics', async (req, res) => {
  const { secretaryName } = req.params;
  
  try {
    console.log('Executing query for secretary:', secretaryName);
    // Get tasks
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

    // Get panels/carousels
    const panelsResult = await pool.query(`
      SELECT 
        p.*,
        ps.name as panel_secretary
      FROM panels p
      JOIN panel_attendees pa ON p.id = pa.panel_id AND pa.attendee_type = 'S'
      JOIN panel_secretaries ps ON pa.attendee_id = ps.id
      WHERE ps.name = $1
      AND p.panel_date >= NOW() - INTERVAL '9 days'
      ORDER BY p.panel_date ASC
    `, [secretaryName]);

    const calendar = ical({
      name: `Panel Tasks - ${secretaryName}`,
      timezone: 'Europe/London',
      url: `https://helper.oxtobyhome.co.uk/api/calendar/tasks/${encodeURIComponent(secretaryName)}.ics`
    });

    // Add tasks
    result.rows.forEach(task => {
      let startDate = new Date(task.due_date);
      let endDate = new Date(task.end_date);
      
      // If start date is a weekend, move to next Monday
      const startDay = startDate.getDay();
      if (startDay === 0) { // Sunday
        startDate.setDate(startDate.getDate() + 1); // Move to Monday
      } else if (startDay === 6) { // Saturday
        startDate.setDate(startDate.getDate() + 2); // Move to Monday
      }
      
      // Adjust end date if needed to maintain task duration
      if (startDay === 0 || startDay === 6) {
        const duration = Math.ceil((endDate - new Date(task.due_date)) / (1000 * 60 * 60 * 24));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + duration);
      }
    
      calendar.createEvent({
        start: startDate,
        end: endDate,
        summary: `${task.title} - ${task.panel_name}`,
        description: task.description,
        location: task.panel_type,
        allDay: true
      });
    });

    // Add DDO meetings task
    panelsResult.rows.forEach(panel => {
      const startDate = new Date(panel.panel_date);
      const endDate = new Date(panel.panel_date);
      
      if (panel.panel_type === 'Panel') {
        // For panels, create a 3-day event
        endDate.setDate(endDate.getDate() + 3); // Add 2 days to make it 3 days total

        // Add DDO Meeting event
        const ddoMeetingDate = addWorkingDays(endDate, 5);
        const ddoMeetingStart = new Date(ddoMeetingDate);
        const ddoMeetingEnd = new Date(ddoMeetingDate);
        
        // Set the meeting times (15:30 to 19:30)
        ddoMeetingStart.setHours(15, 30, 0);
        ddoMeetingEnd.setHours(19, 30, 0);

        calendar.createEvent({
          start: ddoMeetingStart,
          end: ddoMeetingEnd,
          summary: `DDO Meeting - ${panel.panel_name}`,
          description: 'Panel DDO Meeting',
          location: panel.venue_name,
          allDay: false
        });
      } else {
      }

      // Add the original panel/carousel event
      calendar.createEvent({
        start: startDate,
        end: endDate,
        summary: panel.panel_name,
        description: panel.panel_type,
        location: panel.venue_name,
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