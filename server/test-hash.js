import bcrypt from 'bcrypt';

const password = 'FatBob1972';

async function generateHash() {
  const hash = await bcrypt.hash(password, 10);
  console.log('Generated hash:', hash);
  
  // Test the hash
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash verification:', isValid);
  
  // Test against stored hash
  const storedHash = '$2b$10$YQtV1P.wPqrJhMqSyEXyZuGKtcjVoEXSfxT5mglNYgGxVf0WQxEHO';
  const isStoredValid = await bcrypt.compare(password, storedHash);
  console.log('Stored hash verification:', isStoredValid);
}

generateHash();
