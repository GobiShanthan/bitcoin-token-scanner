// // utils/tokenParser.js
// /**
//  * Parses token data from a Bitcoin witness script hex string
//  * based on your specific TSB token format
//  */
// // utils/tokenParser.js

// class TokenParser {
//   static parse(witnessHex) {
//     try {
//       const buffer = Buffer.from(witnessHex, 'hex');
//       let offset = 0;

//       // 1. Expect OP_TRUE (0x51)
//       if (buffer[offset++] !== 0x51) {
//         console.log('Not starting with OP_TRUE');
//         return null;
//       }

//       // 2. Expect OP_IF (0x63)
//       if (buffer[offset++] !== 0x63) {
//         console.log('Missing OP_IF');
//         return null;
//       }

//       // 3. Check marker push (0x03 and "TSB")
//       if (buffer[offset++] !== 0x03) {
//         console.log('Missing marker push');
//         return null;
//       }
//       const marker = buffer.slice(offset, offset + 3).toString();
//       if (marker !== 'TSB') {
//         console.log('Invalid marker');
//         return null;
//       }
//       offset += 3;

//       // 4. TokenID
//       if (buffer[offset++] !== 0x10) { // length 16
//         console.log('Invalid token ID length');
//         return null;
//       }
//       const tokenIdRaw = buffer.slice(offset, offset + 16);
//       const tokenId = tokenIdRaw.toString().replace(/\0+$/, '');
//       offset += 16;

//       // 5. Amount
//       if (buffer[offset++] !== 0x08) {
//         console.log('Invalid amount length');
//         return null;
//       }
//       const amountBuf = buffer.slice(offset, offset + 8);
//       const amount = amountBuf.readBigUInt64BE(0);
//       offset += 8;

//       // 6. TypeCode
//       const typeCodeBuf = buffer[offset++];
//       let typeCode = typeCodeBuf;
//       // Convert OP_N values to integers
// if (typeCode >= 0x51 && typeCode <= 0x60) {
//   typeCode = typeCode - 0x50;
// }

//       // 7. Expect 4x OP_DROP (0x75)
//       for (let i = 0; i < 4; i++) {
//         if (buffer[offset++] !== 0x75) {
//           console.log('Missing one of 4 OP_DROP');
//           return null;
//         }
//       }

//       // 8. Metadata
//       const metadataLength = buffer[offset++];
//       const metadataRaw = buffer.slice(offset, offset + metadataLength);
//       const metadata = metadataRaw.toString();
//       offset += metadataLength;

//       // 9. Timestamp
//       if (buffer[offset++] !== 0x08) {
//         console.log('Missing timestamp length byte');
//         return null;
//       }
//       const timestampBuf = buffer.slice(offset, offset + 8);
//       const timestamp = timestampBuf.readBigUInt64BE(0);
//       offset += 8;

//       // 10. Expect 2x OP_DROP
//       if (buffer[offset++] !== 0x75 || buffer[offset++] !== 0x75) {
//         console.log('Missing 2 OP_DROP after metadata/timestamp');
//         return null;
//       }

//       // 11. Expect OP_TRUE (0x51)
//       if (buffer[offset++] !== 0x51) {
//         console.log('Missing final OP_TRUE');
//         return null;
//       }

//       return {
//         tokenId,
//         amount: Number(amount),
//         typeCode,
//         metadata,
//         timestamp: Number(timestamp),
//         isValid: true
//       };

//     } catch (err) {
//       console.error('Error parsing token data:', err);
//       return null;
//     }
//   }
// }

