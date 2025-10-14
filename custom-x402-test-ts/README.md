# x402-magicalyExpress TypeScript Example

A complete Node.js + Express + TypeScript boilerplate demonstrating payment-protected endpoints using the x402 OnSpot payment system.

## 🔗 Links

- **Website**: [x402magic.xyz](https://x402magic.xyz)
- **GitHub Repository**: [x402-magic](https://github.com/AbhinavBuilds/create-x402-magicaly)
- **NPM SDK**: [@coinbase/x402](https://www.npmjs.com/package/@coinbase/x402) | [x402-magic](https://www.npmjs.com/package/create-x402-magicaly)

## 📁 Project Structure

This repository contains both Express and Hono implementations:

```
├── src/
│   ├── index.ts        # Express server with protected endpoint
│   └── test-client.ts  # Test client to demonstrate payment flow
├── hono/
│   └── src/
│       └── index.ts    # Hono server implementation
├── package.json        # Express version dependencies
├── .env                # Environment variables (not committed)
└── README.md          # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy and configure your environment variables:

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Run the Server

```bash
# Development mode (auto-compile + run)
npm run dev

# Or manually build and run
npx tsc -b
node dist/index.js
```

### 4. Test the Payment Flow

```bash
# Run the test client to demonstrate payment
npm run test-client
```

## 🛠️ Server Usage

The Express server (`src/index.ts`) provides a payment-protected endpoint:

### Endpoints

- `GET /premium-content` - Protected endpoint requiring payment via `X-PAYMENT` header

### Example Request

```bash
curl -H "X-PAYMENT: <payment-signature>" http://localhost:3000/premium-content
```

### Response Types

**Payment Required (402)**:

```json
{
  "paymentRequired": true,
  "price": "$0.01",
  "payTo": "0x...",
  "instructions": "..."
}
```

**Success (200)**:

```json
{
  "content": "Your premium content here!"
}
```

**Invalid Payment (402)**:

```json
{
  "error": "Invalid payment"
}
```

## 🧪 Test Client

The test client (`src/test-client.ts`) demonstrates how to:

1. Create a wallet from a private key
2. Use the `x402-axios` interceptor to automatically handle payments
3. Make requests to protected endpoints

### Running the Test Client

```bash
npm run test-client
```

The client will:

- Connect using your `PRIVATE_KEY` from `.env`
- Automatically generate and send payment for the `/premium-content` endpoint
- Display the response from the server

## 🌍 Environment Variables

Configure these variables in your `.env` file:

### Required

- `PAY_TO` - Recipient address for payments (hex string starting with 0x)
- `PRIVATE_KEY` - Private key for test client wallet (for signing payments)

### Optional

- `PORT` - Server port (default: 3000)
- `CDP_API_KEY_ID` - Coinbase Developer Platform API key (if using Coinbase facilitator)
- `CDP_API_KEY_SECRET` - Coinbase Developer Platform secret

### Example `.env`

```bash
# Wallet and payment configuration
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
PAY_TO=0xYOUR_RECIPIENT_ADDRESS_HERE

# Server configuration
PORT=3000

# Optional: Coinbase CDP credentials (if using Coinbase facilitator)
CDP_API_KEY_ID=your-cdp-key-id
CDP_API_KEY_SECRET=your-cdp-secret
```

## 🔧 Development

### Build

```bash
npm run build
# or
npx tsc -b
```

### Run

```bash
npm run dev        # Development (build + run)
npm start          # Production (run pre-built)
```

### Project Scripts

- `npm run dev` - Build TypeScript and run server
- `npm run test-client` - Run the test client
- `npm run build` - Compile TypeScript only
- `npm start` - Run compiled server

## 🦕 Hono Alternative

A Hono implementation is available in the `hono/` folder with the same functionality:

```bash
cd hono
npm install
npm run dev
```

## 🔒 Security Notes

- Never commit real private keys to version control
- Use environment variables for all sensitive data
- The included `.env` contains placeholder values only
- For production, use proper secret management (AWS Secrets Manager, etc.)

## 📖 How It Works

1. **Server Setup**: The server initializes an `OnSpot` payment handler with your `PAY_TO` address
2. **Request**: Client makes a request to the protected endpoint
3. **Payment Check**: Server calls `onSpot.requirePayment()` to validate the `X-PAYMENT` header
4. **Response**: Server returns payment instructions (402) or protected content (200)

The `x402-axios` interceptor automatically handles the payment flow for clients, making it seamless to integrate payment-protected APIs.

## 🐛 Troubleshooting

- **Server fails to start**: Check that `PAY_TO` is set in `.env`
- **Payment rejected**: Ensure `PRIVATE_KEY` is valid and has sufficient funds
- **Build errors**: Run `npm install` and ensure TypeScript is properly installed

## 📚 Learn More

- [x402magic.xyz](https://x402magic.xyz) - Main documentation
- [GitHub Repository](https://github.com/coinbase/x402) - Source code and examples
- [NPM Package](https://www.npmjs.com/package/@coinbase/x402) - Core x402 library

## 📄 License

ISC
