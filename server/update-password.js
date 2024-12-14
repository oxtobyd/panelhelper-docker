import bcrypt from 'bcrypt';
import { pool } from './db.js';

const email = 'david.oxtoby@churchofengland.org';
const password = 'FatBob1972';

async function updatePassword() {
  try {
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash:', hash);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING *',
      [hash, email]
    );
    
    console.log('User updated:', result.rows[0]);
    
    // Verify the password works
    const isValid = await bcrypt.compare(password, hash);
    console.log('Password verification:', isValid);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePassword();
