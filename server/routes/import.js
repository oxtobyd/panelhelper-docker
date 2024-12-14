import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { pool } from '../db.js';
import path from 'path';
import fs from 'fs';
import { PanelOutcomeSchema, validateExcelFile } from '../utils/validation.js';
import { recordImport, getImportHistory } from '../utils/importHistory.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// Define table mappings
const TABLE_MAPPING = {
  'ParentDiocese': 'parent_diocese',
  'Advisers': 'advisers',
  'PanelVenues': 'panel_venues',
  'Candidates': 'candidates',
  'Panels': 'panels',
  'PanelAttendees': 'panel_attendees',
  'CCOutcomes': 'cc_outcomes',
  'PLRecommendations': 'pl_recommendations'
};

// Define field types for each table
const TABLE_FIELD_TYPES = {
  'list_values': {
    'id': 'bigint',
    'list_id': 'bigint',
    'list_value': 'varchar',
    'list_text': 'varchar',
    'list_order': 'integer',
    'active': 'varchar',  
    'create_date': 'timestamp',
    'created_by': 'integer'
  },
  'parent_diocese': {
    'id': 'bigint',
    'diocese_number': 'integer',
    'parent_diocese_name': 'varchar',
    'diocese_province': 'varchar',
    'diocese_cathedral': 'varchar',
    'pb_diocese_id': 'integer',
    'in_use': 'boolean'
  },
  'panel_venues': {
    'id': 'bigint',
    'active': 'boolean',
    'code': 'varchar',
    'name': 'varchar',
    'add1': 'varchar',
    'add2': 'varchar',
    'add3': 'varchar',
    'postcode': 'varchar',
    'tel': 'varchar',
    'default_adviser_count': 'integer',
    'default_candidate_count': 'integer',
    'include': 'boolean',
    'create_date': 'timestamp',
    'created_by': 'integer',
    'status': 'char'
  },
  'panels': {
    'id': 'bigint',
    'created_date': 'timestamp',
    'panel_date': 'date',
    'panel_time': 'time',
    'feedback_date': 'date',
    'feedback_time': 'time',
    'panel_status': 'integer',
    'panel_type': 'varchar',
    'panel_name': 'varchar',
    'panel_adviser_number': 'integer',
    'panel_candidate_number': 'integer',
    'venue_id': 'bigint',
    'season': 'varchar',
    'portal_ref': 'uuid',
    'available_to_select': 'boolean',
    'dst_member': 'integer',
    'half_panel': 'char'
  },
  'candidates': {
    'id': 'bigint',
    'create_date': 'timestamp',
    'portal_id': 'uuid',
    'active': 'boolean',
    'status': 'integer',
    'portal_carousel_stage': 'integer',
    'last_status_change_date': 'timestamp',
    'candidate_no': 'varchar',
    'email': 'varchar',
    'pbid': 'integer',
    'diocese': 'bigint',
    'title': 'varchar',
    'forenames': 'varchar',
    'surname': 'varchar',
    'preferred_forename': 'varchar',
    'preferred_surname': 'varchar',
    'date_of_birth': 'date',
    'gender': 'varchar',
    'telephone_number': 'varchar',
    'mobile_number': 'varchar',
    'contact_aado': 'varchar',
    'sponsoring_bishop': 'varchar',
    'sponsored_ministry': 'varchar',
    'season': 'varchar',
    'status_id': 'bigint',
    'pun': 'varchar',
    'carousel_season': 'varchar',
    'carousel_name': 'varchar',
    'carousel_feedback': 'boolean',
    'panel_season': 'varchar',
    'panel_name': 'varchar',
    'panel_recommendation': 'boolean',
    'disabled_in_portal': 'boolean',
    'patid_cc': 'bigint',
    'patid_pl': 'bigint',
    'training_status': 'integer',
    'last_interaction_date': 'timestamp'
  },
  'additional_desired_focus': {
    'id': 'bigint',
    'mdsid': 'bigint',
    'portal_id': 'uuid',
    'legal_forename': 'varchar',
    'legal_middle_names': 'varchar',
    'legal_surname': 'varchar',
    'order_of_ministry': 'varchar',
    'focus_of_ministry': 'varchar'
  },
  'advisers': {
    'id': 'bigint',
    'create_date': 'timestamp',
    'active': 'boolean',
    'diocese_id': 'bigint',
    'title': 'varchar',
    'forenames': 'varchar',
    'surname': 'varchar',
    'date_of_birth': 'date',
    'hometel': 'varchar',
    'worktel': 'varchar',
    'email': 'varchar',
    'gender': 'char',
    'portal_id': 'uuid',
    'p_lay': 'boolean',
    'is_ddo': 'boolean',
    'is_addo': 'boolean',
    'p_mfa': 'boolean',
    'p_pfa': 'boolean',
    'p_gender': 'char'
  },
  'diocese': {
    'id': 'bigint',
    'diocese_name': 'varchar',
    'parent_diocese_id': 'bigint'
  },
  'panel_attendees': {
    'id': 'bigint',
    'created_date': 'timestamp',
    'created_by': 'integer',
    'panel_id': 'bigint',
    'attendee_id': 'bigint',
    'attendee_type': 'varchar',
    'attendee_diocese_id': 'bigint',
    'attendee_gender': 'varchar',
    'season': 'integer'
  },
  'cc_outcomes': {
    'id': 'bigint',
    'candidate_id': 'bigint',
    'portal_candidate_id': 'varchar',
    'status': 'varchar',
    'created_date': 'timestamp',
    'edited_date': 'timestamp',
    'national_adviser_name': 'varchar',
    'completed_date': 'timestamp',
    'available_date': 'timestamp',
    'cc1_value': 'integer',
    'cc2_value': 'integer',
    'cc3_value': 'integer',
    'cc4_value': 'integer',
    'cc5_value': 'integer',
    'cc6_value': 'integer',
    'sccc1_text': 'text',
    'sccc2_text': 'text',
    'sccc3_text': 'text',
    'sccc4_text': 'text',
    'sccc5_text': 'text',
    'sccc6_text': 'text',
    'sc_summary_text': 'text',
    'panel_attendees_id': 'bigint'
  },
  'pl_recommendations': {
    'id': 'bigint',
    'candidate_id': 'bigint',
    'portal_candidate_id': 'varchar',
    'status': 'varchar',
    'created_date': 'timestamp',
    'edited_date': 'timestamp',
    'national_adviser_name': 'varchar',
    'completed_date': 'timestamp',
    'available_date': 'timestamp',
    'created_user': 'integer',
    'love_for_god': 'integer',
    'call_to_ministry': 'integer',
    'love_for_people': 'integer',
    'wisdom': 'integer',
    'fruitfulness': 'integer',
    'potential': 'integer',
    'panel_result_text': 'varchar',
    'panel_id': 'bigint',
    'bishops_decision': 'varchar'
  }
};

