import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('Starting analytics data fetch...');

    // Get panels by type
    console.log('Fetching panels by type...');
    const panelsByType = await pool.query(`
      SELECT 
        COALESCE(panel_type, 'Unspecified') as type, 
        COUNT(*) as count
      FROM panels
      GROUP BY panel_type
    `);
    console.log('Panels by type:', panelsByType.rows);

    // Get panels and candidates by month using panel_attendees
    console.log('Fetching monthly data...');
    const panelsByMonth = await pool.query(`
      SELECT 
        TO_CHAR(p.panel_date, 'Mon YYYY') as month,
        COUNT(DISTINCT p.id) as panels,
        COUNT(DISTINCT CASE WHEN pa.attendee_type = 'C' THEN pa.attendee_id END) as candidates
      FROM panels p
      LEFT JOIN panel_attendees pa ON p.id = pa.panel_id
      WHERE p.panel_date >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(p.panel_date, 'Mon YYYY'), DATE_TRUNC('month', p.panel_date)
      ORDER BY DATE_TRUNC('month', MIN(p.panel_date))
    `);
    console.log('Panels by month:', panelsByMonth.rows);

    // Get venue utilization
    console.log('Fetching venue data...');
    const venueUtilization = await pool.query(`
      SELECT 
        COALESCE(v.name, 'Unknown') as venue,
        COUNT(p.id) as count
      FROM panels p
      LEFT JOIN panel_venues v ON p.venue_id = v.id
      GROUP BY v.name
      ORDER BY count DESC
      LIMIT 10
    `);
    console.log('Venue utilization:', venueUtilization.rows);

    // Get task completion status
    console.log('Fetching task data...');
    const taskCompletion = await pool.query(`
      SELECT 
        CASE WHEN completed THEN 'Completed' ELSE 'Pending' END as status,
        COUNT(*) as count
      FROM tasks
      GROUP BY completed
    `);
    console.log('Task completion:', taskCompletion.rows);

    const analyticsData = {
      panelsByType: panelsByType.rows,
      panelsByMonth: panelsByMonth.rows,
      venueUtilization: venueUtilization.rows,
      taskCompletion: taskCompletion.rows
    };

    console.log('Successfully compiled analytics data:', analyticsData);
    res.json(analyticsData);

  } catch (error) {
    console.error('Detailed error in analytics:', {
      message: error.message,
      stack: error.stack,
      query: error.query,
      code: error.code,
      detail: error.detail
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch analytics data',
      detail: error.message,
      code: error.code
    });
  }
});

export default router; 