const fs = require('fs');
const path = require('path');

// Encryption mapping (reverse of decryption)
const Ref = [
  '0','1','2','3','4','5','6','7','8','9',
  '.','-','A','B','C','D','E','F','G','H',
  'I','J','K','L','M','N','O','P','Q','R',
  'S','T','U','V','W','X','Y','Z','a','b',
  'c','d','e','f','g','h','i','j','k','l',
  'm','n','o','p','q','r','s','t','u','v',
  'w','x','y','z'
];

const EncryptCle = [
  'Dm','An','fo','Up','nq','1r','.s','ot','uC','Nv',
  '0Q','F1','2u','3k','4M','O5','d6','7P','8y','x9',
  '0S','JT','UR','iV','zW','KX','YI','Zw','aL','Xb',
  'T.','-V','A4','B6','Ch','vD','jE','F9','G8','gH',
  'Yc','bd','Be','fG','gH','ah','Zi','jE','kl','lt',
  'pI','Jq','K5','LW','M7','N3','O2','mP','eQ','SR',
  'ws','xr','yc','z-'
];

function encryptText(plainText) {
  let encryptedText = '';
  
  for (let i = 0; i < plainText.length; i++) {
    const char = plainText[i];
    const index = Ref.indexOf(char);
    
    if (index !== -1) {
      // Character found in reference array, encrypt it
      encryptedText += EncryptCle[index];
    } else {
      // Character not in reference array, keep as is
      encryptedText += char;
    }
  }
  
  return encryptedText;
}

function encryptFile(inputFilePath, outputFilePath) {
  try {
    // Read the input file
    const plainText = fs.readFileSync(inputFilePath, 'utf8');
    
    // Encrypt the content
    const encryptedText = encryptText(plainText);
    
    // Write to output file
    fs.writeFileSync(outputFilePath, encryptedText, 'utf8');
    
    console.log(`✓ File encrypted successfully!`);
    console.log(`  Input:  ${inputFilePath}`);
    console.log(`  Output: ${outputFilePath}`);
    console.log(`  Original size: ${plainText.length} bytes`);
    console.log(`  Encrypted size: ${encryptedText.length} bytes`);
  } catch (error) {
    console.error(`✗ Error encrypting file: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
if (process.argv.length < 3) {
  console.log('Usage: node encrypt-file.js <input-file> [output-file]');
  console.log('');
  console.log('Examples:');
  console.log('  node encrypt-file.js data.txt');
  console.log('  node encrypt-file.js data.txt encrypted-data.txt');
  process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace(/(\.[^.]+)$/, '-encrypted$1');

if (!fs.existsSync(inputFile)) {
  console.error(`✗ Error: Input file "${inputFile}" not found`);
  process.exit(1);
}

encryptFile(inputFile, outputFile);
