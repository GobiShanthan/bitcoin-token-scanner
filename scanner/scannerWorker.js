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

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

console.log('🧪 MONGO_URI Inside scannerWorker:', process.env.MONGO_URI);
async function connectToMongo() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tsbscanner', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ Connected to MongoDB');
}

// Find your getLastScannedHeight function and replace it with this:
async function getLastScannedHeight() {
  // 🔄 CHECK FOR FORCED RESET FIRST
  if (process.env.FORCE_START_BLOCK) {
    const forceBlock = parseInt(process.env.FORCE_START_BLOCK, 10);
    
    // Get current progress to see if we need to reset
    const currentProgress = await BlockProgress.getProgress();
    
    if (currentProgress.lastScannedHeight !== forceBlock) {
      console.log(`🔄 FORCE RESET: Current block ${currentProgress.lastScannedHeight} → Target block ${forceBlock}`);
      
      try {
        await BlockProgress.updateProgress(forceBlock, null);
        console.log(`✅ Scanner successfully reset to block ${forceBlock}`);
        return forceBlock;
      } catch (err) {
        console.error(`❌ Failed to reset scanner: ${err.message}`);
      }
    } else {
      console.log(`✅ Scanner already at target block ${forceBlock}`);
    }
  }
  
  const progress = await BlockProgress.getProgress();
  return progress.lastScannedHeight;
}


async function updateScannedHeight(height, hash) {
  await BlockProgress.updateProgress(height, hash);
}

async function retryWithBackoff(fn, args = [], retries = 5, delay = 200, label = 'retry') {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn(...args);
    } catch (err) {
      attempt++;
      if (attempt === retries) throw err;

      const backoff = delay * Math.pow(2, attempt); // exponential
      console.warn(`⚠️ ${label} failed (${attempt}/${retries}), retrying in ${backoff}ms: ${err.message}`);
      await new Promise((res) => setTimeout(res, backoff));
    }
  }
}

/**
 * SMART HYBRID SCANNER - Fast catch-up + Live monitoring
 */
// async function scanNewBlocks() {
//   try {
//     const blockchainInfo = await BitcoinService.getBlockchainInfo();
//     const currentHeight = blockchainInfo.blocks;
//     let lastScanned = await getLastScannedHeight();

//     const blocksToScan = currentHeight - lastScanned;
//     const CATCH_UP_THRESHOLD = 100; // Switch to high-speed if more than 100 blocks behind

//     console.log(`🔍 TSB Scanner - Current height: ${currentHeight}, last scanned: ${lastScanned}`);
//     console.log(`📊 Blocks behind: ${blocksToScan}`);

//     if (blocksToScan > CATCH_UP_THRESHOLD) {
//       // HIGH-SPEED CATCH-UP MODE
//       console.log(`🚀 CATCH-UP MODE: Processing ${blocksToScan} blocks in high-speed mode...`);
//       await highSpeedCatchUp(lastScanned, currentHeight);
//     } else {
//       // NORMAL LIVE MONITORING MODE
//       console.log(`⚡ LIVE MONITORING MODE: Processing ${blocksToScan} blocks normally...`);
//       await normalLiveScanning(lastScanned, currentHeight);
//     }

//   } catch (err) {
//     console.error('❌ FULL ERROR in smart scanNewBlocks():');
//     console.error(err);
//     console.error('Error message:', err.message);
//     console.error('Error stack:', err.stack);
//   }
// }

