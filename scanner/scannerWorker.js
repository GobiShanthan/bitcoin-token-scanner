// scanner/scannerWorker.js
const mongoose = require('mongoose');
const BitcoinService = require('../services/bitcoinService');
const TokenParser = require('../utils/tokenParser');

// Load .env config
require('dotenv').config();

// Load DB Token model
const TokenModel = require('../models/TokenMongo'); // We'll create this next

let lastScannedHeight = 0;

async function connectToMongo() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tsbscanner', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ Connected to MongoDB');
}

async function getLastScannedHeight() {
  const latest = await TokenModel.findOne().sort({ blockHeight: -1 });
  return latest ? latest.blockHeight : 4321372; // default fallback
}

async function scanNewBlocks() {
  const info = await BitcoinService.getBlockchainInfo();
  const currentHeight = info.blocks;

  for (let height = lastScannedHeight + 1; height <= currentHeight; height++) {
    const blockHash = await BitcoinService.getBlockHash(height);
    const block = await BitcoinService.getBlock(blockHash);

    console.log(`🔍 Scanning block ${height}...`);

    for (const tx of block.tx) {
      for (const vin of tx.vin) {
        if (vin.txinwitness && vin.txinwitness.length >= 2) {
          const script = vin.txinwitness[0];
          const parsed = TokenParser.parse(script);

          if (parsed) {
            const token = new TokenModel({
              tokenId: parsed.tokenId,
              amount: parsed.amount,
              metadata: parsed.metadata,
              timestamp: parsed.timestamp || block.time,
              txid: tx.txid,
              blockHeight: height,
              blockHash: blockHash,
              blockTime: block.time,
              isValidScript: true,
              typeCode: parsed.typeCode || 0,
            });

            await token.save();
            console.log(`✅ Saved token ${parsed.tokenId}`);
          }
        }
      }
    }

    lastScannedHeight = height;
  }
}

async function start() {
  await connectToMongo();
  lastScannedHeight = await getLastScannedHeight();

  await scanNewBlocks(); // initial run
  setInterval(scanNewBlocks, 30_000); // every 30 sec
}

start().catch(console.error);
