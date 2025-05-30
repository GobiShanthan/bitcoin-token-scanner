# TSB Token Wallet Integration Guide
This guide outlines how wallets can support **TSB (Token Standard on Bitcoin)** tokens using **Taproot Script-Path Spend**. TSB is a fully native Bitcoin token format that uses Taproot leaf scripts to embed structured token data.
---
## 📌 Overview
- **Token Format**: Embedded in a Taproot script leaf using `OP_IF ... OP_ENDIF`.
- **Spend Type**: Always via **Script Path Spend** (not key path).
- **Identification**: Tokens are identified by a magic marker `"TSB"` at the beginning of the script.
---
## 📄 Script Structure
Each TSB token script follows this format:
```
OP_TRUE            # 0x51
OP_IF              # 0x63
  03 "TSB"         # Magic marker (0x03 + 3 bytes "TSB") 
  10 [token ID]    # Token ID (0x10 + 16 bytes) 
  08 [amount]      # Amount (0x08 + 8 bytes, big endian) 
  01 [typeCode]    # Type code (1 byte or OP_N value) 
  OP_DROP x4       # 4 consecutive OP_DROP (0x75) 
  xx [metadata]    # Metadata (length byte + UTF-8, variable length) 
  08 [timestamp]   # Timestamp (0x08 + 8 bytes, big endian) 
  OP_DROP x2       # 2 consecutive OP_DROP (0x75) 
  OP_TRUE          # 0x51
OP_ENDIF
```

The Taproot leaf is committed via a single-leaf Merkle root and spent using the **script path**, revealing the full script and control block.
---
## 🧠 TSB Token Fields
| Field      | Size (bytes) | Description                             |
|------------|--------------|-----------------------------------------|
| `"TSB"`    | 3            | Magic marker to identify TSB scripts    |
| Token ID   | 16           | Unique identifier (string, null-padded) |
| Amount     | 8            | 64-bit unsigned integer (sats or units) |
| TypeCode   | 1            | Token type (see type mapping below)     |
| Metadata   | Variable     | Human-readable or machine metadata      |
| Timestamp  | 8            | Seconds since UNIX epoch                |

### Type Code Mapping
| Code | Token Type                   | Description                         |
|------|-----------------------------|-------------------------------------|
| 0    | Fungible Token (FT)         | Standard fungible token             |
| 4    | Oracle-Verified Token       | Token with oracle verification      |
| 8    | DAO Governance Token        | Governance token for DAOs           |
| 10   | Wrapped Asset Token         | Token representing wrapped assets   |
| ...  | [Other types]               | Additional token types              |
---
## 🔎 Detection & Parsing Instructions
### When scanning transactions:
1. For every input (`vin`), inspect the witness stack.
2. If there are **at least two items** (script + control block), parse the **first item** (raw script bytes).
3. Check if:
   - Starts with `OP_TRUE` (0x51) followed by `OP_IF` (0x63)
   - Followed by `0x03 0x54 0x53 0x42` (ASCII for `"TSB"`)
4. If matched, extract the next bytes in order:
   - **Token ID**: After 0x10 byte, read next 16 bytes (remove trailing nulls)
   - **Amount**: After 0x08 byte, read next 8 bytes as BigUInt64BE
   - **Type Code**: Read next byte (if 0x51-0x60, subtract 0x50 to get N value)
   - Skip 4x OP_DROP bytes (0x75)
   - **Metadata**: Read length byte, then read that many bytes as UTF-8
   - **Timestamp**: After 0x08 byte, read next 8 bytes as BigUInt64BE
5. Validate script structure integrity (OP_DROP sequence, ending OP_TRUE)
---
## ✅ Integration Checklist
- [ ] Support **Taproot addresses**
- [ ] Support **Script Path Spend detection**
- [ ] Parse witness item 0 if length ≥ 2
- [ ] Look for `"TSB"` prefix in leaf script
- [ ] Decode token ID, amount, typeCode, metadata, timestamp
- [ ] Display parsed tokens in UI
- [ ] (Optional) Offer `claim`, `transfer`, or `view` options

## 🔬 Common Parsing Pitfalls
When implementing the TSB token parser, watch out for these common issues:

1. **Token ID Null-padding**: Token IDs are stored as 16-byte strings but may contain null bytes. Be sure to trim trailing nulls when displaying.

2. **OP_N TypeCodes**: TypeCode may use OP_N opcodes (0x51-0x60) which should be converted to integers 1-16 by subtracting 0x50.

3. **BigInt Handling**: Amount and timestamp are stored as 8-byte big-endian integers. JavaScript implementations should use BigInt for proper parsing.

4. **Script Pattern Recognition**: Ensure you validate the complete script pattern including the proper sequence of OP_DROP opcodes.

5. **UTF-8 Encoding**: Metadata is stored as UTF-8 text. Use proper encoding/decoding for this field.