async function scanNewBlocks() {
  try {
    const blockchainInfo = await BitcoinService.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;
    let lastScanned = await getLastScannedHeight();

    const blocksToScan = currentHeight - lastScanned;
    const CATCH_UP_THRESHOLD = 100;

    console.log(`🔍 TSB Scanner - Current height: ${currentHeight}, last scanned: ${lastScanned}`);
    console.log(`📊 Blocks behind: ${blocksToScan}`);

    // 🔧 CHECK ENVIRONMENT VARIABLES FOR CONTROL
    const disableHighSpeed = process.env.DISABLE_HIGH_SPEED === 'true';
    const forceLiveMode = process.env.FORCE_LIVE_MODE === 'true';
    const apiDelay = parseInt(process.env.API_DELAY_MS || '300', 10);
    const blockDelay = parseInt(process.env.BLOCK_DELAY_MS || '1000', 10);
    const retryDelay = parseInt(process.env.RETRY_DELAY_MS || '200', 10);

    console.log(`⚙️ Config: HIGH_SPEED=${!disableHighSpeed}, FORCE_LIVE=${forceLiveMode}, API_DELAY=${apiDelay}ms, BLOCK_DELAY=${blockDelay}ms`);

    if (disableHighSpeed || forceLiveMode) {
      console.log(`🌐 ENV CONTROLLED: Using live monitoring mode only`);
      console.log(`⚡ LIVE MONITORING MODE: Processing ${blocksToScan} blocks with ENV delays...`);
      
      // Process blocks one by one with ENV-controlled delays
      while (lastScanned < currentHeight) {
        const height = lastScanned + 1;

        try {
          // Pre-API delay
          if (apiDelay > 0) {
            console.log(`⏱️ ENV controlled delay: waiting ${apiDelay}ms before API call...`);
            await new Promise(res => setTimeout(res, apiDelay));
          }

          const blockHash = await retryWithBackoff(BitcoinService.getBlockHash, [height], 5, retryDelay, 'getBlockHash');
          
          // Delay between API calls
          if (apiDelay > 0) {
            await new Promise(res => setTimeout(res, Math.floor(apiDelay / 2)));
          }
          
          const block = await retryWithBackoff(BitcoinService.getBlock, [blockHash], 5, retryDelay, 'getBlock');

          console.log(`🔍 LIVE: Scanning block ${height} (${block.tx.length} txs) for TSB tokens...`);
          
          const tokensFound = await findAllTSBTokensInTransaction(block.tx, height, blockHash, block.time);

          // Save tokens
          if (tokensFound.length > 0) {
            try {
              await TokenModel.insertMany(tokensFound);
              console.log(`💾 LIVE: Saved ${tokensFound.length} TSB tokens from block ${height}`);
              
              for (const token of tokensFound) {
                const tokenType = TokenParser.getTokenTypeName(token.typeCode);
                console.log(`✅ LIVE: Found ${tokenType}: "${token.tokenId}" (${token.amount.toLocaleString()}) in tx ${token.txid}`);
              }
            } catch (err) {
              console.error(`❌ Failed to save tokens from block ${height}:`, err.message);
            }
          }

          await updateScannedHeight(height, blockHash);
          lastScanned = height;

          // Block delay
          if (blockDelay > 0) {
            console.log(`⏱️ ENV controlled block delay: waiting ${blockDelay}ms before next block...`);
            await new Promise(res => setTimeout(res, blockDelay));
          }

        } catch (err) {
          console.error(`❌ Failed to process live block ${height}: ${err.message}`);
          
          // Handle rate limiting errors
          if (err.message.includes('429')) {
            const rateLimitDelay = parseInt(process.env.RATE_LIMIT_DELAY_MS || '30000', 10);
            console.log(`⏸️ Rate limit hit, waiting ${rateLimitDelay}ms before retry...`);
            await new Promise(res => setTimeout(res, rateLimitDelay));
          } else {
            const errorDelay = parseInt(process.env.ERROR_DELAY_MS || '5000', 10);
            console.log(`⏸️ Error occurred, waiting ${errorDelay}ms before retry...`);
            await new Promise(res => setTimeout(res, errorDelay));
          }
          break;
        }
      }

      // Final statistics
      const totalTokens = await TokenModel.countDocuments();
      console.log(`📊 LIVE MONITORING complete - Total tokens in database: ${totalTokens}`);
      
    } else if (blocksToScan > CATCH_UP_THRESHOLD) {
      // HIGH-SPEED CATCH-UP MODE (when not disabled by ENV)
      console.log(`🚀 CATCH-UP MODE: Processing ${blocksToScan} blocks in high-speed mode...`);
      await highSpeedCatchUp(lastScanned, currentHeight);
    } else {
      // NORMAL LIVE MONITORING MODE
      console.log(`⚡ LIVE MONITORING MODE: Processing ${blocksToScan} blocks normally...`);
      await normalLiveScanning(lastScanned, currentHeight);
    }

  } catch (err) {
    console.error('❌ FULL ERROR in smart scanNewBlocks():');
    console.error(err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
  }
}
/**
 * HIGH-SPEED CATCH-UP MODE - Process many blocks quickly
 */
async function highSpeedCatchUp(lastScanned, currentHeight) {
  const BATCH_SIZE = 200; // Process 50 blocks in parallel
  const MAX_CONCURRENT = 16; // Limit concurrent requests

  while (lastScanned < currentHeight) {
    const batchStart = lastScanned + 1;
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, currentHeight);
    const blocksInBatch = batchEnd - batchStart + 1;

    console.log(`🔍 HIGH-SPEED: Processing blocks ${batchStart}-${batchEnd} (${blocksInBatch} blocks)...`);
    const startTime = Date.now();

    try {
      // Create array of block heights to process
      const blockHeights = [];
      for (let height = batchStart; height <= batchEnd; height++) {
        blockHeights.push(height);
      }

      // Process blocks in parallel with concurrency limit
      const processBlock = async (height) => {
        try {
          const blockHash = await retryWithBackoff(BitcoinService.getBlockHash, [height], 3, 100, 'getBlockHash');
          const block = await retryWithBackoff(BitcoinService.getBlock, [blockHash], 3, 100, 'getBlock');
          
          const tokensFound = await findAllTSBTokensInTransaction_Fast(block, height, blockHash);
          
          return { height, tokens: tokensFound.length, tokenList: tokensFound };
        } catch (err) {
          console.error(`❌ Error in high-speed block ${height}:`, err.message);
          return { height, tokens: 0, tokenList: [], error: err.message };
        }
      };

      // Process blocks in parallel batches
      const results = [];
      for (let i = 0; i < blockHeights.length; i += MAX_CONCURRENT) {
        const batch = blockHeights.slice(i, i + MAX_CONCURRENT);
        const batchResults = await Promise.all(batch.map(processBlock));
        results.push(...batchResults);
      }

      // Save all tokens found in this batch
      const allTokens = results.flatMap(r => r.tokenList);
      if (allTokens.length > 0) {
        try {
          await TokenModel.insertMany(allTokens);
          console.log(`💾 Saved ${allTokens.length} tokens from batch`);
        } catch (err) {
          console.error(`❌ Failed to save batch tokens:`, err.message);
          // Try saving individually as fallback
          for (const token of allTokens) {
            try {
              await token.save();
            } catch (e) {
              console.error(`❌ Failed to save token ${token.tokenId}:`, e.message);
            }
          }
        }
      }

      // Update progress
      const successfulBlocks = results.filter(r => !r.error);
      if (successfulBlocks.length > 0) {
        const lastSuccessful = Math.max(...successfulBlocks.map(r => r.height));
        await updateScannedHeight(lastSuccessful, null);
        lastScanned = lastSuccessful;
      }

      // Report progress
      const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      const blocksPerSecond = (blocksInBatch / duration).toFixed(1);
      const remaining = currentHeight - lastScanned;

      console.log(`📊 HIGH-SPEED batch complete (${duration.toFixed(1)}s, ${blocksPerSecond} blocks/s):`);
      console.log(`   Tokens found: ${totalTokens}, Remaining blocks: ${remaining}`);
      
      if (totalTokens > 0) {
        const tokenBlocks = results.filter(r => r.tokens > 0);
        console.log(`   Token blocks: ${tokenBlocks.map(b => `${b.height}(${b.tokens})`).join(', ')}`);
      }

      // Small delay to prevent overwhelming Bitcoin Core
      await new Promise(res => setTimeout(res, 100));

    } catch (err) {
      console.error(`❌ Batch error for blocks ${batchStart}-${batchEnd}:`, err.message);
      break;
    }
  }

  console.log(`🎉 HIGH-SPEED CATCH-UP COMPLETE! Now switching to live monitoring...`);
}

