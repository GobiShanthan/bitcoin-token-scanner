const path = require('path');

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    bitcoin: {
      network: 'testnet',
      username: 'admin',
      password: '1234',
      port: 18332,
      host: 'localhost'
    },
    cache: {
      ttl: 60 * 1000
    },
    scan: {
      dynamic: false,
      fixedStart: 4321372
    },
    mongodb: {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017/tsbscanner'
    }
  },

  production: {
    bitcoin: {
      network: process.env.BTC_NETWORK || 'testnet',
      username: process.env.BTC_USERNAME || 'admin',
      password: process.env.BTC_PASSWORD || '1234',
      port: process.env.BTC_PORT || 18332,
      host: process.env.BTC_HOST || 'localhost'
    },
    cache: {
      ttl: process.env.CACHE_TTL || 5 * 60 * 1000
    },
    scan: {
      maxBlocks: process.env.MAX_BLOCKS || 100
    },
    mongodb: {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017/tsbscanner'
    }
  },

  test: {
    bitcoin: {
      network: 'testnet',
      username: 'admin',
      password: '1234',
      port: 18332,
      host: 'localhost'
    },
    cache: {
      ttl: 1000
    },
    scan: {
      maxBlocks: 10
    },
    mongodb: {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017/tsbscanner'
    }
  }
};

module.exports = config[env];
