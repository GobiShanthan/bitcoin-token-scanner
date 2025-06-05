// app.js - Main Express application entry point
require('dotenv').config(); 
console.log("🧪 MONGO_URI:", process.env.MONGO_URI);


const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const connectDB = require('./config/database'); // ✅ add this line
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');

// ✅ Open CORS: Allow all origins
app.use(cors());

// Load configuration
const config = require('./config/config');

// Set up view engine with layouts
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/apiRoutes');

// Use routes
app.use('/', webRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// ✅ Start server only after MongoDB connection is successful
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ Token scanner running at http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });
