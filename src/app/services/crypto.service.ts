import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  // Simple encryption key - use the same in your other application
  private readonly SECRET_KEY = 'CTS_SARHA_2025_SECRET_KEY_FOR_ENCRYPTION';

  constructor() {}

  /**
   * Simple XOR-based encryption with Base64 encoding
   * Easy to implement in any programming language
   */
  encrypt(data: any): string {
    try {
      // Input validation
      if (data === null || data === undefined) {
        throw new Error('Cannot encrypt null or undefined data');
      }

      // Convert data to JSON string
      const jsonString = JSON.stringify(data);

      // Add timestamp for uniqueness
      const timestamp = Date.now().toString();
      const dataWithTimestamp = timestamp + '|' + jsonString;

      // Simple XOR encryption
      const encrypted = this.xorEncrypt(dataWithTimestamp, this.SECRET_KEY);

      // Encode to Base64 for safe transmission
      return btoa(encrypted);
    } catch (error) {
      console.error('Encryption failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to encrypt data: Unknown error occurred');
    }
  }

  /**
   * Simple XOR-based decryption with Base64 decoding
   */
  decrypt(encryptedString: string): any {
    try {
      // Input validation
      if (!encryptedString || typeof encryptedString !== 'string') {
        throw new Error('Invalid input: encryptedString must be a non-empty string');
      }

      if (encryptedString.trim() === '') {
        throw new Error('Invalid input: encryptedString cannot be empty');
      }

      // Decode from Base64
      let decodedString: string;
      try {
        decodedString = atob(encryptedString);
      } catch (error) {
        throw new Error('Invalid base64 format: The encrypted string is not properly encoded');
      }

      // XOR decrypt
      const decryptedWithTimestamp = this.xorDecrypt(decodedString, this.SECRET_KEY);

      // Split timestamp and data
      const separatorIndex = decryptedWithTimestamp.indexOf('|');
      if (separatorIndex === -1) {
        throw new Error('Invalid encrypted data format: Missing timestamp separator');
      }

      const timestampStr = decryptedWithTimestamp.substring(0, separatorIndex);
      const jsonString = decryptedWithTimestamp.substring(separatorIndex + 1);

      // Validate timestamp (basic check)
      const timestamp = parseInt(timestampStr);
      if (isNaN(timestamp) || timestamp <= 0) {
        throw new Error('Invalid encrypted data: Invalid timestamp');
      }

      // Parse JSON
      try {
        return JSON.parse(jsonString);
      } catch (error) {
        throw new Error('Failed to parse decrypted JSON: Data format is invalid');
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown decryption error occurred');
    }
  }

  /**
   * Simple XOR encryption function
   * @param text - Text to encrypt
   * @param key - Encryption key
   * @returns Encrypted string
   */
  private xorEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(textChar ^ keyChar);
    }
    return result;
  }

  /**
   * Simple XOR decryption function (same as encryption due to XOR properties)
   * @param encryptedText - Text to decrypt
   * @param key - Decryption key
   * @returns Decrypted string
   */
  private xorDecrypt(encryptedText: string, key: string): string {
    return this.xorEncrypt(encryptedText, key); // XOR is symmetric
  }

  /**
   * Test method to verify encryption/decryption is working properly
   * @param testData - Data to test with (optional)
   * @returns boolean - true if test passes, throws error if fails
   */
  testEncryptionDecryption(testData: any = { test: 'Hello World', timestamp: Date.now() }): boolean {
    try {
      console.log('Testing encryption/decryption with data:', testData);

      // Encrypt the test data
      const encrypted = this.encrypt(testData);
      console.log('Encrypted successfully:', encrypted.substring(0, 50) + '...');

      // Decrypt the encrypted data
      const decrypted = this.decrypt(encrypted);
      console.log('Decrypted successfully:', decrypted);

      // Compare original and decrypted data
      const originalJson = JSON.stringify(testData);
      const decryptedJson = JSON.stringify(decrypted);

      if (originalJson === decryptedJson) {
        console.log('✅ Encryption/Decryption test PASSED');
        return true;
      } else {
        throw new Error('Data mismatch: Original and decrypted data do not match');
      }
    } catch (error) {
      console.error('❌ Encryption/Decryption test FAILED:', error);
      throw error;
    }
  }

  /**
   * Get the encryption key information (for documentation purposes)
   * @returns Object containing key information
   */
  getKeyInfo(): { secretKey: string; algorithm: string; encoding: string } {
    return {
      secretKey: this.SECRET_KEY,
      algorithm: 'XOR',
      encoding: 'Base64'
    };
  }

  /**
   * Validate if a string looks like it could be encrypted data from this system
   * @param data - String to validate
   * @returns boolean - true if it looks like valid encrypted data
   */
  isValidEncryptedFormat(data: string): boolean {
    if (!data || typeof data !== 'string' || data.trim() === '') {
      return false;
    }

    try {
      // Try to decode base64
      const decoded = atob(data);
      // Check if it has reasonable length
      return decoded.length > 10;
    } catch (error) {
      return false;
    }
  }
}