/**
 * NORMAL LIVE MONITORING MODE - Process blocks carefully with full logging
 */
async function normalLiveScanning(lastScanned, currentHeight) {
  while (lastScanned < currentHeight) {
    const height = lastScanned + 1;

    try {
      const blockHash = await retryWithBackoff(BitcoinService.getBlockHash, [height], 5, 200, 'getBlockHash');
      const block = await retryWithBackoff(BitcoinService.getBlock, [blockHash], 5, 200, 'getBlock');

      console.log(`🔍 LIVE: Scanning block ${height} (${block.tx.length} txs) for TSB tokens...`);
      
      const tokensFound = await findAllTSBTokensInTransaction(block.tx, height, blockHash, block.time);

      // Save tokens with individual logging
      if (tokensFound.length > 0) {
        try {
          await TokenModel.insertMany(tokensFound);
          console.log(`💾 LIVE: Saved ${tokensFound.length} TSB tokens from block ${height}`);
          
          // Log each token found with full details
          for (const token of tokensFound) {
            const tokenType = TokenParser.getTokenTypeName(token.typeCode);
            console.log(`✅ LIVE: Found ${tokenType}: "${token.tokenId}" (${token.amount.toLocaleString()}) in tx ${token.txid}`);
          }
        } catch (err) {
          console.error(`❌ Failed to save tokens from block ${height}:`, err.message);
        }
      }

      await updateScannedHeight(height, blockHash);
      lastScanned = height;

      // Rate limiting for live monitoring
      const useMempool = process.env.USE_MEMPOOL_API === 'true';
      const delay = useMempool ? 300 : 100;
      await new Promise(res => setTimeout(res, delay));

    } catch (err) {
      console.error(`❌ Failed to process live block ${height}: ${err.message}`);
      break;
    }
  }

  // Final statistics for live mode
  const totalTokens = await TokenModel.countDocuments();
  console.log(`📊 LIVE MONITORING complete - Total tokens in database: ${totalTokens}`);
}

