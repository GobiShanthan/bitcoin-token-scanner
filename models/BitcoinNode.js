// models/BitcoinNode.js
const BitcoinService = require('../services/bitcoinService');

/**
 * BitcoinNode model for handling node status information
 */
class BitcoinNode {
  /**
   * Get comprehensive status of the Bitcoin node
   * @returns {Promise<Object>} Node status information
   */
  static async getStatus() {
    try {
      // Collect information from various Bitcoin Core RPC calls
      const [info, walletInfo, networkInfo] = await Promise.all([
        BitcoinService.getBlockchainInfo(),
        BitcoinService.getWalletInfo(),
        BitcoinService.getNetworkInfo()
      ]);
      
      // Format the data into a structured response
      return {
        blockchain: {
          chain: info.chain,
          blocks: info.blocks,
          headers: info.headers,
          bestBlockHash: info.bestblockhash,
          difficulty: info.difficulty,
          medianTime: info.mediantime
        },
        wallet: {
          name: walletInfo.walletname,
          balance: walletInfo.balance,
          txCount: walletInfo.txcount,
          keyPoolSize: walletInfo.keypoolsize
        },
        network: {
          version: networkInfo.version,
          subversion: networkInfo.subversion,
          connections: networkInfo.connections,
          networks: networkInfo.networks
        }
      };
    } catch (err) {
      console.error('Error getting Bitcoin node status:', err);
      throw err;
    }
  }
}

module.exports = BitcoinNode;