6. **Timestamp Format**: The timestamp field uses seconds since UNIX epoch and should be converted appropriately for display.
---
## 🧪 Reference Scanner / Parser
For integration, you may reuse or adapt our open-source components:
- **Token Parser (Node.js)**  
  [github.com/GobiShanthan/bitcoin-token-scanner/utils/tokenParser.js](https://github.com/GobiShanthan/bitcoin-token-scanner/blob/main/utils/tokenParser.js)
- **Scanner Worker**  
  [scannerWorker.js](https://github.com/GobiShanthan/bitcoin-token-scanner/blob/main/scanner/scannerWorker.js)
These tools handle witness parsing, block scanning, and metadata decoding.

### Token Parser Implementation (Pseudocode)
```javascript
function parseTokenScript(witnessHex) {
  // Convert hex to buffer
  const buffer = Buffer.from(witnessHex, 'hex');
  let offset = 0;
  
  // 1. Validate script header
  if (buffer[offset++] !== 0x51) return null; // Expect OP_TRUE
  if (buffer[offset++] !== 0x63) return null; // Expect OP_IF
  
  // 2. Check for TSB magic marker
  if (buffer[offset++] !== 0x03) return null;  // Length byte
  if (buffer.slice(offset, offset + 3).toString() !== 'TSB') return null;
  offset += 3;
  
  // 3. Extract token ID (16 bytes)
  if (buffer[offset++] !== 0x10) return null; // Length byte
  const tokenIdRaw = buffer.slice(offset, offset + 16);
  const tokenId = tokenIdRaw.toString().replace(/\0+$/, ''); // Remove trailing nulls
  offset += 16;
  
  // 4. Extract amount (8 bytes)
  if (buffer[offset++] !== 0x08) return null; // Length byte
  const amount = buffer.slice(offset, offset + 8).readBigUInt64BE(0);
  offset += 8;
  
  // 5. Extract typeCode (1 byte)
  let typeCode = buffer[offset++];
  // Handle OP_N values (0x51-0x60 = 1-16)
  if (typeCode >= 0x51 && typeCode <= 0x60) {
    typeCode = typeCode - 0x50;
  }
  
  // 6. Verify 4x OP_DROP
  for (let i = 0; i < 4; i++) {
    if (buffer[offset++] !== 0x75) return null;
  }
  
  // 7. Extract metadata (variable length)
  const metadataLength = buffer[offset++];
  const metadata = buffer.slice(offset, offset + metadataLength).toString();
  offset += metadataLength;
  
  // 8. Extract timestamp (8 bytes)
  if (buffer[offset++] !== 0x08) return null; // Length byte
  const timestamp = buffer.slice(offset, offset + 8).readBigUInt64BE(0);
  offset += 8;
  
  // 9. Verify 2x OP_DROP and ending OP_TRUE
  if (buffer[offset++] !== 0x75) return null; // First OP_DROP
  if (buffer[offset++] !== 0x75) return null; // Second OP_DROP
  if (buffer[offset++] !== 0x51) return null; // OP_TRUE
  
  return {
    tokenId,
    amount: Number(amount),
    typeCode,
    metadata,
    timestamp: Number(timestamp),
    isValid: true
  };
}
```
---
## 🔍 Example Tokens
Here are examples of different token types in the TSB standard:

### 10 - Wrapped Asset Token
**SPX**  
**Amount:** 10000000000 **Metadata:** Synthetic S&P 500 Index Token **Block Height:** 4322353 **Timestamp:** 5/1/2025, 4:40:30 AM  
**TXID:** 93bdacd4404fcdcacbee28dcb07c05e6ad61751dfe331a3916af7ae4e3e00bd3  
View Details

### 4 - Oracle-Verified Token
**TNX**  
**Amount:** 10000000000 **Metadata:** 10-Year U.S. Treasury Yield Token **Block Height:** 4322353 **Timestamp:** 5/1/2025, 4:42:16 AM  
**TXID:** 2ff12535000e0556b813cd8b183166897a84a519b03e18b090c73b7ab4c6168e  
View Details

### 0 - Fungible Token (FT)
**USDC**  
**Amount:** 10000000000 **Metadata:** Circle's Stablecoin USDC **Block Height:** 4322351 **Timestamp:** 5/1/2025, 4:37:27 AM  
**TXID:** 6b79895caf78825acf97b9de7d497ad2585952f7c43c9c6bba4ae07b95cce04f  
View Details

### 8 - DAO Governance Token
**TORRAM**  
**Amount:** 10000000000 **Metadata:** Torram Network native token **Block Height:** 4322341 **Timestamp:** 5/1/2025, 4:17:00 AM  
**TXID:** c6d640d01dd0cc889034e4b14e31d63c97ca47763d4c9833be13ecdcd51ed9c6  
View Details

---
## 🔗 Example Token Data
### Token JSON Structure
```json
{
  "tokenId": "TORRAM",
  "amount": 10000000000,
  "metadata": "Torram Network native token",
  "timestamp": 1746087420,
  "typeCode": 8,
  "txid": "c6d640d01dd0cc889034e4b14e31d63c97ca47763d4c9833be13ecdcd51ed9c6",
  "blockHeight": 4322341,
  "blockTime": 1746087420,
  "isValidScript": true
}
```

### Hexadecimal Witness Script Example
Below is a hexadecimal example of how a TSB token appears in the witness stack:
```
51 63 03 545342 10 544F5252414D000000000000000000 08 0000000254A3CB00 51 75 75 75 75 17 546F7272616D204E6574776F726B20746F6B656E 08 00000000682586DC 75 75 51 68
```

Breakdown:
- `51`: OP_TRUE
- `63`: OP_IF
- `03 545342`: Push 3 bytes "TSB"
- `10 544F5252414D000000000000000000`: Push 16 bytes "TORRAM" + null padding
- `08 0000000254A3CB00`: Push 8 bytes amount (10000000000)
- `51`: Type code (OP_1 = 1, or use direct byte value)
- `75 75 75 75`: 4x OP_DROP
- `17 546F7272616D204E6574776F726B20746F6B656E`: Push 23 bytes metadata
- `08 00000000682586DC`: Push 8 bytes timestamp
- `75 75`: 2x OP_DROP
- `51`: OP_TRUE
- `68`: OP_ENDIF
```