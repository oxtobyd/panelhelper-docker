import express from 'express';
import cors from 'cors';
import panelsRouter from './routes/panels.js';
import reportsRouter from './routes/reports.js';
import importRouter from './routes/import.js';
// ... other imports

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/panels', panelsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/import', importRouter);

// ... rest of your app setup 

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

export default app;