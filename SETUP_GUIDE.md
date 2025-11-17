# First-Time Setup Guide

## Overview

When you launch the Sarha Client app for the first time, you'll be greeted with a setup screen where you need to provide your decryption passphrase.

## Setup Options

You have two ways to provide your passphrase:

### Option 1: Upload a Text File

1. Click the "Upload File" tab
2. Either:
   - Drag and drop a `.txt` file containing your passphrase onto the drop zone
   - Click the "Choose File" button to browse and select a `.txt` file from your computer

### Option 2: Paste Text

1. Click the "Paste Text" tab
2. Paste your passphrase directly into the text area

## What Happens Next

Once you provide your passphrase:

1. Click the "Continue" button
2. The passphrase is securely stored in your browser's local storage
3. You'll be redirected to the main app
4. The setup screen won't appear again unless you clear your browser data

## Security Notes

- The passphrase is stored locally in your browser
- It's used to decrypt data using AES-GCM-256 encryption
- The default encryption uses: `@CTSDOINGCRAZYWORK14@@@@KATCHEPMAYOUNEZ20255`
- Custom passphrases can be used for per-user encryption

## Resetting Setup

If you need to change your passphrase or reset the setup:

1. Open browser developer tools (F12)
2. Go to Application/Storage → Local Storage
3. Delete the keys: `app_setup_complete` and `app_passphrase`
4. Refresh the page

## Technical Details

- **Encryption**: AES-GCM, 256-bit key
- **Key Derivation**: PBKDF2 (SHA-256, 100,000 iterations)
- **Salt**: `CTS_SARHA_SALT_2025`
- **IV Length**: 12 bytes (unique per encryption)
- **Format**: Base64 of [IV || Ciphertext]

## Files Created

The setup process creates:

- `FirstTimeSetupComponent` - The setup UI
- `SetupService` - Manages setup state and passphrase storage
- `CryptoService` - Handles encryption/decryption operations
- `setupGuard` - Redirects to setup if not complete
- `setupCompleteGuard` - Prevents accessing setup when already complete
