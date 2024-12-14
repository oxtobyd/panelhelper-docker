import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    console.log('Login attempt - Email:', email);
    console.log('Request body:', req.body);
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('Database query result:', result.rows);
    
    const user = result.rows[0];
    if (!user) {
      console.log('User not found in database');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Found user:', { id: user.id, email: user.email, role: user.role });
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password comparison result:', isValidPassword);
    console.log('Attempted password:', password);
    console.log('Stored hash:', user.password_hash);

    if (!isValidPassword) {
      console.log('Password validation failed');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Store session
    await pool.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'24 hours\')',
      [user.id, token]
    );

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  const token = req.cookies.jwt;
  if (token) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    res.clearCookie('jwt');
  }
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check authentication status
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({ authenticated: true });
  } catch (error) {
    console.error('Error checking authentication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
