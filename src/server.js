require('dotenv').config();
// Thin wrapper that starts the unified backend app from ../backend.
const app = require('../backend/server');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

