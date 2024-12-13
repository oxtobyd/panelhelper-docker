import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Get task templates by type (Panel or Carousel)
router.get('/templates/:type', async (req, res) => {
  try {
    const { type } = req.params;
    console.log('Received type:', type);
    
    // Convert to uppercase for DB comparison
    const dbType = type.toUpperCase();
    
    const result = await pool.query(`
      SELECT 
        ttc.id as category_id,
        ttc.name as category_name,
        COALESCE(
          json_agg(
            CASE WHEN tt.id IS NOT NULL THEN
              json_build_object(
                'id', tt.id,
                'title', tt.title,
                'description', tt.description,
                'default_days_offset', tt.default_days_offset,
                'duration', tt.duration,
                'order_index', tt.order_index
              )
            ELSE NULL END
          ) FILTER (WHERE tt.id IS NOT NULL),
          '[]'
        ) as tasks
      FROM task_template_categories ttc
      LEFT JOIN task_templates tt ON ttc.id = tt.category_id
      WHERE ttc.type = $1
      GROUP BY ttc.id, ttc.name
      ORDER BY ttc.name
    `, [dbType]);

    // Filter out categories with empty tasks array
    const templates = result.rows.filter(category => category.tasks.length > 0);
    res.json(templates);
  } catch (err) {
    console.error('Error fetching task templates:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add tasks from template to a panel
router.post('/panel/:panelId/from-template', async (req, res) => {
  const client = await pool.connect();
  try {
    const { panelId } = req.params;
    const { templateIds } = req.body;
    
    await client.query('BEGIN');

    // Get panel date and type for calculating due dates
    const panelResult = await client.query(
      'SELECT panel_date, panel_type FROM panels WHERE id = $1',
      [panelId]
    );
    
    if (!panelResult.rows.length) {
      throw new Error('Panel not found');
    }

    const { panel_date: panelDate, panel_type: panelType } = panelResult.rows[0];

    // Get templates
    const templatesResult = await client.query(`
      SELECT tt.* 
      FROM task_templates tt
      JOIN task_template_categories ttc ON tt.category_id = ttc.id
      WHERE tt.id = ANY($1) AND ttc.type = $2
    `, [templateIds, panelType.toUpperCase()]);

    // Create tasks from templates
    for (const template of templatesResult.rows) {
      const startDate = new Date(panelDate);
      startDate.setDate(startDate.getDate() + template.default_days_offset);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (template.duration - 1)); // -1 because the start date counts as day 1

      await client.query(`
        INSERT INTO tasks (
          panel_id, title, description, due_date, end_date,
          completed, task_type, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, false, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [panelId, template.title, template.description, startDate, endDate, panelType.toUpperCase()]);
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get all task templates with their categories
router.get('/templates', async (req, res) => {
  try {
    console.log('Fetching all task templates...');
    
    // First verify the tables exist and have data
    const checkData = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM task_template_categories) as category_count,
        (SELECT COUNT(*) FROM task_templates) as template_count
    `);
    console.log('Current data counts:', checkData.rows[0]);

    const result = await pool.query(`
      SELECT 
        ttc.id as category_id,
        ttc.name as category_name,
        ttc.type as category_type,
        COALESCE(
          json_agg(
            CASE WHEN tt.id IS NOT NULL THEN
              json_build_object(
                'id', tt.id,
                'title', tt.title,
                'description', tt.description,
                'default_days_offset', tt.default_days_offset,
                'duration', tt.duration,
                'order_index', tt.order_index
              )
            ELSE NULL END
          ) FILTER (WHERE tt.id IS NOT NULL),
          '[]'
        ) as templates
      FROM task_template_categories ttc
      LEFT JOIN task_templates tt ON ttc.id = tt.category_id
      GROUP BY ttc.id, ttc.name, ttc.type
      ORDER BY ttc.type, ttc.name
    `);
    
    // Sort templates within each category by order_index
    const sortedResults = result.rows.map(category => ({
      ...category,
      templates: category.templates.sort((a, b) => a.order_index - b.order_index)
    }));
    
    console.log('Query completed, found categories:', sortedResults.length);
    res.json(sortedResults);
  } catch (err) {
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail
    });
    res.status(500).json({ 
      error: err.message,
      detail: err.detail 
    });
  }
});

// Update task template
router.patch('/templates/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { title, description, default_days_offset, order_index, duration } = req.body;
    
    await client.query('BEGIN');
    
    const result = await client.query(`
      UPDATE task_templates 
      SET 
        title = $1,
        description = $2,
        default_days_offset = $3,
        order_index = $4,
        duration = $5
      WHERE id = $6
      RETURNING *
    `, [title, description, default_days_offset, order_index, duration, id]);
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating task template:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Delete task template
router.delete('/templates/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    await client.query('DELETE FROM task_templates WHERE id = $1', [id]);
    await client.query('COMMIT');
    
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting task template:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Add new task template
router.post('/templates', async (req, res) => {
  const client = await pool.connect();
  try {
    const { category_id, title, description, default_days_offset, order_index, duration } = req.body;
    
    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO task_templates (
        category_id, title, description, default_days_offset, order_index, duration
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [category_id, title, description, default_days_offset, order_index, duration || 1]);
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating task template:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;