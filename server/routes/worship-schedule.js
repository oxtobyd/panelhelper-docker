import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Get worship schedule for a panel
router.get('/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    console.log('Fetching worship schedule for panel:', panelId);
    
    const result = await pool.query(
      'SELECT * FROM worship_schedule WHERE panel_id = $1',
      [panelId]
    );
    
    console.log('Query result:', result.rows);

    if (result.rows.length === 0) {
      console.log('No schedule found, returning default');
      return res.json({
        season: 'Ordinary',
        services: [
          {
            day: 'Day 1',
            time: '11:30',
            service_type: 'Opening Worship',
            leading: 'Panel Sec.',
            first_reader: '',
            second_reader: '',
            prayers: '',
            homily: '',
            first_reading: '',
            second_reading: '',
            hymns: '',
            notes: ''
          }
        ]
      });
    }

    const schedule = result.rows[0];
    console.log('Returning schedule:', schedule);
    res.json({
      season: schedule.season,
      services: schedule.services
    });
  } catch (error) {
    console.error('Error fetching worship schedule:', error);
    res.status(500).json({ error: 'Failed to fetch worship schedule' });
  }
});

// Create or update worship schedule
router.post('/:panelId', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { season, services } = req.body;

    // Check if schedule exists
    const existingSchedule = await pool.query(
      'SELECT id FROM worship_schedule WHERE panel_id = $1',
      [panelId]
    );

    let result;
    if (existingSchedule.rows.length > 0) {
      // Update existing schedule
      result = await pool.query(
        `UPDATE worship_schedule 
         SET season = $1, services = $2, updated_at = CURRENT_TIMESTAMP
         WHERE panel_id = $3
         RETURNING *`,
        [season, JSON.stringify(services), panelId]
      );
    } else {
      // Create new schedule
      result = await pool.query(
        `INSERT INTO worship_schedule (panel_id, season, services)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [panelId, season, JSON.stringify(services)]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving worship schedule:', error);
    res.status(500).json({ error: 'Failed to save worship schedule' });
  }
});

// Add this after the existing routes
router.post('/:panelId/copy', async (req, res) => {
  const { panelId } = req.params;
  const { source_panel_id } = req.body;

  console.log('Copy request received:', {
    targetPanelId: panelId,
    sourcePanelId: source_panel_id
  });

  try {
    // Fetch the source schedule
    const sourceScheduleResult = await pool.query(`
      SELECT * FROM worship_schedule WHERE panel_id = $1
    `, [source_panel_id]);

    if (sourceScheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Source worship schedule not found' });
    }

    const sourceSchedule = sourceScheduleResult.rows[0];

    // Ensure services is properly formatted
    const servicesJson = typeof sourceSchedule.services === 'string' 
      ? sourceSchedule.services 
      : JSON.stringify(sourceSchedule.services);

    // Insert the copied schedule
    const insertResult = await pool.query(`
      INSERT INTO worship_schedule (
        panel_id, 
        season,
        services
      ) VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (panel_id) 
      DO UPDATE SET 
        season = EXCLUDED.season,
        services = EXCLUDED.services,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      panelId,
      sourceSchedule.season,
      servicesJson
    ]);

    res.json(insertResult.rows[0]);
  } catch (error) {
    console.error('Detailed error information:', {
      message: error.message,
      name: error.name,
      code: error.code,
      detail: error.detail,
      schema: error.schema,
      table: error.table,
      constraint: error.constraint,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to copy worship schedule',
      detail: error.message,
      code: error.code,
      constraint: error.constraint
    });
  }
});

export default router; 