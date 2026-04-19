const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const bookRoutes = require('./routes/bookRoutes');
const memberRoutes = require('./routes/memberRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging removed - no longer saving to file

// Serve the new premium frontend from ../frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Oracle returns column names in UPPERCASE, which breaks frontend JS expecting lowercase.
// Here we add a middleware to recursively lowercase keys before sending JSON.
function lowerCaseKeys(obj) {
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(lowerCaseKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k.toLowerCase(), lowerCaseKeys(v)])
    );
  }
  return obj;
}

app.use('/api', (req, res, next) => {
  const originalJson = res.json;
  res.json = function (obj) {
    originalJson.call(this, lowerCaseKeys(obj));
  };
  next();
});

// API routes
app.use('/api', bookRoutes);
app.use('/api', memberRoutes);
app.use('/api', transactionRoutes);

// Start Automated Overdue Email Monitoring (every 30 seconds)
const { startOverdueMonitor } = require('./services/overdueChecker');
startOverdueMonitor(30000);

// Fallback to index.html for root
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

module.exports = app;

