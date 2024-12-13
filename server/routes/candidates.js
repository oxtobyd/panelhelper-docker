import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Get candidate record
router.get('/:candidateId/record', async (req, res) => {
  try {
    const { candidateId } = req.params;
    console.log('Fetching record for candidate:', candidateId);
    
    const result = await pool.query(
      'SELECT * FROM candidate_records WHERE candidate_id = $1',
      [candidateId]
    );
    
    console.log('Found record:', result.rows[0] || 'No record found');
    res.json(result.rows[0] || { 
      candidate_id: candidateId,
      dbs_check_complete: false,
      dbs_check_date: null,
      notes: ''
    });
  } catch (err) {
    console.error('Error fetching candidate record:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upsert candidate record
router.post('/:candidateId/record', async (req, res) => {
  const client = await pool.connect();
  try {
    const { candidateId } = req.params;
    console.log('Received request:', {
      body: req.body,
      params: req.params
    });
    
    const { 
      dbs_check_complete, 
      dbs_check_date, 
      notes,
      baptised,
      confirmed,
      c4_received,
      overseas_check,
      references_up_to_date,
      previous_panel,
      bnp_member,
      disabilities,
      ddo_named_on_report,
      ddo_email
    } = req.body;

    console.log('Extracted ddo_email:', ddo_email);
    console.log('Full extracted data:', {
      dbs_check_complete, 
      dbs_check_date, 
      notes,
      baptised,
      confirmed,
      c4_received,
      overseas_check,
      references_up_to_date,
      previous_panel,
      bnp_member,
      disabilities,
      ddo_named_on_report,
      ddo_email
    });

    const result = await client.query(`
      INSERT INTO candidate_records 
        (candidate_id, dbs_check_complete, dbs_check_date, notes,
         baptised, confirmed, c4_received, overseas_check,
         references_up_to_date, previous_panel, bnp_member,
         disabilities, ddo_named_on_report, ddo_email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (candidate_id) DO UPDATE SET
        dbs_check_complete = EXCLUDED.dbs_check_complete,
        dbs_check_date = EXCLUDED.dbs_check_date,
        notes = EXCLUDED.notes,
        baptised = EXCLUDED.baptised,
        confirmed = EXCLUDED.confirmed,
        c4_received = EXCLUDED.c4_received,
        overseas_check = EXCLUDED.overseas_check,
        references_up_to_date = EXCLUDED.references_up_to_date,
        previous_panel = EXCLUDED.previous_panel,
        bnp_member = EXCLUDED.bnp_member,
        disabilities = EXCLUDED.disabilities,
        ddo_named_on_report = EXCLUDED.ddo_named_on_report,
        ddo_email = EXCLUDED.ddo_email,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      candidateId,
      dbs_check_complete,
      dbs_check_date,
      notes,
      baptised,
      confirmed,
      c4_received,
      overseas_check,
      references_up_to_date,
      previous_panel,
      bnp_member,
      disabilities,
      ddo_named_on_report,
      ddo_email
    ]);

    console.log('Query result:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error upserting candidate record:', err);
    console.error('Error details:', err.stack);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update candidate record
router.patch('/:candidateId/record', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { dbs_check_complete, dbs_check_date, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE candidate_records 
       SET dbs_check_complete = $2, 
           dbs_check_date = $3, 
           notes = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE candidate_id = $1
       RETURNING *`,
      [candidateId, dbs_check_complete, dbs_check_date, notes]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete candidate record
router.delete('/:candidateId/record', async (req, res) => {
  try {
    const { candidateId } = req.params;
    await pool.query(
      'DELETE FROM candidate_records WHERE candidate_id = $1',
      [candidateId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add this new route at the top with other routes
router.get('/records', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM candidate_records'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching candidate records:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add this new route to fetch additional desired focus data
router.get('/:candidateId/additional-focus', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const result = await pool.query(
      'SELECT order_of_ministry, focus_of_ministry, additional_desired_focus FROM additional_desired_focus WHERE mdsid = $1',
      [parseInt(candidateId)]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error('Error fetching additional focus data:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router; 