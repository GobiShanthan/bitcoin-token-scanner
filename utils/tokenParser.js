// utils/tokenParser.js
/**
 * Parses token data from a Bitcoin witness script hex string
 * based on your specific TSB token format
 */
// utils/tokenParser.js

class TokenParser {
  static parse(witnessHex) {
    try {
      const buffer = Buffer.from(witnessHex, 'hex');
      let offset = 0;

      // 1. Expect OP_TRUE (0x51)
      if (buffer[offset++] !== 0x51) {
        console.log('Not starting with OP_TRUE');
        return null;
      }

      // 2. Expect OP_IF (0x63)
      if (buffer[offset++] !== 0x63) {
        console.log('Missing OP_IF');
        return null;
      }

      // 3. Check marker push (0x03 and "TSB")
      if (buffer[offset++] !== 0x03) {
        console.log('Missing marker push');
        return null;
      }
      const marker = buffer.slice(offset, offset + 3).toString();
      if (marker !== 'TSB') {
        console.log('Invalid marker');
        return null;
      }
      offset += 3;

      // 4. TokenID
      if (buffer[offset++] !== 0x10) { // length 16
        console.log('Invalid token ID length');
        return null;
      }
      const tokenIdRaw = buffer.slice(offset, offset + 16);
      const tokenId = tokenIdRaw.toString().replace(/\0+$/, '');
      offset += 16;

      // 5. Amount
      if (buffer[offset++] !== 0x08) {
        console.log('Invalid amount length');
        return null;
      }
      const amountBuf = buffer.slice(offset, offset + 8);
      const amount = amountBuf.readBigUInt64BE(0);
      offset += 8;

      // 6. TypeCode
      const typeCodeBuf = buffer[offset++];
      let typeCode = typeCodeBuf;
      // Convert OP_N values to integers
if (typeCode >= 0x51 && typeCode <= 0x60) {
  typeCode = typeCode - 0x50;
}

      // 7. Expect 4x OP_DROP (0x75)
      for (let i = 0; i < 4; i++) {
        if (buffer[offset++] !== 0x75) {
          console.log('Missing one of 4 OP_DROP');
          return null;
        }
      }

      // 8. Metadata
      const metadataLength = buffer[offset++];
      const metadataRaw = buffer.slice(offset, offset + metadataLength);
      const metadata = metadataRaw.toString();
      offset += metadataLength;

      // 9. Timestamp
      if (buffer[offset++] !== 0x08) {
        console.log('Missing timestamp length byte');
        return null;
      }
      const timestampBuf = buffer.slice(offset, offset + 8);
      const timestamp = timestampBuf.readBigUInt64BE(0);
      offset += 8;

      // 10. Expect 2x OP_DROP
      if (buffer[offset++] !== 0x75 || buffer[offset++] !== 0x75) {
        console.log('Missing 2 OP_DROP after metadata/timestamp');
        return null;
      }

      // 11. Expect OP_TRUE (0x51)
      if (buffer[offset++] !== 0x51) {
        console.log('Missing final OP_TRUE');
        return null;
      }

      return {
        tokenId,
        amount: Number(amount),
        typeCode,
        metadata,
        timestamp: Number(timestamp),
        isValid: true
      };

    } catch (err) {
      console.error('Error parsing token data:', err);
      return null;
    }
  }
}

module.exports = TokenParser;
