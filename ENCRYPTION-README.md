# File Encryption Script

This script encrypts text files using the same encryption algorithm used in your application.

## Requirements

- Node.js installed on your system

## Usage

### Basic Usage (auto-generate output filename)

```bash
node encrypt-file.js input.txt
```

This will create `input-encrypted.txt` in the same directory.

### Specify Output Filename

```bash
node encrypt-file.js input.txt output.txt
```

### Examples

```bash
# Encrypt a CSV file
node encrypt-file.js data.csv encrypted-data.csv

# Encrypt a text file (auto-generate output name)
node encrypt-file.js myfile.txt
# Creates: myfile-encrypted.txt
```

## How It Works

The script uses a character substitution cipher where:
- Each character in the reference set (0-9, A-Z, a-z, '.', '-') is replaced with a 2-character encrypted code
- Characters not in the reference set are kept as-is (like commas, spaces, newlines)

### Encryption Mapping

| Original | Encrypted | Original | Encrypted | Original | Encrypted |
|----------|-----------|----------|-----------|----------|-----------|
| 0        | Dm        | A        | A4        | a        | aL        |
| 1        | An        | B        | B6        | b        | Xb        |
| 2        | fo        | C        | Ch        | c        | Yc        |
| 3        | Up        | D        | vD        | d        | bd        |
| ...      | ...       | ...      | ...       | ...      | ...       |

## Testing

To verify the encryption works correctly, you can:

1. Encrypt a file:
   ```bash
   node encrypt-file.js test.txt encrypted.txt
   ```

2. Use the encrypted file in your application - it should decrypt correctly

## Notes

- The script preserves line endings and special characters (commas, spaces, etc.)
- Encrypted files are typically ~2x larger than the original due to 2-character codes
- The encryption is reversible using the `decryptText()` function in your application
