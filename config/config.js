// config/config.js - Application configuration
const path = require('path');

// Environment-specific configurations
const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    bitcoin: {
      network: 'regtest',
      username: 'admin',  // Replace with your actual RPC username
      password: '1234',   // Replace with your actual RPC password
      port: 18443,        // Default regtest port
      host: 'localhost'
    },
    cache: {
      ttl: 60 * 1000      // 1 minute cache TTL
    },
    scan: {
      maxBlocks: 100      // Default number of blocks to scan
    }
  },
  production: {
    bitcoin: {
      network: process.env.BTC_NETWORK || 'regtest',
      username: process.env.BTC_USERNAME || 'admin',
      password: process.env.BTC_PASSWORD || '1234',
      port: process.env.BTC_PORT || 18443,
      host: process.env.BTC_HOST || 'localhost'
    },
    cache: {
      ttl: process.env.CACHE_TTL || 5 * 60 * 1000  // 5 minutes cache TTL
    },
    scan: {
      maxBlocks: process.env.MAX_BLOCKS || 100     // Default number of blocks to scan
    }
  },
  test: {
    bitcoin: {
      network: 'regtest',
      username: 'test',
      password: 'test',
      port: 18443,
      host: 'localhost'
    },
    cache: {
      ttl: 1000  // 1 second cache TTL for testing
    },
    scan: {
      maxBlocks: 10
    }
  }
};

module.exports = config[env];