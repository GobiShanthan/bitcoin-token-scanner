// services/bitcoinService.js
const Client = require('bitcoin-core');
const config = require('../config/config');

// Configure Bitcoin Core client
const client = new Client({
  network: config.bitcoin.network,
  username: config.bitcoin.username,
  password: config.bitcoin.password,
  port: config.bitcoin.port,
  host: config.bitcoin.host
});

/**
 * Service for interacting with Bitcoin Core
 */
class BitcoinService {
  /**
   * Get blockchain information
   * @returns {Promise<Object>} Blockchain info
   */
  static async getBlockchainInfo() {
    return await client.getBlockchainInfo();
  }

  /**
   * Get wallet information
   * @returns {Promise<Object>} Wallet info
   */
  static async getWalletInfo() {
    return await client.getWalletInfo();
  }

  /**
   * Get network information
   * @returns {Promise<Object>} Network info
   */
  static async getNetworkInfo() {
    return await client.getNetworkInfo();
  }

  /**
   * Get block hash for a given height
   * @param {number} height - Block height
   * @returns {Promise<string>} Block hash
   */
  static async getBlockHash(height) {
    return await client.getBlockHash(height);
  }

  /**
   * Get block information with transaction data
   * @param {string} blockHash - Block hash
   * @param {number} verbosity - Verbosity level (2 includes transaction data)
   * @returns {Promise<Object>} Block info
   */
  static async getBlock(blockHash, verbosity = 2) {
    return await client.getBlock(blockHash, verbosity);
  }

  /**
   * Get raw transaction data
   * @param {string} txid - Transaction ID
   * @param {boolean} verbose - Whether to return verbose data
   * @returns {Promise<Object>} Transaction data
   */
  static async getRawTransaction(txid, verbose = true) {
    return await client.getRawTransaction(txid, verbose);
  }
}

module.exports = BitcoinService;