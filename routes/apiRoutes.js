// routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const ApiController = require('../controllers/apiController');

// Get all tokens
router.get('/tokens', ApiController.getTokens);

// Get token by transaction ID
router.get('/token/:txid', ApiController.getTokenByTxid);

// Get Bitcoin node status
router.get('/status', ApiController.getStatus);

module.exports = router;