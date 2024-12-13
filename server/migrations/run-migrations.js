import { pool } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    try {
        // Read and execute the SQL file
        const sqlFile = path.join(__dirname, 'add_calculated_season.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        await pool.query(sql);
        console.log('Migrations completed successfully');
    } catch (error) {
        console.error('Error running migrations:', error);
    } finally {
        await pool.end();
    }
}

runMigrations();
