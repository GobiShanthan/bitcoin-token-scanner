// models/Token.js
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
  /**
   * Create a new token instance
   * @param {Object} data - Token data
   */
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
  }

  /**
   * Find all tokens in the blockchain
   * @param {number} maxBlocks - Maximum number of blocks to scan
   * @param {boolean} forceRefresh - Whether to force a refresh of the cache
   * @returns {Promise<Array<Token>>} Array of token instances
   */
  static async findAll(maxBlocks = config.scan.maxBlocks, forceRefresh = false) {
    const now = Date.now();
    
    // Return cached tokens if available and not expired
    if (!forceRefresh && tokenCache.length > 0 && (now - lastScanTime) < config.cache.ttl) {
      console.log(`Using cached tokens (${tokenCache.length})`);
      return tokenCache;
    }
    
    // Scan for new tokens
    console.log('Scanning blockchain for tokens...');
    const tokens = await Token.scanForTokens(maxBlocks);
    
    // Update cache
    tokenCache = tokens;
    lastScanTime = now;
    
    return tokens;
  }

  /**
   * Find a token by transaction ID
   * @param {string} txid - Transaction ID
   * @returns {Promise<Token|null>} Token instance or null if not found
   */
  static async findByTxid(txid) {
    // Try to find in cache first
    const cachedToken = tokenCache.find(token => token.txid === txid);
    if (cachedToken) {
      return cachedToken;
    }
    
    // If not in cache, we'll need to check the transaction
    try {
      // Get transaction details
      const tx = await BitcoinService.getRawTransaction(txid, true);
      if (!tx) {
        return null;
      }
      
      // Check inputs for witness data
      for (const vin of tx.vin) {
        if (vin.txinwitness && vin.txinwitness.length >= 2) {
          const witnessScript = vin.txinwitness[0];
          const tokenData = TokenParser.parse(witnessScript);
          
          if (tokenData) {
            // Add blockchain metadata
            tokenData.txid = txid;
            tokenData.blockHash = tx.blockhash;
            
            // Get block info for more details
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
   * @param {number} maxBlocks - Maximum number of blocks to scan
   * @returns {Promise<Array<Token>>} Array of token instances
   */
  static async scanForTokens(maxBlocks = config.scan.maxBlocks) {
    const tokens = [];
    
    try {
      // Get current blockchain info
      const info = await BitcoinService.getBlockchainInfo();
      const currentHeight = info.blocks;
      
      // Scan the most recent blocks (limited by maxBlocks)
      const startBlock = Math.max(0, currentHeight - maxBlocks);
      
      console.log(`Scanning blocks from ${startBlock} to ${currentHeight}...`);
      
      for (let height = startBlock; height <= currentHeight; height++) {
        try {
          // Get block hash
          const blockHash = await BitcoinService.getBlockHash(height);
          
          // Get block with transaction data
          const block = await BitcoinService.getBlock(blockHash);
          
          console.log(`Scanning block ${height} with ${block.tx.length} transactions`);
          
          // Check each transaction in the block
          for (const tx of block.tx) {
            // Skip coinbase transactions
            if (!tx.vin[0].txid) continue;
            
            // Check each input for witness data
            for (const vin of tx.vin) {
              if (vin.txinwitness && vin.txinwitness.length >= 2) {
                const witnessScript = vin.txinwitness[0];
                
                // Parse token data from witness script
                const tokenData = TokenParser.parse(witnessScript);
                
                if (tokenData) {
                  // Add blockchain metadata
                  tokenData.txid = tx.txid;
                  tokenData.blockHeight = height;
                  tokenData.blockHash = blockHash;
                  tokenData.blockTime = block.time;
                  tokenData.timestamp = tokenData.timestamp || block.time;
                  
                  // Add to our collection
                  tokens.push(new Token(tokenData));
                  console.log(`Found token: ${tokenData.tokenId} in tx ${tx.txid}`);
                }
              }
            }
          }
        } catch (blockErr) {
          console.error(`Error processing block ${height}:`, blockErr);
          // Continue with next block even if one fails
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