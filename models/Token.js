const TokenParser = require('../utils/tokenParser');
const BitcoinService = require('../services/bitcoinService');
const config = require('../config/config');

// Store found tokens in memory cache
let tokenCache = [];
let lastScanTime = 0;

/**
 * Token model for managing token data
 */
class Token {
  constructor(data) {
    this.tokenId = data.tokenId;
    this.amount = data.amount;
    this.metadata = data.metadata;
    this.timestamp = data.timestamp;
    this.txid = data.txid;
    this.blockHeight = data.blockHeight;
    this.blockHash = data.blockHash;
    this.blockTime = data.blockTime;
    this.isValidScript = data.isValidScript;
    this.typeCode = data.typeCode;
  }

  /**
   * Find all tokens in the blockchain
   */
  static async findAll(maxBlocks = config.scan.maxBlocks, forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && tokenCache.length > 0 && (now - lastScanTime) < config.cache.ttl) {
      console.log(`Using cached tokens (${tokenCache.length})`);
      return tokenCache;
    }

    console.log('Scanning blockchain for tokens...');
    const tokens = await Token.scanForTokens(maxBlocks);

    tokenCache = tokens;
    lastScanTime = now;

    return tokens;
  }

  /**
   * Find a token by transaction ID
   */
  static async findByTxid(txid) {
    const cachedToken = tokenCache.find(token => token.txid === txid);
    if (cachedToken) {
      return cachedToken;
    }

    try {
      const tx = await BitcoinService.getRawTransaction(txid, true);
      if (!tx) return null;

      for (const vin of tx.vin) {
        if (vin.txinwitness && vin.txinwitness.length >= 2) {
          const witnessScript = vin.txinwitness[0];
          const tokenData = TokenParser.parse(witnessScript);

          if (tokenData) {
            tokenData.txid = txid;
            tokenData.blockHash = tx.blockhash;

            if (tx.blockhash) {
              const block = await BitcoinService.getBlock(tx.blockhash);
              tokenData.blockHeight = block.height;
              tokenData.blockTime = block.time;
            }

            return new Token(tokenData);
          }
        }
      }

      return null;
    } catch (err) {
      console.error(`Error getting token by txid ${txid}:`, err);
      return null;
    }
  }

  /**
   * Scan blockchain for tokens
   */
  static async scanForTokens(maxBlocks = config.scan.maxBlocks) {
    const tokens = [];

    try {
      let startBlock, endBlock;

      const info = await BitcoinService.getBlockchainInfo();

      if (config.scan.dynamic) {
        const currentHeight = info.blocks;
        startBlock = Math.max(0, currentHeight - config.scan.maxBlocks);
        endBlock = currentHeight;
      } else {
        startBlock = config.scan.fixedStart;
        endBlock = info.blocks; // Always up to latest
      }

      console.log(`Scanning blocks from ${startBlock} to ${endBlock}...`);

      for (let height = startBlock; height <= endBlock; height++) {
        try {
          const blockHash = await BitcoinService.getBlockHash(height);
          const block = await BitcoinService.getBlock(blockHash);

          console.log(`Scanning block ${height} with ${block.tx.length} transactions`);

          for (const tx of block.tx) {
            if (!tx.vin[0].txid) continue;

            for (const vin of tx.vin) {
              if (vin.txinwitness && vin.txinwitness.length >= 2) {
                const witnessScript = vin.txinwitness[0];
                const tokenData = TokenParser.parse(witnessScript);

                if (tokenData) {
                  tokenData.txid = tx.txid;
                  tokenData.blockHeight = height;
                  tokenData.blockHash = blockHash;
                  tokenData.blockTime = block.time;
                  tokenData.timestamp = tokenData.timestamp || block.time;
                  tokenData.typeCode = tokenData.typeCode || 0;

                  tokens.push(new Token(tokenData));
                  console.log(`Found token: ${tokenData.tokenId} in tx ${tx.txid}`);
                }
              }
            }
          }
        } catch (blockErr) {
          console.error(`Error processing block ${height}:`, blockErr);
          continue;
        }
      }

      console.log(`Found ${tokens.length} tokens`);
      return tokens;
    } catch (err) {
      console.error('Error scanning blockchain:', err);
      throw err;
    }
  }

  /**
   * Clear the token cache
   */
  static clearCache() {
    tokenCache = [];
    lastScanTime = 0;
    console.log('Token cache cleared');
  }
}

module.exports = Token;