// module.exports = TokenParser;
class TokenParser {
  static parse(witnessHex) {
    try {
      const buffer = Buffer.from(witnessHex, 'hex');
      let offset = 0;

      console.log(`DEBUG: Starting parse, buffer length: ${buffer.length}`);

      // 1. Expect OP_TRUE (0x51)
      if (buffer[offset++] !== 0x51) {
        console.log('DEBUG: Not starting with OP_TRUE');
        return null;
      }

      // 2. Expect OP_IF (0x63)
      if (buffer[offset++] !== 0x63) {
        console.log('DEBUG: Missing OP_IF');
        return null;
      }

      // 3. Check marker push (0x03 and "TSB")
      if (buffer[offset++] !== 0x03) {
        console.log('DEBUG: Missing marker push');
        return null;
      }
      const marker = buffer.slice(offset, offset + 3).toString();
      if (marker !== 'TSB') {
        console.log('DEBUG: Invalid marker');
        return null;
      }
      offset += 3;

      console.log(`DEBUG: TSB marker found, offset now: ${offset}`);

      // 4. TokenID (16 bytes)
      if (buffer[offset++] !== 0x10) {
        console.log('DEBUG: Invalid token ID length');
        return null;
      }
      const tokenIdRaw = buffer.slice(offset, offset + 16);
      const tokenId = tokenIdRaw.toString().replace(/\0+$/, '');
      offset += 16;

      console.log(`DEBUG: Token ID: "${tokenId}", offset now: ${offset}`);

      // 5. Amount (8 bytes)
      if (buffer[offset++] !== 0x08) {
        console.log('DEBUG: Invalid amount length');
        return null;
      }
      const amountBuf = buffer.slice(offset, offset + 8);
      const amount = amountBuf.readBigUInt64BE(0);
      offset += 8;

      console.log(`DEBUG: Amount: ${amount}, offset now: ${offset}`);

      // 6. TypeCode
      let typeCode = buffer[offset++];
      
      // Convert OP_N values to integers
      if (typeCode >= 0x51 && typeCode <= 0x60) {
        // OP_1 through OP_16 (0x51-0x60)
        typeCode = typeCode - 0x50;
      } else if (typeCode === 0x00) {
        // OP_0
        typeCode = 0;
      }

      console.log(`DEBUG: TypeCode: ${typeCode}, offset now: ${offset}`);

      // 7. Expect 4x OP_DROP (0x75)
      for (let i = 0; i < 4; i++) {
        if (buffer[offset++] !== 0x75) {
          console.log(`DEBUG: Missing OP_DROP ${i + 1}/4`);
          return null;
        }
      }

      console.log(`DEBUG: Passed 4x OP_DROP, offset now: ${offset}`);

      // 8. 🔧 ENHANCED METADATA PARSING WITH DEBUG
      let metadata = '';
      let metadataLength = 0;
      let pushType = 'unknown';
      
      const pushOpcode = buffer[offset];
      console.log(`DEBUG: Metadata push opcode: 0x${pushOpcode.toString(16)} at offset ${offset}`);
      
      if (pushOpcode >= 0x01 && pushOpcode <= 0x4b) {
        // Direct push (1-75 bytes) - SPX format and smaller
        metadataLength = buffer[offset++];
        pushType = 'direct';
        console.log(`DEBUG: Direct push, length: ${metadataLength}, new offset: ${offset}`);
      } else if (pushOpcode === 0x4c) {
        // OP_PUSHDATA1: next 1 byte is length (76-255 bytes) - STEVEN format
        console.log(`DEBUG: Found OP_PUSHDATA1 at offset ${offset}`);
        offset++; // Skip OP_PUSHDATA1 (0x4c)
        metadataLength = buffer[offset++];
        pushType = 'pushdata1';
        console.log(`DEBUG: OP_PUSHDATA1 metadata length: ${metadataLength}, new offset: ${offset}`);
      } else if (pushOpcode === 0x4d) {
        // OP_PUSHDATA2: next 2 bytes are length (256-65535 bytes)
        offset++; // Skip OP_PUSHDATA2
        metadataLength = buffer.readUInt16LE(offset);
        offset += 2;
        pushType = 'pushdata2';
        console.log(`DEBUG: OP_PUSHDATA2 metadata length: ${metadataLength}, new offset: ${offset}`);
      } else if (pushOpcode === 0x4e) {
        // OP_PUSHDATA4: next 4 bytes are length (65536+ bytes)
        offset++; // Skip OP_PUSHDATA4
        metadataLength = buffer.readUInt32LE(offset);
        offset += 4;
        pushType = 'pushdata4';
        console.log(`DEBUG: OP_PUSHDATA4 metadata length: ${metadataLength}, new offset: ${offset}`);
      } else {
        // Invalid push opcode
        console.log(`DEBUG: Invalid metadata push opcode: 0x${pushOpcode.toString(16)}`);
        return null;
      }

      // Validate metadata length
      if (metadataLength === 0 || offset + metadataLength > buffer.length) {
        console.log(`DEBUG: Invalid metadata length ${metadataLength} at offset ${offset}, buffer length ${buffer.length}`);
        return null;
      }
      
      // Read metadata
      const metadataRaw = buffer.slice(offset, offset + metadataLength);
      metadata = metadataRaw.toString();
      offset += metadataLength;

      console.log(`DEBUG: Metadata read (${metadataLength} bytes): "${metadata.substring(0, 50)}..."`);
      console.log(`DEBUG: After reading metadata, offset: ${offset}, buffer length: ${buffer.length}`);
      console.log(`DEBUG: Remaining bytes: ${buffer.length - offset}`);
      console.log(`DEBUG: Next 10 bytes: ${buffer.slice(offset, offset + 10).toString('hex')}`);

      // Try to parse metadata as JSON if it looks like JSON
      let parsedMetadata = metadata;
      if (metadata.trim().startsWith('{') && metadata.trim().endsWith('}')) {
        try {
          parsedMetadata = JSON.parse(metadata);
          console.log(`DEBUG: Successfully parsed JSON metadata`);
        } catch (e) {
          // Keep as string if JSON parsing fails
          console.log(`DEBUG: Failed to parse as JSON: ${e.message}`);
          parsedMetadata = metadata;
        }
      }

      // 9. Timestamp (8 bytes)
      console.log(`DEBUG: Looking for timestamp length marker at offset ${offset}`);
      if (offset >= buffer.length) {
        console.log(`DEBUG: Reached end of buffer before timestamp`);
        return null;
      }
      
      const timestampMarker = buffer[offset];
      console.log(`DEBUG: Timestamp marker: 0x${timestampMarker.toString(16)} (expected 0x08)`);
      
      if (buffer[offset++] !== 0x08) {
        console.log(`DEBUG: Missing timestamp length byte - expected 0x08, got 0x${timestampMarker.toString(16)}`);
        return null;
      }
      
      if (offset + 8 > buffer.length) {
        console.log(`DEBUG: Not enough bytes for timestamp`);
        return null;
      }
      
      const timestampBuf = buffer.slice(offset, offset + 8);
      const timestamp = timestampBuf.readBigUInt64BE(0);
      offset += 8;

      console.log(`DEBUG: Timestamp: ${timestamp}, offset now: ${offset}`);

      // 10. Expect 2x OP_DROP
      console.log(`DEBUG: Looking for 2x OP_DROP at offset ${offset}`);
      if (offset + 2 > buffer.length) {
        console.log(`DEBUG: Not enough bytes for 2x OP_DROP`);
        return null;
      }
      
      if (buffer[offset++] !== 0x75 || buffer[offset++] !== 0x75) {
        console.log(`DEBUG: Missing 2 OP_DROP after metadata/timestamp`);
        return null;
      }

      console.log(`DEBUG: Passed 2x OP_DROP, offset now: ${offset}`);

      // 11. Expect OP_TRUE (0x51)
      if (offset >= buffer.length) {
        console.log(`DEBUG: Reached end of buffer before final OP_TRUE`);
        return null;
      }
      
      if (buffer[offset++] !== 0x51) {
        console.log(`DEBUG: Missing final OP_TRUE`);
        return null;
      }

      console.log(`DEBUG: Passed final OP_TRUE, offset now: ${offset}`);

      // 12. 🔧 CRITICAL: Expect OP_ENDIF (0x68)
      if (offset >= buffer.length) {
        console.log(`DEBUG: Reached end of buffer before OP_ENDIF`);
        return null;
      }
      
      if (buffer[offset++] !== 0x68) {
        console.log(`DEBUG: Missing OP_ENDIF`);
        return null;
      }

      console.log(`DEBUG: Passed OP_ENDIF, offset now: ${offset}`);

      // 13. Verify we've consumed the entire script
      if (offset !== buffer.length) {
        console.log(`DEBUG: Script has extra bytes. Expected: ${offset}, actual: ${buffer.length}`);
      }

      console.log(`DEBUG: Successfully parsed TSB token!`);

      return {
        tokenId,
        amount: Number(amount),
        typeCode,
        metadata: parsedMetadata, // Could be string or parsed JSON object
        rawMetadata: metadata, // Always the raw string
        metadataLength: metadataLength,
        metadataPushType: pushType,
        timestamp: Number(timestamp),
        isValid: true
      };

    } catch (err) {
      console.error('DEBUG: Error parsing TSB token:', err);
      console.error('DEBUG: Error stack:', err.stack);
      return null;
    }
  }

