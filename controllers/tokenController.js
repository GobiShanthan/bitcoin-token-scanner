// controllers/tokenController.js
const Token = require('../models/Token');
const BitcoinService = require('../services/bitcoinService');

/**
 * Controller for token-related routes
 */
class TokenController {
  /**
   * Display home page with list of tokens
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async index(req, res, next) {
    try {
      // Check if refresh is requested
      const forceRefresh = req.query.refresh === 'true';
      const tokens = await Token.findAll(100, forceRefresh);
      res.render('index', { tokens });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Display token details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async show(req, res, next) {
    try {
      const txid = req.params.txid;
      const token = await Token.findByTxid(txid);
      
      if (!token) {
        return res.status(404).render('error', { 
          message: 'Token not found',
          error: { status: 404 }
        });
      }
      
      // Get raw transaction for detailed view
      const rawTx = await BitcoinService.getRawTransaction(txid, true);
      
      res.render('token', { token, rawTx });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Display documentation page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static docs(req, res) {
    res.render('docs');
  }
}

module.exports = TokenController;