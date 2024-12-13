/**
 * @typedef {Object} ImportProgress
 * @property {number} total - Total number of rows to process
 * @property {number} processed - Number of rows processed
 * @property {number} failed - Number of rows that failed
 * @property {Array<{table: string, error: string, row: Object}>} errors - List of errors
 */

/**
 * @typedef {Object} ExcelRow
 * @property {*} [key: string] - Any key-value pair from Excel
 */

import { pool } from '../db.js';
import * as xlsx from 'xlsx';
import { TABLE_MAPPING } from './tableMapping.js';

// Define column mapping for specific tables
const TABLE_COLUMN_MAPPING = {
  'advisers': {
    'p_m_f_a': 'p_mfa',
    'p_p_f_a': 'p_pfa',
    'is_d_d_o': 'is_ddo',
    'is_a_d_d_o': 'is_addo',
    'diocese_i_d': 'diocese_id',
    'portal_i_d': 'portal_id'
  },
  'candidates': {
    'p_a_t_id_c_c': 'patid_cc',
    'p_a_t_id_p_l': 'patid_pl',
    'create_date': 'create_date',
    'date_of_birth': 'date_of_birth',
    'last_status_change_date': 'last_status_change_date',
    'last_interaction_date': 'last_interaction_date',
    'mobile_number': 'mobile_number',
    'p_b_id': 'pbid',
    'portal_i_d': 'portal_id'
  }
};

// Add these constant definitions
const DATE_FIELDS = [
  'create_date',
  'created_date',
  'date_of_birth',
  'last_status_change_date',
  'last_interaction_date',
  'start_date',
  'end_date',
  'panel_date'
];

const TIME_FIELDS = [
  'start_time',
  'end_time'
];

const TABLE_FIELD_TYPES = {
  'panel_venues': {
    'id': 'bigint',
    'active': 'boolean',
    'code': 'varchar',
    'name': 'varchar',
    'address': 'varchar',
    'postcode': 'varchar',
    'max_candidates': 'integer',
    'max_advisers': 'integer',
    'max_observers': 'integer',
    'notes': 'text',
    'created_date': 'timestamp',
    'modified_date': 'timestamp'
  },
  'pl_recommendations': {
    'id': 'bigint',
    'candidate_id': 'bigint',
    'portal_candidate_id': 'uuid',
    'status': 'integer',
    'created_date': 'timestamp',
    'modified_date': 'timestamp',
    'notes': 'text'
  }
};

// Helper functions for date/time conversion
function excelDateToJSDate(excelDate) {
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString();
}

function excelDateToDateOnly(excelDate) {
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

function excelTimeToPostgresTime(excelTime) {
  const totalSeconds = Math.round(excelTime * 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

// Helper functions
function transformValue(value, fieldType) {
  if (value === null || value === undefined) {
    return null;
  }

  switch (fieldType) {
    case 'boolean':
      return value === 1 || value === '1' || value === 'true' || value === true;
    case 'integer':
      return typeof value === 'number' ? Math.floor(value) : parseInt(value);
    case 'bigint':
      return typeof value === 'number' ? value : parseInt(value);
    case 'timestamp':
      return typeof value === 'number' ? excelDateToJSDate(value) : value;
    case 'date':
      return typeof value === 'number' ? excelDateToDateOnly(value) : value;
    case 'time':
      return typeof value === 'number' ? excelTimeToPostgresTime(value) : value;
    default:
      return value;
  }
}

// Add debug logging for date conversions
function debugDateConversion(excelDate, fieldName) {
  const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
  console.log(`Converting date for field ${fieldName}:`);
  console.log(`Excel date value: ${excelDate}`);
  console.log(`Converted JS Date: ${jsDate}`);
  console.log(`ISO string: ${jsDate.toISOString()}`);
}

/**
 * Import Excel data into the database
 * @param {string} filepath - Path to the Excel file
 * @param {function(ImportProgress): void} [onProgress] - Progress callback
 * @returns {Promise<ImportProgress>} Import progress
 */
export async function importExcelData(filepath, onProgress) {
  const progress = {
    total: 0,
    processed: 0,
    failed: 0,
    errors: []
  };

  const client = await pool.connect();
  const workbook = xlsx.readFile(filepath);

  try {
    await client.query('BEGIN');

    // Process each table in the workbook
    for (const [excelTable, dbTable] of Object.entries(TABLE_MAPPING)) {
      if (workbook.SheetNames.includes(excelTable)) {
        const sheet = workbook.Sheets[excelTable];
        const data = xlsx.utils.sheet_to_json(sheet);
        progress.total += data.length;

        console.log(`Processing ${excelTable} table with ${data.length} rows`);

        for (const row of data) {
          try {
            const transformedRow = {};
            
            // Transform column names and values
            for (const [excelCol, value] of Object.entries(row)) {
              let dbCol = excelCol.toLowerCase();
              
              // Apply specific column mappings if they exist
              if (TABLE_COLUMN_MAPPING[excelTable]?.[dbCol]) {
                dbCol = TABLE_COLUMN_MAPPING[excelTable][dbCol];
              }

              // Get the field type from TABLE_FIELD_TYPES
              const fieldType = TABLE_FIELD_TYPES[dbTable]?.[dbCol] || 'varchar';

              // Transform the value based on field type
              let transformedValue = value;

              if (DATE_FIELDS.includes(dbCol)) {
                if (typeof value === 'number') {
                  debugDateConversion(value, dbCol);
                  transformedValue = excelDateToJSDate(value);
                }
              } else if (TIME_FIELDS.includes(dbCol)) {
                if (typeof value === 'number') {
                  transformedValue = excelTimeToPostgresTime(value);
                }
              } else {
                transformedValue = transformValue(value, fieldType);
              }

              transformedRow[dbCol] = transformedValue;
            }

            // Build and execute INSERT query
            const columns = Object.keys(transformedRow);
            const values = Object.values(transformedRow);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            
            const query = `
              INSERT INTO ${dbTable} (${columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT (id) DO UPDATE
              SET ${columns.map((col, i) => `${col} = $${i + 1}`).join(', ')}
            `;

            await client.query(query, values);
            progress.processed++;

            // Call progress callback if provided
            if (onProgress) {
              onProgress(progress);
            }
          } catch (error) {
            console.error(`Error processing row in ${dbTable}:`, error);
            progress.failed++;
            progress.errors.push({
              table: dbTable,
              error: error.message,
              row: row
            });
          }
        }
      }
    }

    await client.query('COMMIT');
    return progress;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
