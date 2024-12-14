import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Get all venue locations
router.get('/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM venue_locations ORDER BY venue_name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching venue locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add or update venue location
router.post('/locations', async (req, res) => {
  const { venue_name, latitude, longitude } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO venue_locations (venue_name, latitude, longitude)
       VALUES ($1, $2, $3)
       ON CONFLICT (venue_name) 
       DO UPDATE SET latitude = $2, longitude = $3
       RETURNING *`,
      [venue_name, latitude, longitude]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving venue location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete venue location
router.delete('/locations/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM venue_locations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting venue location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all venue names from panel_venues
router.get('/names', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT name 
      FROM panel_venues 
      WHERE name != 'Online'
      ORDER BY name
    `);
    res.json(result.rows.map(row => row.name));
  } catch (error) {
    console.error('Error fetching venue names:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
