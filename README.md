# Text to Emojis Converter 🔐✨

A modern web application that encrypts your text messages into emojis using password-based encryption. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🔒 **Secure Encryption**: Uses AES encryption with password protection
- 😀 **Emoji Conversion**: Converts encrypted text into a sequence of emojis
- 🔄 **Two-Way Process**: Encrypt text to emojis and decrypt emojis back to text
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful dark theme with animations and glass effects
- 📋 **Copy to Clipboard**: Easy sharing with one-click copy functionality
- ⚡ **Fast Performance**: Built with Next.js for optimal performance

## How It Works

1. **Encrypt Mode**: 
   - Enter your secret message
   - Set a password
   - Get encrypted emojis to share

2. **Decrypt Mode**:
   - Paste the encrypted emojis
   - Enter the same password
   - Retrieve the original message

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd text-to-emojis-converter
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Encryption**: CryptoJS (AES encryption)
- **Icons**: Lucide React
- **Deployment Ready**: Vercel, Netlify, or any Node.js hosting

## Security Features

- Password-based AES encryption
- No data stored on servers
- Client-side encryption/decryption
- Extensive emoji set for better security

## Usage Examples

### Encrypting a Message
1. Switch to "Encrypt Text" tab
2. Type: "Hello, this is a secret message!"
3. Password: "mySecretKey123"
4. Result: 😀🎃💫🦋🌟💝🚀🎨🌈✨💎🔥🎪🦄🌸...

### Decrypting a Message
1. Switch to "Decrypt Emojis" tab
2. Paste the encrypted emojis
3. Enter the same password: "mySecretKey123"
4. Get back: "Hello, this is a secret message!"

## Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Submitting pull requests

## License

This project is open source and available under the MIT License.

---

**Crafted with ❤️ by Chaudhary-Hanan**
