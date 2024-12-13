import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Add this BEFORE the '/:id' route
router.get('/with-worship-schedule', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.panel_name, p.panel_date, p.panel_type
      FROM worship_schedule ws
      JOIN panels p ON ws.panel_id = p.id
      ORDER BY p.panel_date DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching panels with worship schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all panels with their tasks
router.get('/with-tasks', async (req, res) => {
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
        v.name as venue_name,
        ps.name as panel_secretary,
        ps.email as secretary_email,
        pc.candidate_count,
        pc.adviser_count,
        calculate_season(p.panel_date) as calculated_season,
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
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.completed THEN 1 END) as completed_tasks
      FROM panels p
      LEFT JOIN panel_venues v ON p.venue_id = v.id
      LEFT JOIN panel_counts pc ON p.id = pc.panel_id
      LEFT JOIN panel_attendees pa ON p.id = pa.panel_id AND pa.attendee_type = 'S'
      LEFT JOIN panel_secretaries ps ON pa.attendee_id = ps.id
      LEFT JOIN tasks t ON p.id = t.panel_id
      GROUP BY 
        p.id, 
        p.panel_name, 
        p.panel_date, 
        p.panel_type, 
        v.name, 
        ps.name, 
        ps.email,
        pc.candidate_count,
        pc.adviser_count
      ORDER BY p.panel_date DESC
    `);

    console.log('Sample panel data:', JSON.stringify(result.rows[0], null, 2));
    res.json(result.rows);
  } catch (err) {
    console.error('Error details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get subjects
router.get('/subjects', async (req, res) => {
  try {
    console.log('Attempting to fetch subjects...');
    const result = await pool.query(`
      SELECT id, name, code, designation 
      FROM subjects 
      ORDER BY name
    `);
    
    console.log('Subjects result:', result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get advisers for a panel
router.get('/:panelId/advisers', async (req, res) => {
  try {
    const { panelId } = req.params;
    const result = await pool.query(`
      SELECT 
        a.id,
        a.forenames || ' ' || a.surname as name,
        pa.attendee_team as team
      FROM panel_attendees pa
      JOIN advisers a ON pa.attendee_id = a.id
      WHERE pa.panel_id = $1 AND pa.attendee_type = 'A'
      ORDER BY pa.attendee_team, name
    `, [panelId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get candidates grouped by team
router.get('/:panelId/candidates-grouped', async (req, res) => {
  try {
    const { panelId } = req.params;
    console.log('Fetching candidates with scores for panel:', panelId);
    
    const result = await pool.query(`
      WITH candidate_scores AS (
        SELECT 
          acs.candidate_id,
          acs.adviser_id,
          json_agg(json_build_object(
            'subject_id', acs.subject_id,
            'score', acs.score
          )) as scores
        FROM adviser_candidate_scores acs
        WHERE acs.panel_id = $1
        GROUP BY acs.candidate_id, acs.adviser_id
      )
      SELECT 
        pa.attendee_team as team,
        json_agg(json_build_object(
          'id', c.id,
          'name', c.forenames || ' ' || c.surname,
          'scores', COALESCE(
            (SELECT cs.scores FROM candidate_scores cs WHERE cs.candidate_id = c.id),
            '[]'::json
          )
        )) as candidates
      FROM panel_attendees pa
      JOIN candidates c ON pa.attendee_id = c.id
      WHERE pa.panel_id = $1 AND pa.attendee_type = 'C'
      GROUP BY pa.attendee_team
      ORDER BY pa.attendee_team
    `, [panelId]);
    
    console.log('Candidates with scores:', JSON.stringify(result.rows, null, 2));
    
    const groupedByTeam = result.rows.reduce((acc, row) => {
      acc[row.team] = row.candidates;
      return acc;
    }, {});
    
    res.json(groupedByTeam);
  } catch (err) {
    console.error('Error fetching candidates:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add or update a score
router.post('/scores', async (req, res) => {
  try {
    console.log('Received score update request:', req.body);
    const { panel_id, adviser_id, candidate_id, subject_id, score } = req.body;
    
    // Convert string IDs to BigInt
    const panelIdBigInt = BigInt(panel_id);
    const adviserIdBigInt = BigInt(adviser_id);
    const candidateIdBigInt = BigInt(candidate_id);
    const subjectIdBigInt = BigInt(subject_id);
    
    // Validate inputs
    if (!panel_id || !adviser_id || !candidate_id || !subject_id || score === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { panel_id, adviser_id, candidate_id, subject_id, score }
      });
    }
    
    const result = await pool.query(`
      INSERT INTO adviser_candidate_scores 
        (panel_id, adviser_id, candidate_id, subject_id, score)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (panel_id, adviser_id, candidate_id, subject_id)
      DO UPDATE SET 
        score = EXCLUDED.score,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [panelIdBigInt, adviserIdBigInt, candidateIdBigInt, subjectIdBigInt, score]);
    
    console.log('Score updated successfully:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating score:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail
    });
    res.status(500).json({ 
      error: err.message,
      detail: err.detail,
      code: err.code 
    });
  }
});