// Define which fields are dates/timestamps
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

// Add specific date-only fields
const DATE_ONLY_FIELDS = [
  'panel_date',
  'feedback_date',
  'date_of_birth'
];

// Define column mapping for specific tables
const TABLE_COLUMN_MAPPING = {
  'parent_diocese': {
    'p_b_diocese_id': 'pb_diocese_id'
  },
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
    'p_u_n': 'pun',
    'preferred_forename': 'preferred_forename',
    'preferred_surname': 'preferred_surname',
    'sponsoring_bishop': 'sponsoring_bishop',
    'contact_a_a_d_o': 'contact_aado'
  },
  'cc_outcomes': {
    'c_c1_value': 'cc1_value',
    'c_c2_value': 'cc2_value',
    'c_c3_value': 'cc3_value',
    'c_c4_value': 'cc4_value',
    'c_c5_value': 'cc5_value',
    'c_c6_value': 'cc6_value',
    's_c_c_c1_text': 'sccc1_text',
    's_c_c_c2_text': 'sccc2_text',
    's_c_c_c3_text': 'sccc3_text',
    's_c_c_c4_text': 'sccc4_text',
    's_c_c_c5_text': 'sccc5_text',
    's_c_c_c6_text': 'sccc6_text',
    's_c_summary_text': 'sc_summary_text'
  }
};

