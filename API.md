# @fimbul-works/barcode-scanner API Documentation

Complete API for [@fimbul-works/barcode-scanner](README.md) - lightweight TypeScript library for detecting barcode scanner input in web applications by monitoring rapid keyboard event patterns.

## BarcodeDetector

Detects barcode scanner input by monitoring rapid keyboard event patterns.

Barcode scanners function as "very fast keyboard input devices" that send
keydown events in rapid succession (typically < 10ms between characters).
This detector identifies those patterns and emits scan events when valid
barcodes are detected.

Examples:

```typescript
const detector = new BarcodeDetector({
  maxDelay: 10,
  minBarcodeLength: 8
});

const unsubscribe = detector.onScan((event) => {
  console.log('Detected barcode:', event.barcode);
  updateInventory(event.barcode);
});

// Later, cleanup
unsubscribe();
// or
detector.destroy();
```
Debug mode for troubleshooting
```typescript
const detector = new BarcodeDetector({
enableDebugEvents: true
});

detector.onScan((event) => {
console.log('Barcode:', event.barcode);
console.log('Timing data:', event.keystrokes);
});
```


### Methods

- [onScan](#onscan)
- [destroy](#destroy)

#### onScan

Subscribe to scan events

| Method | Type |
| ---------- | ---------- |
| `onScan` | `(listener: ScanListener) => UnsubscribeFn` |

Parameters:

* `listener`: Function to call when a barcode scan is detected


Returns:

Unsubscribe function

#### destroy

Destroy and cleanup all resources

| Method | Type |
| ---------- | ---------- |
| `destroy` | `() => void` |

## Interfaces

- [BarcodeDetectorOptions](#barcodedetectoroptions)
- [ScanEvent](#scanevent)
- [KeystrokeData](#keystrokedata)

### BarcodeDetectorOptions

Options passed to the BarcodeDetector class constructor.

| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `maxDelay` | `number or undefined` | Maximum milliseconds between keystrokes to consider them part of the same scan (default: 10) |
| `terminationKey` | `string or undefined` | Key that signals the end of a barcode scan (default: 'Enter') |
| `minBarcodeLength` | `number or undefined` | Minimum number of characters required for a valid barcode (default: 3) |
| `maxBarcodeLength` | `number or undefined` | Maximum number of characters to prevent stuck scans (default: 100) |
| `enableDebugEvents` | `boolean or undefined` | Include raw keystroke timing data in scan events (default: false) |
| `preventDefault` | `boolean or undefined` | Prevent the KeyboardEvent from bubbling through DOM (default: false) |


### ScanEvent

Results of a bar code scanning event.

| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `barcode` | `string` | The detected barcode string |
| `timestamp` | `number` | When scan completed (Date.now()) |
| `keystrokes` | `KeystrokeData[] or undefined` | Raw keystroke data (if debug enabled) |


### KeystrokeData

Data for an individual keystroke.

| Property | Type | Description |
| ---------- | ---------- | ---------- |
| `key` | `string` | The key that was pressed |
| `timestamp` | `number` | When the key was pressed (Date.now()) |
| `delay` | `number` | Delay from previous keystroke (ms) |


## Types

- [ScanListener](#scanlistener)
- [UnsubscribeFn](#unsubscribefn)

### ScanListener

Function signature for a scan event listener.

| Type | Type |
| ---------- | ---------- |
| `ScanListener` | `(event: ScanEvent) => void` |

### UnsubscribeFn

Function signature for a scan even listener unsubscribe function.

| Type | Type |
| ---------- | ---------- |
| `UnsubscribeFn` | `() => void` |