// Get all panels
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all panels...');
    
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
        v.name as venue_name,
        ps.name as panel_secretary,
        ps.email as secretary_email,
        pc.candidate_count,
        pc.adviser_count,
        calculate_season(p.panel_date) as calculated_season
      FROM panels p
      LEFT JOIN panel_venues v ON p.venue_id = v.id
      LEFT JOIN panel_counts pc ON p.id = pc.panel_id
      LEFT JOIN panel_attendees pa ON p.id = pa.panel_id AND pa.attendee_type = 'S'
      LEFT JOIN panel_secretaries ps ON pa.attendee_id = ps.id
      ORDER BY p.panel_date DESC
    `);

    console.log('Sample panel data:', result.rows[0]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single panel with all its details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching panel details for:', id);

    // Get panel details
    const panelResult = await pool.query(`
      SELECT p.*, v.name as venue_name
      FROM panels p
      LEFT JOIN panel_venues v ON p.venue_id = v.id
      WHERE p.id = $1
    `, [id]);

    // Get attendees with scores
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
          WHEN pa.attendee_type = 'C' THEN c.sponsored_ministry
        END as sponsored_ministry,
        d.diocese_name,
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
            AND prev_p.panel_type = p.panel_type
            AND prev_p.panel_date < p.panel_date
          )
        END as previous_panels_count
      FROM panel_attendees pa
      LEFT JOIN candidates c ON pa.attendee_id = c.id AND pa.attendee_type = 'C'
      LEFT JOIN advisers a ON pa.attendee_id = a.id AND pa.attendee_type = 'A'
      LEFT JOIN panel_secretaries ps ON pa.attendee_id = ps.id AND pa.attendee_type = 'S'
      LEFT JOIN diocese d ON pa.attendee_diocese_id = d.id
      JOIN panels p ON pa.panel_id = p.id
      WHERE pa.panel_id = $1
      ORDER BY 
        pa.attendee_type,
        pa.attendee_team,
        CASE 
          WHEN pa.mfa_or_pfa = 'M' THEN 1
          WHEN pa.mfa_or_pfa = 'P' THEN 2
          ELSE 3
        END,
        CASE 
          WHEN pa.mp1_or_2 = '1' THEN 1
          WHEN pa.mp1_or_2 = '2' THEN 2
          ELSE 3
        END,
        attendee_name
    `, [id]);

    // Get tasks
    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE panel_id = $1 ORDER BY due_date',
      [id]
    );
    
    // Find secretary in attendees
    const secretary = attendeesResult.rows.find(a => a.attendee_type === 'S');
    
    console.log('Attendees with scores:', JSON.stringify(attendeesResult.rows, null, 2));

    res.json({
      panel: panelResult.rows[0],
      secretary: secretary || null,
      attendees: attendeesResult.rows,
      tasks: tasksResult.rows
    });
  } catch (err) {
    console.error('Error fetching panel details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get subjects for an adviser
router.get('/:panelId/adviser/:adviserId/subjects', async (req, res) => {
  try {
    const { panelId, adviserId } = req.params;
    
    const adviserResult = await pool.query(`
      SELECT 
        CASE 
          WHEN mfa_or_pfa = 'M' THEN 'MFA'
          WHEN mfa_or_pfa = 'P' THEN 'PFA'
        END || mp1_or_2 as designation
      FROM panel_attendees
      WHERE panel_id = $1 
      AND attendee_id = $2 
      AND attendee_type = 'A'
    `, [panelId, adviserId]);

    if (adviserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Adviser not found in panel' });
    }

    const { designation } = adviserResult.rows[0];
    console.log(`Fetching subjects for adviser ${adviserId} with designation ${designation}`);

    const subjectsResult = await pool.query(`
      SELECT id, name, code 
      FROM subjects 
      WHERE designation = $1
      ORDER BY id ASC
    `, [designation]);

    console.log(`Found ${subjectsResult.rows.length} subjects for designation ${designation}`);
    res.json(subjectsResult.rows);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get scores for a panel
router.get('/:panelId/scores', async (req, res) => {
  try {
    const { panelId } = req.params;
    const panelIdBigInt = BigInt(panelId);
    
    const result = await pool.query(`
      SELECT * FROM adviser_candidate_scores 
      WHERE panel_id = $1
    `, [panelIdBigInt]);
    
    console.log('Fetched scores for panel:', result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get adviser preferences for a panel
router.get('/:panelId/adviser-preferences', async (req, res) => {
  try {
    const { panelId } = req.params;
    const result = await pool.query(`
      SELECT 
        app.*,
        a.forenames || ' ' || a.surname as adviser_name
      FROM adviser_panel_preferences app
      JOIN advisers a ON app.adviser_id = a.id
      WHERE app.panel_id = $1
    `, [panelId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching adviser preferences:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update adviser preferences
router.post('/:panelId/adviser-preferences', async (req, res) => {
  const client = await pool.connect();
  try {
    const { panelId } = req.params;
    const { adviserId, arriveNightBefore, eveningMeal, arrivalTime } = req.body;

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO adviser_panel_preferences 
        (panel_id, adviser_id, arrive_night_before, evening_meal, arrival_time)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (panel_id, adviser_id) 
      DO UPDATE SET 
        arrive_night_before = EXCLUDED.arrive_night_before,
        evening_meal = EXCLUDED.evening_meal,
        arrival_time = EXCLUDED.arrival_time,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [panelId, adviserId, arriveNightBefore, eveningMeal, arrivalTime]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating adviser preferences:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get panel note
router.get('/:panelId/note', async (req, res) => {
  try {
    const { panelId } = req.params;
    const result = await pool.query(`
      SELECT * FROM panel_notes 
      WHERE panel_id = $1
    `, [panelId]);
    
    res.json(result.rows[0] || { content: '' });
  } catch (err) {
    console.error('Error fetching panel note:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update panel note
router.post('/:panelId/note', async (req, res) => {
  const client = await pool.connect();
  try {
    const { panelId } = req.params;
    const { content } = req.body;

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO panel_notes (panel_id, content)
      VALUES ($1, $2)
      ON CONFLICT (panel_id) 
      DO UPDATE SET 
        content = EXCLUDED.content,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [panelId, content]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating panel note:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get DDO meetings for a panel
router.get('/:panelId/ddo-meetings', async (req, res) => {
  const { panelId } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // First ensure we have candidate_records for all candidates in this panel
    await client.query(`
      INSERT INTO candidate_records (candidate_id)
      SELECT DISTINCT pa.attendee_id
      FROM panel_attendees pa
      WHERE pa.panel_id = $1 
      AND pa.attendee_type = 'C'
      AND NOT EXISTS (
        SELECT 1 FROM candidate_records cr 
        WHERE cr.candidate_id = pa.attendee_id
      )
    `, [panelId]);

    // Now fetch the DDO meetings
    const result = await client.query(`
      WITH panel_candidates AS (
        SELECT 
          pa.attendee_id as candidate_id,
          c.forenames || ' ' || c.surname as candidate_name,
          cr.ddo_named_on_report as ddo_name,
          cr.ddo_email as ddo_email,
          COALESCE(cr.ddo_meeting_date, NULL) as ddo_meeting_date,
          COALESCE(cr.ddo_meeting_attendees, ARRAY[]::text[]) as ddo_meeting_attendees,
          COALESCE(cr.ddo_meeting_notes, '') as ddo_meeting_notes,
          COALESCE(cr.ddo_meeting_status, 'pending') as ddo_meeting_status
        FROM panel_attendees pa
        JOIN candidates c ON c.id = pa.attendee_id
        LEFT JOIN candidate_records cr ON cr.candidate_id = pa.attendee_id
        WHERE pa.panel_id = $1 
        AND pa.attendee_type = 'C'
      )
      SELECT * FROM panel_candidates
      ORDER BY candidate_name
    `, [panelId]);

    await client.query('COMMIT');
    res.json(result.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Detailed error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch DDO meetings',
      details: err.message,
      hint: err.hint,
      position: err.position
    });
  } finally {
    client.release();
  }
});

// Update DDO meeting details
router.post('/:panelId/ddo-meetings/:candidateId', async (req, res) => {
  const { candidateId } = req.params;
  const { 
    ddo_meeting_date,
    ddo_meeting_attendees,
    ddo_meeting_notes,
    ddo_meeting_status 
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE candidate_records
      SET 
        ddo_meeting_date = $1,
        ddo_meeting_attendees = $2,
        ddo_meeting_notes = $3,
        ddo_meeting_status = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE candidate_id = $5
      RETURNING *
    `, [
      ddo_meeting_date,
      ddo_meeting_attendees,
      ddo_meeting_notes,
      ddo_meeting_status,
      candidateId
    ]);

    if (result.rows.length === 0) {
      // If no record exists, create one
      const insertResult = await pool.query(`
        INSERT INTO candidate_records (
          candidate_id,
          ddo_meeting_date,
          ddo_meeting_attendees,
          ddo_meeting_notes,
          ddo_meeting_status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        candidateId,
        ddo_meeting_date,
        ddo_meeting_attendees,
        ddo_meeting_notes,
        ddo_meeting_status
      ]);
      
      res.json(insertResult.rows[0]);
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error updating DDO meeting:', err);
    res.status(500).json({ error: 'Failed to update DDO meeting' });
  }
});

// Add this route to handle copying worship schedules
router.post('/worship-schedule/:id/copy', async (req, res) => {
  const { id } = req.params;
  const { source_panel_id } = req.body;

  try {
    // Fetch the worship schedule from the source panel
    const sourceScheduleResult = await pool.query(`
      SELECT * FROM worship_schedule WHERE panel_id = $1
    `, [source_panel_id]);

    if (sourceScheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Source worship schedule not found' });
    }

    const sourceSchedule = sourceScheduleResult.rows[0];

    // Insert the copied schedule into the target panel
    const insertResult = await pool.query(`
      INSERT INTO worship_schedule (panel_id, day, time, service_type, leading, first_reader, second_reader, prayers, homily, first_reading, second_reading, hymns, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id,
      sourceSchedule.day,
      sourceSchedule.time,
      sourceSchedule.service_type,
      sourceSchedule.leading,
      sourceSchedule.first_reader,
      sourceSchedule.second_reader,
      sourceSchedule.prayers,
      sourceSchedule.homily,
      sourceSchedule.first_reading,
      sourceSchedule.second_reading,
      sourceSchedule.hymns,
      sourceSchedule.notes
    ]);

    res.json(insertResult.rows[0]);
  } catch (error) {
    console.error('Error copying worship schedule:', error);
    res.status(500).json({ error: 'Failed to copy worship schedule' });
  }
});

// Get print items for a panel
// Get print items for a panel
router.get('/:panelId/print-items', async (req, res) => {
  try {
    const { panelId } = req.params;
    const result = await pool.query(
      'SELECT * FROM panel_print_items WHERE panel_id = $1 ORDER BY id',
      [panelId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch print items' });
  }
});

// Update print item (handles both checkbox and sides updates)
router.patch('/:panelId/print-items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { adviser_printed, candidate_printed, sides_printed } = req.body;
    
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (adviser_printed !== undefined) {
      updateFields.push(`adviser_printed = $${paramCount}`);
      values.push(adviser_printed);
      paramCount++;
    }
    
    if (candidate_printed !== undefined) {
      updateFields.push(`candidate_printed = $${paramCount}`);
      values.push(candidate_printed);
      paramCount++;
    }
    
    if (sides_printed !== undefined) {
      updateFields.push(`sides_printed = $${paramCount}`);
      values.push(sides_printed);
      paramCount++;
    }

    values.push(itemId); // For the WHERE clause

    const query = `
      UPDATE panel_print_items 
      SET ${updateFields.join(', ')},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Print item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update print item' });
  }
});

// Initialize print items for a new panel (if needed)
router.post('/:panelId/print-items/init', async (req, res) => {
  try {
    const { panelId } = req.params;
    const { items } = req.body;
    
    // First check if items already exist
    const existing = await pool.query(
      'SELECT COUNT(*) FROM panel_print_items WHERE panel_id = $1',
      [panelId]
    );

    if (existing.rows[0].count > 0) {
      return res.json(await pool.query(
        'SELECT * FROM panel_print_items WHERE panel_id = $1 ORDER BY id',
        [panelId]
      ));
    }

    // Insert all items
    const values = items.map((item, index) => 
      `($1, $${index * 2 + 2}, $${index * 2 + 3})`
    ).join(', ');
    
    const flatParams = items.reduce((acc, item) => [
      ...acc, 
      item.item_name, 
      item.sides_printed
    ], [panelId]);

    const result = await pool.query(`
      INSERT INTO panel_print_items 
        (panel_id, item_name, sides_printed)
      VALUES 
        ${values}
      RETURNING *
    `, flatParams);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to initialize print items' });
  }
});

router.get('/:panelId/candidate-records', async (req, res) => {
  try {
    const { panelId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.forenames || ' ' || c.surname as attendee_name,
        cr.notes,
        cr.disabilities
      FROM panel_attendees pa
      JOIN candidates c ON c.id = pa.attendee_id
      LEFT JOIN candidate_records cr ON cr.candidate_id = c.id
      WHERE pa.panel_id = $1 
      AND pa.attendee_type = 'C'
      ORDER BY c.surname, c.forenames
    `, [panelId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching candidate records:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router; 