// Helper function to convert Excel serial date to JavaScript Date
function excelSerialDateToJSDate(serial) {
  if (!serial) return null;
  // Excel's epoch starts on 1/1/1900
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;  
  const date_info = new Date(utc_value * 1000);
  
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  
  const hours = Math.floor((total_seconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((total_seconds % (60 * 60)) / 60);
  
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

// Process the data before insertion
function processRowForInsertion(row, table) {
  const processedRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null) {
      processedRow[key] = null;
      continue;
    }

    const fieldType = TABLE_FIELD_TYPES[table]?.[key];
    if (fieldType === 'timestamp' && (typeof value === 'number' || typeof value === 'string')) {
      const date = typeof value === 'number' ? excelSerialDateToJSDate(value) : new Date(value);
      processedRow[key] = date ? date.toISOString() : null;
    } else {
      processedRow[key] = value;
    }
  }
  return processedRow;
}

// Helper function to convert Excel date to JS Date
function excelDateToJSDate(excelDate) {
  if (!excelDate) return null;
  
  const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  
  const wholeDays = Math.floor(excelDate);
  const timePart = excelDate - wholeDays;
  
  const dateMilliseconds = Math.round((wholeDays - 1) * millisecondsPerDay);
  const timeMilliseconds = Math.round(timePart * millisecondsPerDay);
  
  const date = new Date(EXCEL_EPOCH.getTime() + dateMilliseconds + timeMilliseconds);
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper function to convert Excel time to PostgreSQL time
function excelTimeToPostgresTime(excelTime) {
  const totalMinutes = Math.round(excelTime * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

// Helper function to convert Excel date to date-only string
function excelDateToDateOnly(excelDate) {
  if (!excelDate) return null;
  
  const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  
  const wholeDays = Math.floor(excelDate);
  const dateMilliseconds = Math.round((wholeDays - 1) * millisecondsPerDay);
  
  const date = new Date(EXCEL_EPOCH.getTime() + dateMilliseconds);
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Helper function to convert Excel date to JS Date for panel outcomes
function excelDateToJSDateForPanelOutcomes(excelDate) {
  if (!excelDate) return null;
  
  // If the date is in DD/MM/YYYY format, parse it directly
  if (typeof excelDate === 'string') {
    const [day, month, year] = excelDate.split('/').map(num => parseInt(num));
    return `${year.toString().padStart(4, '20')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  
  // Handle Excel date number format
  const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  
  const date = new Date(EXCEL_EPOCH.getTime() + (excelDate - 1) * millisecondsPerDay);
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Helper function to calculate season from date
function calculateSeason(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  if (month >= 9 && month <= 12) {
    return `${year}C`;
  } else if (month >= 1 && month <= 2) {
    return `${year}A`;
  } else if (month >= 3 && month <= 5) {
    return `${year}B`;
  } else {
    return `${year}C`;
  }
}

// Helper function to transform column names
function transformColumnName(excelColumn) {
  // Special cases for ID fields and specific columns
  if (excelColumn.toLowerCase() === 'id') return 'id';
  if (excelColumn === 'IsADDO') return 'is_addo';
  if (excelColumn === 'IsDDO') return 'is_ddo';
  if (excelColumn === 'PBDioceseID') return 'pb_diocese_id';  // Special case for PBDioceseID
  if (excelColumn.match(/^(is_)?[A-Z]+$/)) {  // Handle acronyms like DDO, ADDO
    return excelColumn.toLowerCase();
  }
  
  // Handle P_ prefix specially
  if (excelColumn.startsWith('P_')) {
    return 'p_' + transformColumnName(excelColumn.substring(2));
  }

  // Convert PascalCase/camelCase to snake_case
  return excelColumn
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/\s+/g, '_')
    // Clean up multiple underscores
    .replace(/_+/g, '_')
    // Special fixes for known columns
    .replace('i_d', 'id')
    .replace('diocese_i_d', 'diocese_id')
    .replace('portal_i_d', 'portal_id')
    .replace('p__', 'p_')
    .replace('m_f_a', 'mfa')
    .replace('p_f_a', 'pfa')
    .replace('d_d_o', 'ddo')
    .replace('a_d_d_o', 'addo')
    .replace('d_s_t_member', 'dst_member')
    .replace('created_date', 'created_date');
}

// Helper function to transform value based on field type
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
      return typeof value === 'number' ? excelDateToJSDate(value).split(' ')[0] : value;
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

// Add debug logging
router.use((req, res, next) => {
  console.log('Import Router accessed:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
  next();
});

const IMPORT_ORDER = [
  'ParentDiocese',
  'Advisers',
  'PanelVenues',
  'Candidates',
  'Panels',
  'PanelAttendees',
  'CCOutcomes',
  'PLRecommendations'
];

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.read(fs.readFileSync(req.file.path));
    
    // Calculate total rows first
    const progress = {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    progress.total = IMPORT_ORDER.reduce((total, tableName) => {
      if (workbook.SheetNames.includes(tableName)) {
        const sheet = workbook.Sheets[tableName];
        const data = xlsx.utils.sheet_to_json(sheet);
        return total + data.length;
      }
      return total;
    }, 0);

    console.log('Total rows to process:', progress.total);

    // Process each table separately
    for (const tableName of IMPORT_ORDER) {
      if (!workbook.SheetNames.includes(tableName)) {
        console.log(`Skipping ${tableName} - sheet not found in workbook`);
        continue;
      }

      const sheet = workbook.Sheets[tableName];
      const jsonData = xlsx.utils.sheet_to_json(sheet);
      
      if (jsonData.length > 0) {
        const dbTableName = TABLE_MAPPING[tableName];
        console.log(`Processing ${tableName} into ${dbTableName}`);

        // Transform all data first
        const transformedData = jsonData.map((row) => {
          const newRow = {};
          const fieldTypes = TABLE_FIELD_TYPES[dbTableName] || {};

          for (const [key, value] of Object.entries(row)) {
            let transformedKey = transformColumnName(key);
            
            // Apply table-specific mapping if it exists
            if (TABLE_COLUMN_MAPPING[dbTableName]?.[transformedKey]) {
              transformedKey = TABLE_COLUMN_MAPPING[dbTableName][transformedKey];
            }

            // Transform the value based on field type
            const fieldType = fieldTypes[transformedKey];
            if (value === null || value === undefined) {
              newRow[transformedKey] = null;
            } else if (typeof value === 'number') {
              switch (fieldType) {
                case 'timestamp':
                  newRow[transformedKey] = excelDateToJSDate(value);
                  break;
                case 'date':
                  newRow[transformedKey] = excelDateToJSDate(value).split(' ')[0];
                  break;
                case 'time':
                  newRow[transformedKey] = excelTimeToPostgresTime(value);
                  break;
                case 'integer':
                case 'bigint':
                  newRow[transformedKey] = Math.round(value);
                  break;
                default:
                  newRow[transformedKey] = value;
              }
            } else {
              newRow[transformedKey] = value;
            }
          }

          return newRow;
        });

        console.log('Sample row before transformation:', jsonData[0]);
        console.log('Sample row after transformation:', transformedData[0]);

        if (!transformedData.length) {
          console.log(`No data to process for ${tableName}`);
          continue;
        }

        const columns = Object.keys(transformedData[0]);
        if (!columns.length) {
          console.log(`No columns found for ${tableName}`);
          continue;
        }

        console.log(`Columns for ${tableName}:`, columns);

        // Process each table in its own transaction
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Clear panel_attendees table before importing new data
          if (dbTableName === 'panel_attendees') {
            await client.query('TRUNCATE TABLE panel_attendees');
            console.log('Cleared panel_attendees table before import');
          }

          let query;
          if (columns.includes('id')) {
            const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
            const updateSet = columns
              .filter(col => col !== 'id')
              .map(col => `${col} = EXCLUDED.${col}`)
              .join(', ');
            
            query = `
              INSERT INTO ${dbTableName} (${columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT (id)
              DO UPDATE SET ${updateSet}`;
          } else {
            const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
            query = `
              INSERT INTO ${dbTableName} (${columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING`;
          }

          const skippedRows = [];
          
          // Process rows one at a time
          for (const [index, row] of transformedData.entries()) {
            try {
              const values = columns.map(col => row[col]);
              await client.query(query, values);
              progress.successful++;
            } catch (error) {
              if (error.code === '23503') { // Foreign key violation
                console.log(`Skipping row ${index + 2} in ${tableName} due to missing foreign key:`, error.detail);
                skippedRows.push({ row, error: error.detail });
                progress.failed++;
                progress.errors.push({
                  table: dbTableName,
                  row: index + 2,
                  error: `Foreign key violation: ${error.detail}`
                });
              } else {
                await client.query('ROLLBACK');
                throw error;
              }
            }

            progress.processed++;
            if (progress.processed % 100 === 0 || progress.processed === progress.total) {
              console.log(`Progress: ${progress.processed}/${progress.total}`);
            }
          }

          if (skippedRows.length > 0) {
            console.log(`Skipped ${skippedRows.length} rows in ${tableName} due to foreign key violations`);
          }

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
    }

    // Record successful import
    await recordImport('rawData', true, {
      fileName: req.file.originalname,
      processed: progress.processed,
      successful: progress.successful,
      failed: progress.failed
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: 'Import completed',
      progress
    });
  } catch (error) {
    // Record failed import
    await recordImport('rawData', false, {
      fileName: req.file.originalname,
      error: error.message
    });

    console.error('Import error:', error);
    res.status(500).json({
      error: 'Import failed',
      message: error.message
    });

    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// POST endpoint to handle panel outcomes import
router.post('/outcomes', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const progress = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('Reading Excel file:', req.file.path);
    const workbook = validateExcelFile(req.file.path);
    console.log('Workbook sheets:', workbook.SheetNames);
    
    const sheet = workbook.Sheets['Report'];
    if (!sheet) {
      throw new Error('Report sheet not found in workbook');
    }

    const jsonData = xlsx.utils.sheet_to_json(sheet);
    console.log('First row of data:', jsonData[0]);
    progress.total = jsonData.length;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const [index, rawRow] of jsonData.entries()) {
        try {
          console.log('Processing row:', index + 1, 'Raw data:', rawRow);
          // Validate row data using Zod schema
          const row = PanelOutcomeSchema.parse(rawRow);
          const completedDate = excelDateToJSDateForPanelOutcomes(row.CompletedDate);
          const calculatedSeason = calculateSeason(completedDate);
          
          const values = [
            row.CandidateName,
            row.DioceseName,
            row.NationalAdviserName,
            completedDate,
            row.LoveForGod,
            row.CallToMinistry,
            row.LoveForPeople,
            row.Wisdom,
            row.Fruitfulness,
            row.Potential,
            row.PanelResultText,
            row.PanelName,
            row.Season?.toString(),
            calculatedSeason,
            row.BishopsDecision,
            row.BishopsNote || '',
            row.CandidateID
          ];

          await client.query(`
            INSERT INTO panel_outcomes (
              candidate_name, diocese_name, national_adviser_name, completed_date,
              love_for_god, call_to_ministry, love_for_people, wisdom, fruitfulness,
              potential, panel_result_text, panel_name, raw_season, calculated_season,
              bishops_decision, bishops_note, candidate_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (candidate_id, panel_name) 
            DO UPDATE SET
              completed_date = EXCLUDED.completed_date,
              love_for_god = EXCLUDED.love_for_god,
              call_to_ministry = EXCLUDED.call_to_ministry,
              love_for_people = EXCLUDED.love_for_people,
              wisdom = EXCLUDED.wisdom,
              fruitfulness = EXCLUDED.fruitfulness,
              potential = EXCLUDED.potential,
              panel_result_text = EXCLUDED.panel_result_text,
              bishops_decision = EXCLUDED.bishops_decision,
              bishops_note = EXCLUDED.bishops_note,
              raw_season = EXCLUDED.raw_season,
              calculated_season = EXCLUDED.calculated_season
          `, values);

          progress.successful++;
        } catch (error) {
          console.error('Error processing row:', index + 1, error);
          progress.failed++;
          progress.errors.push({
            row: index + 2,
            error: error.message
          });
        } finally {
          progress.processed++;
        }
      }

      await client.query('COMMIT');

      // Record successful import
      await recordImport('outcomes', true, {
        fileName: req.file.originalname,
        processed: progress.processed,
        successful: progress.successful,
        failed: progress.failed
      });
    } catch (error) {
      console.error('Database error:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({
      message: 'Import completed',
      progress
    });
  } catch (error) {
    console.error('Fatal import error:', error);
    // Record failed import
    await recordImport('outcomes', false, {
      fileName: req.file?.originalname,
      error: error.message
    });

    res.status(500).json({
      error: 'Import failed',
      message: error.message,
      details: error.stack
    });
  } finally {
    // Clean up uploaded file
    if (req.file?.path) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// GET endpoint to check import status
router.get('/status', async (req, res) => {
  try {
    const status = await getImportHistory();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch import status' });
  }
});

export default router;
