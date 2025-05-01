// // scanner/scannerWorker.js
// const mongoose = require('mongoose');
// const BitcoinService = require('../services/bitcoinService');
// const TokenParser = require('../utils/tokenParser');

// // Load .env config
// require('dotenv').config();

// // Load DB Token model
// const TokenModel = require('../models/TokenMongo'); // We'll create this next

// let lastScannedHeight = 0;

// async function connectToMongo() {
//   await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tsbscanner', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   });
//   console.log('✅ Connected to MongoDB');
// }

// async function getLastScannedHeight() {
//   const latest = await TokenModel.findOne().sort({ blockHeight: -1 });
//   return latest ? latest.blockHeight : 4321372; // default fallback
// }

// async function scanNewBlocks() {
//   const info = await BitcoinService.getBlockchainInfo();
//   const currentHeight = info.blocks;

//   for (let height = lastScannedHeight + 1; height <= currentHeight; height++) {
//     const blockHash = await BitcoinService.getBlockHash(height);
//     const block = await BitcoinService.getBlock(blockHash);

//     console.log(`🔍 Scanning block ${height}...`);

//     for (const tx of block.tx) {
//       for (const vin of tx.vin) {
//         if (vin.txinwitness && vin.txinwitness.length >= 2) {
//           const script = vin.txinwitness[0];
//           const parsed = TokenParser.parse(script);

//           if (parsed) {
//             const token = new TokenModel({
//               tokenId: parsed.tokenId,
//               amount: parsed.amount,
//               metadata: parsed.metadata,
//               timestamp: parsed.timestamp || block.time,
//               txid: tx.txid,
//               blockHeight: height,
//               blockHash: blockHash,
//               blockTime: block.time,
//               isValidScript: true,
//               typeCode: parsed.typeCode || 0,
//             });

//             await token.save();
//             console.log(`✅ Saved token ${parsed.tokenId}`);
//           }
//         }
//       }
//     }

//     lastScannedHeight = height;
//   }
// }

// async function start() {
//   await connectToMongo();
//   lastScannedHeight = await getLastScannedHeight();

//   await scanNewBlocks(); // initial run
//   setInterval(scanNewBlocks, 30_000); // every 30 sec
// }

// start().catch(console.error);


// scanner/scannerWorker.js
const mongoose = require('mongoose');
const BitcoinService = require('../services/bitcoinService');
const TokenParser = require('../utils/tokenParser');
const BlockProgress = require('../models/BlockProgress');
const TokenModel = require('../models/TokenMongo');

require('dotenv').config();

async function connectToMongo() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tsbscanner', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ Connected to MongoDB');
}

async function getLastScannedHeight() {
  const progress = await BlockProgress.getProgress();
  return progress.lastScannedHeight;
}

async function updateScannedHeight(height, hash) {
  await BlockProgress.updateProgress(height, hash);
}

async function scanNewBlocks() {
  try {
    const blockchainInfo = await BitcoinService.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;
    let lastScanned = await getLastScannedHeight();

    while (lastScanned < currentHeight) {
      const height = lastScanned + 1;

      try {
        const blockHash = await BitcoinService.getBlockHash(height);
        const block = await BitcoinService.getBlock(blockHash);

        console.log(`🔍 Scanning block ${height} (${block.tx.length} txs)`);

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
                  blockHash,
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

        await updateScannedHeight(height, blockHash);
        lastScanned = height;
      } catch (err) {
        console.error(`❌ Error scanning block ${lastScanned + 1}: ${err.message}`);
        break; // exit loop to retry on next interval
      }
    }
  } catch (err) {
    console.error('❌ Error in scanNewBlocks():', err.message);
  }
}

async function start() {
  await connectToMongo();
  await scanNewBlocks(); // Run immediately once
  const interval = parseInt(process.env.SCAN_INTERVAL_MS || '60000', 10);
  setInterval(scanNewBlocks, interval); // Run every minute
}

start().catch(console.error);