  // Utility method to get token type name
  static getTokenTypeName(typeCode) {
    const types = {
      0: 'Fungible Token (FT)',
      1: 'Fungible Token (FT)',
      4: 'Oracle-Verified Token',
      8: 'DAO Governance Token',
      10: 'Wrapped Asset Token'
    };
    return types[typeCode] || `Unknown Type (${typeCode})`;
  }

  // Test method with both actual token formats
  static testParser() {
    console.log('🧪 Testing enhanced TSB parser with real token data...\n');
    
    const testCases = [
      {
        name: 'SPX (Wrapped Asset)',
        witness: "51630354534210535058000000000000000000000000000800000002540be4005a757575751d53796e746865746963205326502035303020496e64657820546f6b656e08000000006813337e75755168",
        expected: { tokenId: 'SPX', typeCode: 10, metadataType: 'string' }
      },
      {
        name: 'STEVEN (Fungible Token)',
        witness: "5163035453421053544556454e000000000000000000000800000000000f424051757575754c837b226e616d65223a225465737420546f6b656e222c2273796d626f6c223a2254455354222c22646563696d616c73223a362c226465736372697074696f6e223a224120746573742054534220746f6b656e206f6e206c6f63616c20426974636f696e20546573746e65743320287e2f2e626974636f696e2f746573746e65743329227d08000000006838738675755168",
        expected: { tokenId: 'STEVEN', typeCode: 1, metadataType: 'json' }
      }
    ];

    let allPassed = true;

    testCases.forEach(testCase => {
      console.log(`Testing ${testCase.name}...`);
      const result = TokenParser.parse(testCase.witness);
      
      if (result) {
        console.log(`✅ SUCCESS: ${result.tokenId}`);
        console.log(`   Type: ${result.typeCode} (${TokenParser.getTokenTypeName(result.typeCode)})`);
        console.log(`   Amount: ${result.amount.toLocaleString()}`);
        console.log(`   Metadata: ${result.metadataPushType} push (${result.metadataLength} bytes)`);
        
        if (typeof result.metadata === 'object') {
          console.log(`   JSON metadata:`, result.metadata);
        } else {
          console.log(`   String metadata: "${result.metadata}"`);
        }
        
        // Verify expected values
        if (result.tokenId === testCase.expected.tokenId && result.typeCode === testCase.expected.typeCode) {
          console.log(`   ✅ Values match expected results`);
        } else {
          console.log(`   ❌ Values don't match expected results`);
          allPassed = false;
        }
      } else {
        console.log(`❌ FAILED: Could not parse ${testCase.name}`);
        allPassed = false;
      }
      console.log('');
    });

    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Enhanced parser ready for production.');
    } else {
      console.log('❌ Some tests failed. Check parser implementation.');
    }

    return allPassed;
  }
}

module.exports = TokenParser;