/**
 * Fast token finding for high-speed mode (less logging)
 */
/**
 * Fast token finding for high-speed mode (less logging)
 */
async function findAllTSBTokensInTransaction_Fast(block, blockHeight, blockHash) {
  const tokens = [];
  const foundTokens = new Set(); // Track tokens found in this transaction

  for (const tx of block.tx) {
    for (const vin of tx.vin) {
      if (vin.txinwitness && vin.txinwitness.length >= 2) {
        const witnessScript = vin.txinwitness[0];
        
        if (witnessScript && witnessScript.length > 50 && witnessScript.includes('545342')) {
          const parsed = TokenParser.parse(witnessScript);
          
          if (parsed) {
            // Create unique key for this token in this transaction
            const tokenKey = `${tx.txid}-${parsed.tokenId}`;
            
            // Skip if we already found this token in this transaction
            if (foundTokens.has(tokenKey)) {
              console.log(`⚠️ Skipping duplicate ${parsed.tokenId} in tx ${tx.txid}`);
              continue;
            }
            
            foundTokens.add(tokenKey);
            
            const token = new TokenModel({
              tokenId: parsed.tokenId,
              amount: parsed.amount,
              metadata: parsed.rawMetadata || parsed.metadata,
              timestamp: parsed.timestamp || block.time,
              txid: tx.txid,
              blockHeight: blockHeight,
              blockHash: blockHash,
              blockTime: block.time,
              isValidScript: true,
              typeCode: parsed.typeCode || 0,
            });
            
            tokens.push(token);
            console.log(`✅ Found unique TSB token: "${parsed.tokenId}" in tx ${tx.txid}`);
          }
        }
      }
    }
  }

  return tokens;
}

/**
 * Detailed token finding for live mode (full logging)
 */
