/**
 * Options passed to the BarcodeDetector class constructor.
 */
export interface BarcodeDetectorOptions {
  /** Maximum milliseconds between keystrokes to consider them part of the same scan (default: 20) */
  maxDelay?: number;
  /** Key that signals the end of a barcode scan (default: 'Enter') */
  terminationKey?: string;
  /** Minimum number of characters required for a valid barcode (default: 3) */
  minBarcodeLength?: number;
  /** Maximum number of characters to prevent stuck scans (default: 100) */
  maxBarcodeLength?: number;
  /** Include raw keystroke timing data in scan events (default: false) */
  enableDebugEvents?: boolean;
  /** Prevent the KeyboardEvent from bubbling through DOM (default: false) */
  preventDefault?: boolean;
}

/**
 * Results of a bar code scanning event.
 */
export interface ScanEvent {
  /** The detected barcode string */
  barcode: string;
  /**  When scan completed (Date.now()) */
  timestamp: number;
  /** Raw keystroke data (if debug enabled) */
  keystrokes?: KeystrokeData[];
}

/**
 * Data for an individual keystroke.
 */
export interface KeystrokeData {
  /** The key that was pressed */
  key: string;
  /** When the key was pressed (Date.now()) */
  timestamp: number;
  /** Delay from previous keystroke (ms) */
  delay: number;
}

/**
 * Function signature for a scan event listener.
 */
export type ScanListener = (event: ScanEvent) => void;
/**
 * Function signature for a scan even listener unsubscribe function.
 */
export type UnsubscribeFn = () => void;

/**
 * Detects barcode scanner input by monitoring rapid keyboard event patterns.
 *
 * Barcode scanners function as "very fast keyboard input devices" that send
 * keydown events in rapid succession (typically < 10ms between characters).
 * This detector identifies those patterns and emits scan events when valid
 * barcodes are detected.
 */
export class BarcodeDetector {
  private options: Required<BarcodeDetectorOptions>;
  private listeners: Set<ScanListener> = new Set();
  private buffer: string[] = [];
  private debugData: KeystrokeData[] = [];
  private lastKeystrokeTime: number = 0;
  private timeoutId: number | null = null;
  private isAttached: boolean = false;

  constructor(options: BarcodeDetectorOptions = {}) {
    const {
      maxDelay = 20,
      terminationKey = "Enter",
      minBarcodeLength = 3,
      maxBarcodeLength = 100,
      enableDebugEvents = false,
      preventDefault = false,
    } = options;

    this.options = {
      maxDelay,
      terminationKey,
      minBarcodeLength,
      maxBarcodeLength,
      enableDebugEvents,
      preventDefault,
    };
  }

  /**
   * Subscribe to scan events.
   * @param listener Function to call when a barcode scan is detected
   * @param triggerOnce Remove the listener after triggering
   * @returns Unsubscribe function
   */
  onScan(listener: ScanListener, triggerOnce: boolean = false): UnsubscribeFn {
    // Remove global event listener when no listeners left
    const cleanupIfNeeded = () => {
      if (this.isAttached && this.listeners.size === 0) {
        this.removeGlobalListener();
      }
    };

    // Wrap once triggering function
    const fn = triggerOnce
      ? (event: ScanEvent) => {
          this.listeners.delete(fn);
          listener(event);
          cleanupIfNeeded();
        }
      : listener;

    this.listeners.add(fn);

    // Attach global event listener when first listener is added
    if (!this.isAttached && this.listeners.size === 1) {
      this.attachGlobalListener();
    }

    return () => {
      this.listeners.delete(fn);
      cleanupIfNeeded();
    };
  }

  /**
   * Destroy and cleanup all resources.
   */
  destroy(): void {
    this.listeners.clear();
    this.removeGlobalListener();
    this.clearBuffer();
  }

  private attachGlobalListener(): void {
    if (this.isAttached) return;

    document.addEventListener("keydown", this.handleKeyDown);
    this.isAttached = true;
  }

  private removeGlobalListener(): void {
    if (!this.isAttached) return;

    document.removeEventListener("keydown", this.handleKeyDown);
    this.isAttached = false;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Ignore multi-character keys (F1, ArrowUp, etc.)
    if (event.key.length > 1 && event.key !== this.options.terminationKey) {
      return;
    }

    const now = Date.now();
    const delay = this.lastKeystrokeTime ? now - this.lastKeystrokeTime : 0;
    this.lastKeystrokeTime = now;

    if (event.key === this.options.terminationKey) {
      if (this.buffer.length >= this.options.minBarcodeLength) {
        this.finalizeScan();
      } else {
        this.clearBuffer();
      }
      return;
    }

    this.buffer.push(event.key);

    if (this.buffer.length >= this.options.maxBarcodeLength) {
      this.clearBuffer();
      return;
    }

    if (this.options.enableDebugEvents) {
      this.debugData.push({
        key: event.key,
        timestamp: now,
        delay,
      });
    }

    this.resetTimeout();
  };

  private resetTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      if (this.buffer.length >= this.options.minBarcodeLength) {
        this.finalizeScan();
      } else {
        this.clearBuffer();
      }
    }, this.options.maxDelay);
  }

  private finalizeScan(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const barcode = this.buffer.join("");
    const timestamp = Date.now();

    const scanEvent: ScanEvent = {
      barcode,
      timestamp,
    };

    if (this.options.enableDebugEvents) {
      scanEvent.keystrokes = [...this.debugData];
    }

    this.listeners.forEach((listener) => {
      try {
        listener(scanEvent);
      } catch (error) {
        console.error("Error in barcode scan listener:", error);
      }
    });

    this.clearBuffer();
  }

  private clearBuffer(): void {
    this.buffer = [];
    this.debugData = [];
    this.lastKeystrokeTime = 0;

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export default BarcodeDetector;
