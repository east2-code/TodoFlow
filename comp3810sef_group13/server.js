/**
 * server.js - application entry point.
 *
 * Request flow:
 *   browser / curl -> middleware -> routes -> controller -> Mongoose -> EJS or JSON
 */
const path = require('node:path');
const express = require('express');
const session = require('cookie-session');
const mongoose = require('mongoose');

const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

/* 1. App configuration */
const PORT = process.env.PORT || 8099;
const MONGODB_URI =
  'mongodb+srv://hkmu:hkmu12345@cluster0.rbb9ovu.mongodb.net/comp3810sef_todo?retryWrites=true&w=majority&appName=Cluster0';
const SESSION_KEY = process.env.SESSION_KEY || 'comp3810sef-todoflow-secret-key';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* 2. Global middleware - the order below matters */
app.use(express.static(path.join(__dirname, 'public')));

// Keep the IDE preview happy (it injects a Vite client script); not used by the app.
app.get('/@vite/client', (req, res) => {
  res.type('application/javascript').send('export {};');
});

// Body parsers: HTML forms and JSON API requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session: the logged-in user is stored in a signed cookie (Lecture 7)
app.use(
  session({
    name: 'todoflowSession',
    keys: [SESSION_KEY],
    maxAge: 24 * 60 * 60 * 1000,
  })
);

// Custom middleware: log every request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Values shared by every EJS template
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  next();
});

/* 3. Routes - API first, because the web router contains the login guard */
app.use('/api/todos', apiRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Unknown API endpoint: ${req.originalUrl}` });
});

app.use('/', webRoutes);

/* 4. 404 and error handling - always after all routes */
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    status: 404,
    message: `Unknown request: ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(500).json({ error: err.message });
  }
  res.status(500).render('error', {
    title: 'Server Error',
    status: 500,
    message: 'Internal server error. Please check the server console.',
  });
});

/* 5. Connect to MongoDB, then start the HTTP server */
async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('Check MONGODB_URI, the database user and the Atlas IP whitelist.');
  }

  app.listen(PORT, () => {
    console.log(`TodoFlow is running at http://localhost:${PORT}`);
  });
}

start();

module.exports = app;
