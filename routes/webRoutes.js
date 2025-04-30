// routes/webRoutes.js
const express = require('express');
const router = express.Router();
const TokenController = require('../controllers/tokenController');

// Home page - list all tokens
router.get('/', TokenController.index);

// Token details page
router.get('/token/:txid', TokenController.show);

// Documentation page
router.get('/docs', TokenController.docs);

module.exports = router;