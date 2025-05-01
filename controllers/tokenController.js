const TokenMongo = require('../models/TokenMongo');
const BitcoinService = require('../services/bitcoinService');

class TokenController {
  static async index(req, res, next) {
    try {
      const tokens = await TokenMongo.find()
        .sort({ blockHeight: -1 })
        .limit(100);

      res.render('index', { tokens });
    } catch (err) {
      next(err);
    }
  }

  static async show(req, res, next) {
    try {
      const txid = req.params.txid;
      const token = await TokenMongo.findOne({ txid });

      if (!token) {
        return res.status(404).render('error', {
          message: 'Token not found',
          error: { status: 404 }
        });
      }

      const rawTx = await BitcoinService.getRawTransaction(txid, true);
      res.render('token', { token, rawTx });
    } catch (err) {
      next(err);
    }
  }

  static docs(req, res) {
    res.render('docs');
  }
}

module.exports = TokenController;
