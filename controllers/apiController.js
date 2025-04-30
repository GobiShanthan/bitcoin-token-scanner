// controllers/apiController.js
const Token = require('../models/Token');
const BitcoinNode = require('../models/BitcoinNode');

/**
 * Controller for API routes
 */
class ApiController {
  /**
   * Get all tokens
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getTokens(req, res) {
    try {
      const forceRefresh = req.query.refresh === 'true';
      const tokens = await Token.findAll(100, forceRefresh);
      res.json(tokens);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get token by transaction ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getTokenByTxid(req, res) {
    try {
      const txid = req.params.txid;
      const token = await Token.findByTxid(txid);
      
      if (!token) {
        return res.status(404).json({ error: 'Token not found' });
      }
      
      res.json(token);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get Bitcoin node status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getStatus(req, res) {
    try {
      const status = await BitcoinNode.getStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = ApiController;