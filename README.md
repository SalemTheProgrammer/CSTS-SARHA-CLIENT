# Sarha Client

**Canadian System Technology Client** - A desktop application for monitoring and managing SARHA environmental sensors with real-time data visualization and file management capabilities.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#%EF%B8%8F-configuration)
- [Usage](#-usage)
- [Application Structure](#-application-structure)
- [Development](#-development)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🌟 Overview

Sarha Client is a cross-platform desktop application built with Angular and Tauri that enables users to connect to SARHA environmental monitoring devices over a local network. The application provides comprehensive data visualization through charts, file management capabilities, and secure data encryption for sensitive information.

The application is designed for environmental monitoring scenarios where sensor data (temperature, humidity, pressure, etc.) needs to be collected, visualized, and analyzed from remote devices.

---

## ✨ Features

### 🔌 Device Connection
- **Automatic device detection** on the local network
- **Customizable API endpoint** with password protection
- **Automatic retry mechanism** with countdown timer
- **Real-time connection status** monitoring
- **WiFi status detection** with visual indicators

### 📂 File Management
- **Browse and list** data files from connected devices
- **Pagination support** for large file collections (5 files per page)
- **Automatic file refresh** detection
- **Bulk download** capabilities (page or all files)
- **Individual file download** with progress indication
- **File size and date** display in French locale

### 📊 Data Visualization
- **Interactive chart generation** from CSV data files
- **Multi-sensor support** with configurable sensors (up to 10)
- **Customizable time intervals** (1 min, 2 min, 5 min, 15 min, 30 min, 1 hour)
- **Min/Max threshold visualization** (consignes)
- **Print-ready charts** with metadata footer
- **PDF export** functionality
- **Responsive chart design** with zoom and pan capabilities
- **Historical data analysis** with date range selection

### 🔐 Security & Encryption
- **XOR-based encryption** with Base64 encoding
- **Simple cross-platform** encryption scheme
- **Password-protected** configuration changes
- **Secure local storage** of sensitive data

### ⚙️ Configuration
- **First-time setup wizard** with passphrase entry
- **Device connection settings**
- **Custom API URL** configuration
- **Chart display preferences**
- **Sensor configuration** (names, units, colors, thresholds)

---

## 🔧 Technology Stack

### Frontend
- **[Angular 20.1.4](https://angular.io/)** - Modern web framework
- **[TypeScript 5.8.3](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[TailwindCSS 3.x](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Chart.js 4.5.1](https://www.chartjs.org/)** - Data visualization library
- **[Moment.js 2.30.1](https://momentjs.com/)** - Date/time manipulation

### Desktop Runtime
- **[Tauri 2.x](https://tauri.app/)** - Lightweight desktop framework
- **Rust Backend** - High-performance, secure backend

### Key Libraries
- **@tauri-apps/plugin-fs** - File system access
- **@tauri-apps/plugin-http** - HTTP requests
- **@tauri-apps/plugin-dialog** - Native file dialogs
- **html2canvas** - Screenshot generation
- **jsPDF** - PDF generation

---

## 📦 Prerequisites

Before installing Sarha Client, ensure you have the following installed:

- **[Node.js](https://nodejs.org/)** (v18 or higher)
- **[Yarn](https://yarnpkg.com/)** package manager
- **[Rust](https://www.rust-lang.org/)** (for Tauri development)
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)

### Installing Prerequisites

#### Windows
```powershell
# Install Node.js from https://nodejs.org/
# Install Rust
winget install --id Rustlang.Rustup

# Install Yarn
npm install -g yarn
```

#### macOS
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and Yarn
brew install node yarn

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### Linux (Ubuntu/Debian)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
npm install -g yarn

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri dependencies
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

---

## 🚀 Installation

### Clone the Repository
```bash
git clone <repository-url>
cd Sarha-client
```

### Install Dependencies
```bash
yarn install
```

### Development Mode
```bash
# Start the development server
yarn tauri dev
```

This will:
1. Start the Angular development server on `http://localhost:1420`
2. Launch the Tauri desktop application
3. Enable hot-reload for development

### Production Build
```bash
# Build the application
yarn tauri build
```

The compiled application will be available in:
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `AppImage/`

---

## ⚙️ Configuration

### Environment Settings

The application uses environment files located in `src/environments/`:

**`environment.ts`** (Development)
```typescript
export const environment = {
    production: false,
    defaultDeviceUrl: 'http://192.168.1.251',
    deviceUrl: 'http://192.168.1.251',
    connectionTimeout: 5000
};
```

**`environment.prod.ts`** (Production)
```typescript
export const environment = {
    production: true,
    defaultDeviceUrl: 'http://192.168.1.251',
    deviceUrl: 'http://192.168.1.251',
    connectionTimeout: 5000
};
```

### Device Configuration

You can customize the device connection settings:

1. **Default Device URL**: Change `defaultDeviceUrl` to match your device's IP address
2. **Connection Timeout**: Adjust timeout in milliseconds (default: 5000ms)

### API Configuration Password

The application requires a password to change API settings. The default password is:
```
CST_sarha_2025
```

To change this password, modify the `REQUIRED_PASSWORD` constant in:
`src/app/components/connection/connection.component.ts`

### Encryption Key

The application uses a custom encryption key for securing data. The key is defined in:
`src/app/services/crypto.service.ts`

```typescript
private readonly SECRET_KEY = 'CTS_SARHA_2025_SECRET_KEY_FOR_ENCRYPTION';
```

> **⚠️ Security Note**: Change this key for production deployments to ensure data security.

---

## 📖 Usage

### 1️⃣ First-Time Setup

When you launch the application for the first time:

1. **Setup Screen** appears
2. Choose one of two options:
   - **Upload File**: Upload a `.txt` file containing your passphrase
   - **Paste Text**: Paste your passphrase directly
3. Click **Continue** to proceed

The passphrase is stored securely in local storage and used for data decryption.

### 2️⃣ Device Connection

After setup, the application attempts to connect to the configured device:

1. **WiFi Status** is displayed (connected/disconnected)
2. **Device Status** shows connection state
3. If connection fails:
   - Automatic retry countdown begins (2 seconds)
   - Manual retry button available
   - Settings icon to configure custom API URL

#### Changing API URL

1. Click the **Settings** icon on the connection screen
2. Enter password: `CST_sarha_2025`
3. Enter new API URL (must start with `http://` or `https://`)
4. Click **Save** to apply changes
5. Connection will automatically retry with new URL

### 3️⃣ Main Dashboard

Once connected, you'll see the main file management dashboard:

#### Features
- **File List**: Displays up to 5 files per page
- **Pagination**: Navigate through multiple pages
- **Actions per File**:
  - 📥 **Download**: Save file locally
  - 📊 **View Graph**: Visualize data in charts
  - 🖨️ **Print Graph**: Print chart with metadata
  - 📄 **Download PDF**: Export chart as PDF

#### Toolbar Actions
- **📥 Download Page Files**: Download all files on current page
- **📥 Download All Files**: Download all available files
- **🔄 Refresh**: Reload file list from device
- **⚙️ Settings**: Configure application settings
- **📊 History**: View historical data

### 4️⃣ Graph Visualization

Click **View Graph** on any data file to:

1. **Upload & Parse**: File is parsed as CSV
2. **Chart Generation**: Multiple charts created based on data
3. **Interactive Features**:
   - Zoom and pan on charts
   - Toggle sensors on/off
   - View min/max thresholds
   - Adjust time intervals (1 min - 1 hour)

#### Chart Features
- **Multi-page support**: Large datasets split across multiple chart pages
- **Sensor Configuration**: Customize sensor names, colors, and units
- **Threshold Lines**: Display min/max consignes
- **Footer Metadata**: Company info, device details, sensor config

#### Print/Export
- **Print**: Opens browser print dialog with formatted charts
- **PDF**: User selects "Save as PDF" in print dialog

### 5️⃣ Settings

Access settings to configure:

- **Device connection** parameters
- **Sensor configuration** (names, units, colors, min/max thresholds)
- **Chart display preferences**
- **Application metadata** (company name, device info)

---

## 🏗️ Application Structure

### Directory Layout

```
Sarha-client/
├── src/
│   ├── app/
│   │   ├── components/          # UI Components
│   │   │   ├── connection/      # Device connection screen
│   │   │   ├── first-time-setup/ # Initial setup wizard
│   │   │   ├── graphique/       # Chart visualization
│   │   │   ├── history/         # Historical data view
│   │   │   ├── home/            # Home component
│   │   │   ├── import-config/   # Configuration import
│   │   │   ├── main/            # Main file dashboard
│   │   │   └── settings/        # Settings panel
│   │   ├── guards/              # Route guards
│   │   │   ├── config.guard.ts  # Config validation guard
│   │   │   └── setup.guard.ts   # Setup completion guard
│   │   ├── services/            # Business logic
│   │   │   ├── chart-settings.service.ts
│   │   │   ├── config.service.ts
│   │   │   ├── crypto.service.ts
│   │   │   ├── data.service.ts
│   │   │   ├── device.service.ts
│   │   │   ├── file.service.ts
│   │   │   ├── graphique-data.service.ts
│   │   │   ├── print.service.ts
│   │   │   ├── settings.service.ts
│   │   │   ├── setup.service.ts
│   │   │   └── storage.service.ts
│   │   ├── app.component.ts     # Root component
│   │   ├── app.config.ts        # App configuration
│   │   └── app.routes.ts        # Routing configuration
│   ├── assets/                  # Static assets
│   ├── environments/            # Environment configs
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── index.html               # HTML entry point
│   ├── main.ts                  # TypeScript entry point
│   └── styles.css               # Global styles
├── src-tauri/                   # Tauri backend (Rust)
│   ├── icons/                   # Application icons
│   ├── src/                     # Rust source code
│   └── tauri.conf.json          # Tauri configuration
├── angular.json                 # Angular configuration
├── package.json                 # Dependencies
├── tailwind.config.js           # TailwindCSS config
├── tsconfig.json                # TypeScript config
└── README.md                    # This file
```

### Key Components

#### **ConnectionComponent**
- Manages device connection state
- Displays WiFi/device status
- Handles API URL configuration
- Implements automatic retry mechanism

#### **MainComponent**
- File list management with pagination
- File download (individual, page, all)
- Graph visualization launcher
- Print/PDF export initiator

#### **GraphiqueComponent**
- CSV file parsing
- Multi-chart generation with Chart.js
- Interactive data visualization
- Print layout rendering
- PDF export functionality

#### **FirstTimeSetupComponent**
- Initial passphrase collection
- File upload or text paste options
- Setup completion persistence

#### **SettingsComponent**
- Sensor configuration
- Chart preferences
- Device metadata

### Services

#### **DeviceService**
- Connection testing
- API URL management
- URL validation

#### **FileService**
- File list fetching
- File parsing (HTML → DeviceFile[])
- File download via HTTP POST
- Caching mechanism

#### **CryptoService**
- XOR-based encryption
- Base64 encoding/decoding
- Symmetric encryption/decryption
- Key management

#### **ChartSettingsService**
- Sensor configuration persistence
- Chart display settings
- Min/max threshold management

#### **PrintService**
- Chart-to-image conversion (html2canvas)
- Print layout generation
- PDF preparation

#### **SetupService**
- Setup state management
- Passphrase storage
- Local storage integration

### Route Guards

#### **configGuard**
- Validates configuration presence
- Redirects to import if missing

#### **setupGuard**
- Ensures setup completion
- Redirects to setup if incomplete

---

## 🛠️ Development

### Project Scripts

```bash
# Development
yarn start              # Start Angular dev server
yarn tauri dev          # Start Tauri dev mode

# Build
yarn build              # Build Angular app
yarn tauri build        # Build production desktop app

# Testing
yarn ng test            # Run unit tests (if configured)

# Linting
yarn ng lint            # Run linter (if configured)
```

### Adding New Features

#### 1. Create a New Component
```bash
ng generate component components/my-component
```

#### 2. Create a New Service
```bash
ng generate service services/my-service
```

#### 3. Update Routing
Add your route to `src/app/app.routes.ts`:
```typescript
export const routes: Routes = [
  // ... existing routes
  { path: 'my-route', component: MyComponent, canActivate: [configGuard] }
];
```

### Debugging

#### Angular DevTools
1. Install [Angular DevTools](https://angular.io/guide/devtools) browser extension
2. Open browser DevTools (F12)
3. Navigate to **Angular** tab

#### Tauri DevTools
```bash
# Enable devtools in tauri.conf.json
{
  "build": {
    "devUrl": "http://localhost:1420",
    "withGlobalTauri": true
  }
}
```

### Code Style

- **TypeScript**: Follow Angular style guide
- **HTML Templates**: Use semantic HTML
- **CSS**: TailwindCSS utility classes preferred
- **Naming**:
  - Components: PascalCase (e.g., `MainComponent`)
  - Services: PascalCase with `Service` suffix (e.g., `DeviceService`)
  - Files: kebab-case (e.g., `device.service.ts`)

---

## 🔐 Security

### Encryption

The application uses a **simple XOR-based encryption** with **Base64 encoding**:

- **Algorithm**: XOR cipher with rotating key
- **Encoding**: Base64 for safe transmission/storage
- **Key**: `CTS_SARHA_2025_SECRET_KEY_FOR_ENCRYPTION`
- **Timestamp**: Each encrypted payload includes a timestamp for uniqueness

#### Why XOR?
- **Cross-platform compatibility**: Easy to implement in any language
- **Simplicity**: No external crypto libraries required
- **Lightweight**: Minimal performance overhead

> **⚠️ Note**: XOR encryption is NOT suitable for highly sensitive data. For production environments handling sensitive information, consider using AES-GCM or similar industry-standard encryption.

### Data Storage

- **Local Storage**: Used for configuration, setup state, and cached data
- **No Remote Storage**: All data stays on the local machine
- **File Encryption**: Downloaded files can be encrypted on device

### Password Protection

- API configuration requires password: `CST_sarha_2025`
- Change password by modifying `REQUIRED_PASSWORD` in `ConnectionComponent`

---

## 🐛 Troubleshooting

### Common Issues

#### ❌ Connection Failed

**Problem**: Application cannot connect to device

**Solutions**:
1. Verify device is powered on and connected to network
2. Check device IP address matches configuration
3. Ensure firewall allows HTTP traffic on required port
4. Try custom API URL via settings icon
5. Verify device is accessible via browser: `http://192.168.1.251`

#### ❌ File Download Failed

**Problem**: Download button doesn't work

**Solutions**:
1. Check device connection status
2. Verify file exists on device
3. Check browser console for errors (F12)
4. Ensure Tauri file permissions are granted

#### ❌ Charts Not Rendering

**Problem**: Graphs don't display after uploading file

**Solutions**:
1. Verify CSV file format is correct
2. Check browser console for parsing errors
3. Ensure Chart.js is loaded (check `package.json`)
4. Clear browser cache and restart application

#### ❌ Setup Screen Keeps Appearing

**Problem**: First-time setup shows every launch

**Solutions**:
1. Check local storage is enabled in browser
2. Verify `app_setup_complete` key in local storage
3. Clear and re-run setup process
4. Check browser privacy settings (may block local storage)

#### ❌ Build Errors

**Problem**: `yarn tauri build` fails

**Solutions**:
1. Ensure all prerequisites are installed (Rust, Node.js)
2. Update Rust: `rustup update`
3. Clear build cache: `yarn clean` (if available)
4. Delete `node_modules` and reinstall: `yarn install`
5. Check Tauri logs in `src-tauri/target/`

### Logs and Debugging

#### Browser Console
- Press **F12** to open DevTools
- Check **Console** tab for JavaScript errors
- Check **Network** tab for HTTP request failures

#### Tauri Logs
- Development mode: Logs appear in terminal
- Production: Logs saved to OS-specific directory:
  - **Windows**: `%APPDATA%\com.salemtheprogrammer.sarha-client\logs`
  - **macOS**: `~/Library/Logs/com.salemtheprogrammer.sarha-client/`
  - **Linux**: `~/.local/share/com.salemtheprogrammer.sarha-client/logs/`

### Resetting Application

To completely reset the application:

```javascript
// Open browser console (F12) and run:
localStorage.clear();
location.reload();
```

---

## 📜 License

**Private/Proprietary** - © Canadian System Technology

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 📞 Support

For technical support or questions:

- **Company**: Canadian System Technology
- **Application**: Sarha Client v0.1.0
- **Identifier**: `com.salemtheprogrammer.sarha-client`

---

## 🙏 Acknowledgments

Built with:
- [Angular](https://angular.io/)
- [Tauri](https://tauri.app/)
- [Chart.js](https://www.chartjs.org/)
- [TailwindCSS](https://tailwindcss.com/)

---

**Last Updated**: November 2025  
**Version**: 0.1.0
