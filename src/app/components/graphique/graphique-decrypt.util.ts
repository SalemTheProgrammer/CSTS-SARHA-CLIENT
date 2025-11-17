import { MareeRow } from './graphique-types.util';

export function decryptText(encryptedText: string): string {
  const Ref: string[] = [
    '0','1','2','3','4','5','6','7','8','9',
    '.','-','A','B','C','D','E','F','G','H',
    'I','J','K','L','M','N','O','P','Q','R',
    'S','T','U','V','W','X','Y','Z','a','b',
    'c','d','e','f','g','h','i','j','k','l',
    'm','n','o','p','q','r','s','t','u','v',
    'w','x','y','z'
  ];

  const EncryptCle: string[] = [
    'Dm','An','fo','Up','nq','1r','.s','ot','uC','Nv',
    '0Q','F1','2u','3k','4M','O5','d6','7P','8y','x9',
    '0S','JT','UR','iV','zW','KX','YI','Zw','aL','Xb',
    'T.','-V','A4','B6','Ch','vD','jE','F9','G8','gH',
    'Yc','bd','Be','fG','gH','ah','Zi','jE','kl','lt',
    'pI','Jq','K5','LW','M7','N3','O2','mP','eQ','SR',
    'ws','xr','yc','z-'
  ];

  let decryptedText = '';
  let i = 0;

  while (i < encryptedText.length) {
    let decryptedChar = '';
    let found = false;

    for (let j = 3; j >= 2; j--) {
      const encryptedChar = encryptedText.substr(i, j);
      const index = EncryptCle.indexOf(encryptedChar);
      if (index !== -1) {
        decryptedChar = Ref[index];
        i += j;
        found = true;
        break;
      }
    }

    if (!found) {
      decryptedChar = encryptedText.substr(i, 1);
      i++;
    }

    decryptedText += decryptedChar;
  }

  return decryptedText;
}
