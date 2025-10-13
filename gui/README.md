# ESP32 BLE Echo Client 🔵

A React TypeScript application that connects to ESP32 devices using the Web Bluetooth API. This client can communicate with ESP32 BLE Echo servers, sending messages and receiving responses through a modern web interface.

## ✨ Features

- **Web Bluetooth API Integration**: Native browser Bluetooth connectivity
- **ESP32 Compatible**: Designed to work with ESP32 BLE Echo sketch
- **Real-time Communication**: Send messages and receive echoed responses
- **Modern UI**: Clean, responsive interface with status indicators
- **TypeScript Support**: Fully typed for better development experience
- **Chrome Compatible**: Optimized for Chrome 56+ and Edge 79+

## 🚀 Quick Start

### Prerequisites

- **Browser**: Chrome 56+ or Edge 79+ (Web Bluetooth API support required)
- **ESP32 Device**: Running the BLE Echo sketch with device name "ESP32-BLE-Echo"
- **Node.js**: Version 18+ for development

### Installation

1. Clone and navigate to the project:
```bash
cd gui
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open in Chrome: `http://localhost:5173`

## 📡 ESP32 Setup

Your ESP32 should be running a BLE Echo sketch with these specifications:

- **Device Name**: `ESP32-BLE-Echo`
- **Service UUID**: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- **RX Characteristic**: `6e400002-b5a3-f393-e0a9-e50e24dcca9e` (for receiving messages)
- **TX Characteristic**: `6e400003-b5a3-f393-e0a9-e50e24dcca9e` (for sending responses)

## 🎯 Usage

1. **Power on your ESP32** with the BLE Echo sketch
2. **Open the app** in Chrome browser
3. **Click "Connect to ESP32"** to start scanning
4. **Select your device** from the browser dialog
5. **Send messages** and see echoed responses in real-time!

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── App.tsx          # Main BLE client component
├── App.css          # Styling and responsive design
├── main.tsx         # React app entry point
└── index.css        # Global styles
```

## 🔧 Technical Details

### Web Bluetooth API

This app uses the Web Bluetooth API to communicate with BLE devices. Key features:

- Device scanning with name and service UUID filters
- GATT server connection management
- Characteristic read/write operations
- Real-time notifications for incoming data

### Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 56+ | ✅ Full | Recommended |
| Edge 79+ | ✅ Full | Chromium-based |
| Firefox | ❌ No | No Web Bluetooth support |
| Safari | ❌ No | No Web Bluetooth support |

## 🐛 Troubleshooting

### Common Issues

**"Web Bluetooth not supported"**
- Use Chrome 56+ or Edge 79+
- Ensure HTTPS (required for Web Bluetooth)

**"Device not found"**
- Check ESP32 is powered and advertising
- Verify device name is exactly "ESP32-BLE-Echo"
- Try refreshing and scanning again

**Connection fails**
- ESP32 may already be connected to another device
- Reset ESP32 and try again
- Check service UUIDs match exactly

## 📦 Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. Serve over HTTPS for Web Bluetooth to work.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is open source and available under the MIT License.
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
