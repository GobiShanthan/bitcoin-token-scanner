// removeDuplicates.js

// ✅ Ensure we're using the correct database and collection
const db = db.getSiblingDB("tsbscanner");
const collection = db.tokens;

async function removeStrictDuplicates() {
  const seen = new Set();
  const duplicates = [];
  const cursor = collection.find();
  let checked = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    checked++;

    // Normalize metadata
    let parsedMetadata = doc.metadata;
    if (typeof parsedMetadata === "string") {
      try {
        parsedMetadata = JSON.stringify(JSON.parse(parsedMetadata));
      } catch (err) {
        print(`⚠️ Failed to parse metadata for tokenId: ${doc.tokenId}, using raw string`);
        parsedMetadata = doc.metadata;
      }
    }

    // Composite key for strict deduplication
    const key = `${doc.tokenId}-${doc.txid}-${doc.amount}-${doc.timestamp}-${parsedMetadata}`;

    // Debug: show everything being evaluated
    print(`🔍 Checking [${checked}]:`);
    print(`   tokenId:   ${doc.tokenId}`);
    print(`   txid:      ${doc.txid}`);
    print(`   amount:    ${doc.amount}`);
    print(`   timestamp: ${doc.timestamp}`);
    print(`   key:       ${key}`);
    print(`--------------------------------------------------`);

    if (seen.has(key)) {
      print(`🚨 DUPLICATE DETECTED`);
      duplicates.push(doc._id);
    } else {
      seen.add(key);
    }
  }

  print(`🔍 Scanned ${checked} documents`);
  print(`🗑️ Duplicates identified: ${duplicates.length}`);

  if (duplicates.length > 0) {
    const result = await collection.deleteMany({ _id: { $in: duplicates } });
    print(`✅ Deleted ${result.deletedCount} strict duplicates`);
  } else {
    print("✅ No strict duplicates found");
  }
}

removeStrictDuplicates();
