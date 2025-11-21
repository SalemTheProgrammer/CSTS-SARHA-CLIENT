const fs = require('fs');

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

const DecryptMap = new Map();
EncryptCle.forEach((key, index) => {
  DecryptMap.set(key, Ref[index]);
});

function decryptText(encryptedText) {
  let decryptedText = '';
  let i = 0;
  const len = encryptedText.length;

  while (i < len) {
    // Try length 3
    if (i + 3 <= len) {
      const sub3 = encryptedText.substr(i, 3);
      const val3 = DecryptMap.get(sub3);
      if (val3 !== undefined) {
        decryptedText += val3;
        i += 3;
        continue;
      }
    }

    // Try length 2
    if (i + 2 <= len) {
      const sub2 = encryptedText.substr(i, 2);
      const val2 = DecryptMap.get(sub2);
      if (val2 !== undefined) {
        decryptedText += val2;
        i += 2;
        continue;
      }
    }

    // Fallback to length 1 (keep char)
    decryptedText += encryptedText[i];
    i++;
  }

  return decryptedText;
}

const inputFile = 'CST_STU_1_010824_1743.dat';
const outputFile = 'CST_STU_1_010824_1743_decrypted.csv';

try {
  const content = fs.readFileSync(inputFile, 'utf8');
  const lines = content.split('\n');
  const decryptedLines = lines.map(line => {
    // Check if line looks encrypted (heuristic from app)
    // If it contains date like dd/mm/yyyy, it's plain.
    if (line.includes(',') && line.match(/\d+\/\d+\/\d+/)) {
      return line;
    }
    // Otherwise decrypt
    return decryptText(line);
  });
  
  fs.writeFileSync(outputFile, decryptedLines.join('\n'));
  console.log('Decryption complete. Output saved to ' + outputFile);
} catch (e) {
  console.error('Error:', e);
}