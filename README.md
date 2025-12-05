# @fimbul-works/barcode-scanner

A lightweight, zero-dependency TypeScript library for detecting barcode scanner input in web applications.

[![npm version](https://badge.fury.io/js/%40fimbul-works%2Fbarcode-scanner.svg)](https://www.npmjs.com/package/@fimbul-works/barcode-scanner)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/microsoft/TypeScript)

## Features

- 🎯 **Zero Dependencies**: Lightweight and self-contained
- ⚡ **Fast Detection**: Identifies barcode scans by monitoring rapid keystroke patterns (typically <10ms between characters)
- 🔒 **Type-Safe**: Fully typed with TypeScript
- 🎛️ **Configurable**: Customize timing, termination keys, and length constraints
- 🐛 **Debug Mode**: Optional keystroke timing data for troubleshooting

## Installation

```bash
npm install @fimbul-works/barcode-scanner
# or
yarn add @fimbul-works/barcode-scanner
# or
pnpm install @fimbul-works/barcode-scanner
```

## Quick Start

```typescript
import { BarcodeDetector } from '@fimbul-works/barcode-scanner';

// Create a detector with default settings
const detector = new BarcodeDetector();

// Listen for scans
const unsubscribe = detector.onScan((event) => {
  console.log('Barcode detected:', event.barcode);
  console.log('Scanned at:', new Date(event.timestamp));
});

// When done, cleanup
unsubscribe();
// or
detector.destroy();
```

## How It Works

Barcode scanners act as "fast keyboard input devices" that send keydown events in rapid succession—much faster than human typing. This library detects those patterns by:

1. Monitoring keystroke timing (default: <10ms between characters)
2. Buffering characters until a termination key (default: Enter) or timeout
3. Validating the length meets minimum requirements (default: 3 characters)
4. Emitting a scan event with the detected barcode

## Configuration Options

```typescript
const detector = new BarcodeDetector({
  maxDelay: 10,              // Max ms between keystrokes (default: 10)
  terminationKey: 'Enter',   // Key that ends scan (default: 'Enter')
  minBarcodeLength: 3,       // Minimum characters (default: 3)
  maxBarcodeLength: 100,     // Maximum characters (default: 100)
  enableDebugEvents: false,  // Include timing data (default: false)
  preventDefault: false,     // Prevent default key behavior (default: false)
});
```

## Advanced Usage

### Debug Mode

Enable debug mode to see detailed keystroke timing information:

```typescript
const detector = new BarcodeDetector({
  enableDebugEvents: true,
});

detector.onScan((event) => {
  console.log('Barcode:', event.barcode);
  console.log('Keystroke data:', event.keystrokes);
  // Example output:
  // [
  //   { key: '1', timestamp: 1234567890, delay: 0 },
  //   { key: '2', timestamp: 1234567895, delay: 5 },
  //   { key: '3', timestamp: 1234567900, delay: 5 },
  // ]
});
```

### Multiple Listeners

You can attach multiple listeners to the same detector:

```typescript
const detector = new BarcodeDetector();

const unsubscribe1 = detector.onScan((event) => {
  updateInventory(event.barcode);
});

const unsubscribe2 = detector.onScan((event) => {
  logToAudit(event.barcode);
});

// Cleanup individual listeners
unsubscribe1();
unsubscribe2();
```

### Custom Termination Key

Some scanners can be configured to use different termination characters:

```typescript
const detector = new BarcodeDetector({
  terminationKey: 'Tab', // Use Tab instead of Enter
});
```

### Prevent Default Behavior

Prevent barcode scans from triggering form submissions or other default actions:

```typescript
const detector = new BarcodeDetector({
  preventDefault: true,
});
```

## Troubleshooting

### Scans aren't being detected

1. Check that your scanner is in keyboard emulation mode
2. Verify the termination key matches your scanner's configuration
3. Enable debug mode to inspect timing between keystrokes
4. Adjust `maxDelay` if your scanner is slower than 10ms between characters

### False positives (regular typing detected as scans)

1. Increase `minBarcodeLength` to require longer inputs
2. Decrease `maxDelay` to require faster typing (humans typically type slower than 50ms/character)

### Scanner interferes with forms

Set `preventDefault: true` to stop barcode input from affecting the page.

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

Built with ⚡ by [FimbulWorks](https://github.com/fimbul-works)