async function findAllTSBTokensInTransaction(transactions, blockHeight, blockHash, blockTime) {
  const tokens = [];

  for (const tx of transactions) {
    if (!tx.vin[0].txid) continue;

    for (let vinIndex = 0; vinIndex < tx.vin.length; vinIndex++) {
      const vin = tx.vin[vinIndex];
      
      if (vin.txinwitness && vin.txinwitness.length >= 2) {
        const witnessScript = vin.txinwitness[0];
        
        if (witnessScript && witnessScript.length > 50) {
          if (witnessScript.includes('545342')) { // "TSB" in hex
            const parsed = TokenParser.parse(witnessScript);
            
            if (parsed) {
              const token = new TokenModel({
                tokenId: parsed.tokenId,
                amount: parsed.amount,
                metadata: parsed.rawMetadata || parsed.metadata,
                timestamp: parsed.timestamp || blockTime,
                txid: tx.txid,
                blockHeight: blockHeight,
                blockHash: blockHash,
                blockTime: blockTime,
                isValidScript: true,
                typeCode: parsed.typeCode || 0,
              });
              
              tokens.push(token);
              
              // Full logging for live mode
              const tokenType = TokenParser.getTokenTypeName(parsed.typeCode);
              const metadataInfo = parsed.metadataLength ? `${parsed.metadataLength}b ${parsed.metadataPushType}` : 'metadata';
              
              console.log(`✅ LIVE: Found TSB ${tokenType}: "${parsed.tokenId}" in tx ${tx.txid}`);
              console.log(`   Amount: ${parsed.amount.toLocaleString()}, Metadata: ${metadataInfo}`);
              
              if (typeof parsed.metadata === 'object') {
                console.log(`   JSON metadata: ${parsed.metadata.name || 'unnamed'} (${parsed.metadata.symbol || 'no symbol'})`);
              }
            } else {
              // Debug failed parsing in live mode
              if (process.env.TOKEN_DEBUG === 'true') {
                console.log(`🔍 LIVE: TSB marker found but parsing failed in tx ${tx.txid}`);
              }
            }
          }
        }
      }
    }
  }

  return tokens;
}





// Add this at the top of your start() function:
// Add this to your start() function, right after connecting to MongoDB:
async function start() {
  try {
    await connectToMongo();

    // 🚨 EMERGENCY RESET - Force update database to target block
    if (process.env.FORCE_START_BLOCK === '4429585') {
      console.log(`🚨 EMERGENCY RESET: Forcing database to block 4429585`);
      
      try {
        // Direct database update
        await BlockProgress.updateOne(
          {},
          { 
            lastScannedHeight: 4429585,
            lastScannedHash: null,
            updatedAt: new Date()
          },
          { upsert: true }
        );
        
        console.log(`✅ EMERGENCY RESET COMPLETE: Database updated to block 4429585`);
        
        // Clear the emergency flag
        process.env.FORCE_START_BLOCK = 'DONE';
        
      } catch (err) {
        console.error(`❌ EMERGENCY RESET FAILED:`, err);
      }
    }

    // Remove debug/test mode for production
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧪 Testing enhanced TSB parser...');
      const parserTest = TokenParser.testParser();
      if (!parserTest) {
        console.error('❌ Parser test failed! Check TokenParser implementation.');
        process.exit(1);
      }
    }

    const isMempool = process.env.USE_MEMPOOL_API === 'true';
    const interval = parseInt(process.env.SCAN_INTERVAL_MS || '60000', 10);

    console.log(`🚀 TSB Scanner starting on Heroku...`);
    console.log(`   API mode: ${isMempool ? 'Mempool.space' : 'Bitcoin Core RPC'}`);
    console.log(`   Scan interval: ${interval} ms`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    
    // Get current status AFTER potential reset
    const progress = await BlockProgress.findOne();
    const totalTokens = await TokenModel.countDocuments();
    console.log(`   Current position: Block ${progress?.lastScannedHeight || 'Not started'}`);
    console.log(`   Total tokens found: ${totalTokens}`);
    
    // Initial scan
    await scanNewBlocks();
    
    // Set up recurring scans with longer interval for Heroku
    setInterval(scanNewBlocks, interval);

    console.log(`🌐 TSB scanner running on Heroku and monitoring for new blocks...`);
  } catch (err) {
    console.error('❌ Failed to start scanner on Heroku:', err);
    process.exit(1);
  }
}

start().catch(console.error);
