const TokenMongo = require('../models/TokenMongo');
const BitcoinNode = require('../models/BitcoinNode');

class ApiController {
  static async getTokens(req, res) {
    try {
      const tokens = await TokenMongo.find()
        .sort({ blockHeight: -1 })
        .limit(100);

      res.json(tokens);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getTokenByTxid(req, res) {
    try {
      const txid = req.params.txid;
      const token = await TokenMongo.findOne({ txid });

      if (!token) {
        return res.status(404).json({ error: 'Token not found' });
      }

      res.json(token);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

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
