// // services/bitcoinService.js
// const Client = require('bitcoin-core');
// const config = require('../config/config');

// // Configure Bitcoin Core client
// const client = new Client({
//   network: config.bitcoin.network,
//   username: config.bitcoin.username,
//   password: config.bitcoin.password,
//   port: config.bitcoin.port,
//   host: config.bitcoin.host
// });

// /**
//  * Service for interacting with Bitcoin Core
//  */
// class BitcoinService {
//   /**
//    * Get blockchain information
//    * @returns {Promise<Object>} Blockchain info
//    */
//   static async getBlockchainInfo() {
//     return await client.getBlockchainInfo();
//   }

//   /**
//    * Get wallet information
//    * @returns {Promise<Object>} Wallet info
//    */
//   static async getWalletInfo() {
//     return await client.getWalletInfo();
//   }

//   /**
//    * Get network information
//    * @returns {Promise<Object>} Network info
//    */
//   static async getNetworkInfo() {
//     return await client.getNetworkInfo();
//   }

//   /**
//    * Get block hash for a given height
//    * @param {number} height - Block height
//    * @returns {Promise<string>} Block hash
//    */
//   static async getBlockHash(height) {
//     return await client.getBlockHash(height);
//   }

//   /**
//    * Get block information with transaction data
//    * @param {string} blockHash - Block hash
//    * @param {number} verbosity - Verbosity level (2 includes transaction data)
//    * @returns {Promise<Object>} Block info
//    */
//   static async getBlock(blockHash, verbosity = 2) {
//     return await client.getBlock(blockHash, verbosity);
//   }

//   /**
//    * Get raw transaction data
//    * @param {string} txid - Transaction ID
//    * @param {boolean} verbose - Whether to return verbose data
//    * @returns {Promise<Object>} Transaction data
//    */
//   static async getRawTransaction(txid, verbose = true) {
//     return await client.getRawTransaction(txid, verbose);
//   }
// }

// module.exports = BitcoinService;


const Client = require('bitcoin-core');
const axios = require('axios');
const config = require('../config/config');

const useMempool = process.env.USE_MEMPOOL_API === 'true';
const mempoolApi = process.env.MEMPOOL_API_URL;



console.log(`🧠 Using ${useMempool ? 'Mempool.space API' : 'Bitcoin Core RPC'} for blockchain data`);


// Configure Bitcoin Core client (for local mode)
const client = new Client({
  network: config.bitcoin.network,
  username: config.bitcoin.username,
  password: config.bitcoin.password,
  port: config.bitcoin.port,
  host: config.bitcoin.host
});

/**
 * Service for interacting with either Bitcoin Core or Mempool API
 */
class BitcoinService {
  static async getBlockchainInfo() {
    if (useMempool) {
      const res = await axios.get(`${mempoolApi}/blocks`);
      const blocks = res.data;
      return {
        blocks: blocks?.[0]?.height || 0,
        chain: 'test',
      };
    }
    return await client.getBlockchainInfo();
  }

  static async getBlockHash(height) {
    if (useMempool) {
      const res = await axios.get(`${mempoolApi}/block-height/${height}`);
      return res.data;
    }
    return await client.getBlockHash(height);
  }

  static async getBlock(blockHash, verbosity = 2) {
    if (useMempool) {
      const [blockMeta, blockTxs] = await Promise.all([
        axios.get(`${mempoolApi}/block/${blockHash}`),
        axios.get(`${mempoolApi}/block/${blockHash}/txs`)
      ]);
      return {
        tx: blockTxs.data,
        time: blockMeta.data.timestamp,
        height: blockMeta.data.height,
        hash: blockHash
      };
    }
    return await client.getBlock(blockHash, verbosity);
  }

  static async getRawTransaction(txid, verbose = true) {
    if (useMempool) {
      const res = await axios.get(`${mempoolApi}/tx/${txid}`);
      return res.data;
    }
    return await client.getRawTransaction(txid, verbose);
  }

  static async getWalletInfo() {
    if (useMempool) {
      return {
        walletname: 'mempool-api',
        balance: 0,
        txcount: 0,
        keypoolsize: 0
      };
    }
    return await client.getWalletInfo();
  }

  static async getNetworkInfo() {
    if (useMempool) {
      return {
        version: 'mempool-api',
        subversion: 'mempool-client',
        connections: 0,
        networks: []
      };
    }
    return await client.getNetworkInfo();
  }
}

module.exports = BitcoinService;
