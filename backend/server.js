const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const bookRoutes = require('./routes/bookRoutes');
const memberRoutes = require('./routes/memberRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Setup logging directory and file
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logFile = path.join(logDir, 'app.log');

// Action & Error Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    
    let logLine = `[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms\n`;
    
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      logLine += `  Action Data: ${JSON.stringify(req.body)}\n`;
    }
    
    const prefix = isError ? 'ERROR ' : 'INFO  ';
    logLine = prefix + logLine;
    
    if (isError) {
      console.error(logLine.trim());
    } else {
      console.log(logLine.trim());
    }
    
    fs.appendFile(logFile, logLine, (err) => {
      if (err) console.error('Failed to write to log file', err);
    });
  });
  
  next();
});

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

