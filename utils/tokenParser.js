// utils/tokenParser.js
/**
 * Parses token data from a Bitcoin witness script hex string
 * based on your specific TSB token format
 */
class TokenParser {
    /**
     * Parse token data from hex string
     * @param {string} witnessHex - The hex string of the witness script
     * @returns {object|null} - The parsed token data or null if not a valid token
     */
    static parse(witnessHex) {
      try {
        const buffer = Buffer.from(witnessHex, 'hex');
        
        // Bitcoin script format decoding
        let offset = 0;
        
        // Check first byte to see if it's a push operation
        const firstByte = buffer[offset++];
        if (firstByte !== 0x03) {
          return null; // Not a 3-byte push for "TSB"
        }
        
        // Check for "TSB" marker
        const tsbMarker = buffer.slice(offset, offset + 3).toString();
        if (tsbMarker !== 'TSB') {
          return null;
        }
        offset += 3;
        
        // Next should be 0x10 (16) for token ID length
        const tokenIdLengthByte = buffer[offset++];
        if (tokenIdLengthByte !== 0x10) {
          return null;
        }
        
        // Read token ID (16 bytes)
        const tokenIdRaw = buffer.slice(offset, offset + 16);
        offset += 16;
        
        // Clean null bytes from token ID
        const tokenId = tokenIdRaw.toString().replace(/\0+$/, '');
        
        // Next should be 0x08 (8) for amount length
        const amountLengthByte = buffer[offset++];
        if (amountLengthByte !== 0x08) {
          return null;
        }
        
        // Read amount (8 bytes, big endian)
        const amountBuf = buffer.slice(offset, offset + 8);
        const amount = amountBuf.readBigUInt64BE(0);
        offset += 8;
        
        // Read metadata length
        const metadataLengthByte = buffer[offset++];
        
        // Read metadata
        const metadata = buffer.slice(offset, offset + metadataLengthByte).toString();
        offset += metadataLengthByte;
        
        // Next should be 0x08 (8) for timestamp length
        const timestampLengthByte = buffer[offset++];
        if (timestampLengthByte !== 0x08) {
          // If timestamp isn't included, return what we have
          return {
            tokenId,
            amount: Number(amount),
            metadata,
            timestamp: null
          };
        }
        
        // Read timestamp (8 bytes, big endian)
        const timestampBuf = buffer.slice(offset, offset + 8);
        const timestamp = timestampBuf.readBigUInt64BE(0);
        offset += 8;
        
        // Verify OP_DROP sequence (0x75 = OP_DROP)
        if (buffer[offset++] !== 0x75 || 
            buffer[offset++] !== 0x75 || 
            buffer[offset++] !== 0x75 || 
            buffer[offset++] !== 0x75 || 
            buffer[offset++] !== 0x75) {
          // Missing the 5 OP_DROP operations, but we've still found token data
          // Just return it without validation
        }
        
        // Last byte should be OP_TRUE (0x51)
        const hasTrueOp = buffer[offset] === 0x51;
        
        return {
          tokenId,
          amount: Number(amount),
          metadata,
          timestamp: Number(timestamp),
          isValidScript: hasTrueOp
        };
      } catch (err) {
        console.error('Error parsing token data:', err);
        return null;
      }
    }
  }
  
  module.exports = TokenParser;