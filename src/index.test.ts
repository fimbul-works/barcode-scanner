import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeDetector, type ScanEvent } from "./index.js";

describe("BarcodeDetector", () => {
  let detector: BarcodeDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    detector = new BarcodeDetector();
  });

  afterEach(() => {
    detector.destroy();
    vi.restoreAllMocks();
  });

  describe("Basic Detection", () => {
    it("should detect rapid keystrokes as barcode scan", () => {
      const listener = vi.fn();
      detector.onScan(listener);

      // Simulate rapid keystrokes (< 10ms apart)
      const keystrokes = ["1", "2", "3", "4", "5"];
      keystrokes.forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);

        if (index < keystrokes.length - 1) {
          vi.advanceTimersByTime(5); // 5ms between keystrokes (rapid)
        }
      });

      // Fast forward to trigger timeout
      vi.advanceTimersByTime(10);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        barcode: "12345",
        timestamp: expect.any(Number),
      });
    });

    it("should ignore slow keystrokes", () => {
      const listener = vi.fn();
      detector.onScan(listener);

      // Simulate slow keystrokes (> 10ms apart)
      const event1 = new KeyboardEvent("keydown", { key: "1" });
      document.dispatchEvent(event1);
      vi.advanceTimersByTime(15); // 15ms delay (too slow)

      const event2 = new KeyboardEvent("keydown", { key: "2" });
      document.dispatchEvent(event2);
      vi.advanceTimersByTime(15);

      const event3 = new KeyboardEvent("keydown", { key: "3" });
      document.dispatchEvent(event3);
      vi.advanceTimersByTime(100); // Complete timeout

      expect(listener).not.toHaveBeenCalled();
    });

    it("should require minimum barcode length", () => {
      const listener = vi.fn();
      detector.onScan(listener);

      // Send only 2 characters (below default min of 3)
      const event1 = new KeyboardEvent("keydown", { key: "1" });
      document.dispatchEvent(event1);
      vi.advanceTimersByTime(5);

      const event2 = new KeyboardEvent("keydown", { key: "2" });
      document.dispatchEvent(event2);
      vi.advanceTimersByTime(100); // Complete timeout

      expect(listener).not.toHaveBeenCalled();
    });

    it("should respect custom minimum barcode length", () => {
      const customDetector = new BarcodeDetector({ minBarcodeLength: 5 });
      const listener = vi.fn();
      customDetector.onScan(listener);

      // Send 4 characters (below custom min of 5)
      ["1", "2", "3", "4"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 3) vi.advanceTimersByTime(5);
      });
      vi.advanceTimersByTime(100);

      expect(listener).not.toHaveBeenCalled();

      customDetector.destroy();
    });
  });

  describe("Termination Detection", () => {
    it("should terminate scan with Enter key", () => {
      const listener = vi.fn();
      detector.onScan(listener);

      // Send rapid keystrokes followed by Enter
      ["1", "2", "3"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(5);
      });

      const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
      document.dispatchEvent(enterEvent);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        barcode: "123",
        timestamp: expect.any(Number),
      });
    });

    it("should terminate scan with custom termination key", () => {
      const customDetector = new BarcodeDetector({ terminationKey: "Tab" });
      const listener = vi.fn();
      customDetector.onScan(listener);

      ["1", "2", "3"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(5);
      });

      const tabEvent = new KeyboardEvent("keydown", { key: "Tab" });
      document.dispatchEvent(tabEvent);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        barcode: "123",
        timestamp: expect.any(Number),
      });

      customDetector.destroy();
    });

    it("should clear buffer on early termination", () => {
      const listener = vi.fn();
      detector.onScan(listener);

      // Send 1 character then Enter (below min length)
      const event1 = new KeyboardEvent("keydown", { key: "1" });
      document.dispatchEvent(event1);

      const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
      document.dispatchEvent(enterEvent);

      expect(listener).not.toHaveBeenCalled();

      // Send more characters - should start fresh
      ["4", "5", "6"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(5);
      });
      vi.advanceTimersByTime(100);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        barcode: "456",
        timestamp: expect.any(Number),
      });
    });
  });

  describe("Listener Management", () => {
    it("should return working unsubscribe function", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = detector.onScan(listener1);
      detector.onScan(listener2);

      // Send a barcode scan
      ["1", "2", "3"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(5);
      });
      vi.advanceTimersByTime(100);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      // Unsubscribe first listener
      unsubscribe1();

      // Send another scan
      ["4", "5", "6"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(5);
      });
      vi.advanceTimersByTime(100);

      // First listener should not be called again
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it("should attach global listener only when first listener added", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      const unsubscribe = detector.onScan(vi.fn());

      expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function), true);

      addEventListenerSpy.mockRestore();
      unsubscribe();
    });

    it("should remove global listener when last listener unsubscribed", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const unsubscribe = detector.onScan(vi.fn());
      unsubscribe(); // Remove the only listener

      expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function), true);

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should ignore modifier keys", () => {
      const listener = vi.fn();
      detector.onScan(listener);

      // Send modifier keys
      const keys = ["Shift", "Alt", "Control", "Meta"];
      keys.forEach((key) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
      });

      vi.advanceTimersByTime(100);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should handle mixed speed input correctly", () => {
      const listener = vi.fn();
      detector.onScan(listener);

      // Start rapid, then slow down
      const event1 = new KeyboardEvent("keydown", { key: "1" });
      document.dispatchEvent(event1);
      vi.advanceTimersByTime(5); // Fast

      const event2 = new KeyboardEvent("keydown", { key: "2" });
      document.dispatchEvent(event2);
      vi.advanceTimersByTime(15); // Slow - should break sequence

      const event3 = new KeyboardEvent("keydown", { key: "3" });
      document.dispatchEvent(event3);
      vi.advanceTimersByTime(5); // Fast again

      const event4 = new KeyboardEvent("keydown", { key: "4" });
      document.dispatchEvent(event4);
      vi.advanceTimersByTime(100);

      // Should not detect as barcode scan due to mixed timing
      expect(listener).not.toHaveBeenCalled();
    });

    it("should work regardless of active element focus", () => {
      // Mock active element as input field
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);
      Object.defineProperty(document, "activeElement", {
        value: input,
        writable: true,
      });

      const listener = vi.fn();
      detector.onScan(listener);

      ["1", "2", "3"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(5);
      });
      vi.advanceTimersByTime(100);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        barcode: "123",
        timestamp: expect.any(Number),
      });

      document.body.removeChild(input);
    });

    it("should handle empty key events gracefully", () => {
      const listener = vi.fn();
      detector.onScan(listener);

      // Send event with empty key
      const event = new KeyboardEvent("keydown", { key: "" });
      document.dispatchEvent(event);
      vi.advanceTimersByTime(100);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Configuration Options", () => {
    it("should use custom maxDelay", () => {
      const customDetector = new BarcodeDetector({ maxDelay: 50 });
      const listener = vi.fn();
      customDetector.onScan(listener);

      ["1", "2", "3"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(20); // 20ms apart (slower than default but within custom maxDelay)
      });
      vi.advanceTimersByTime(50); // Wait for custom timeout

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        barcode: "123",
        timestamp: expect.any(Number),
      });

      customDetector.destroy();
    });
  });

  describe("Debug Mode", () => {
    it("should capture raw keystroke data when debug enabled", () => {
      const debugDetector = new BarcodeDetector({ enableDebugEvents: true });
      const listener = vi.fn();
      debugDetector.onScan(listener);

      ["1", "2", "3"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(5);
      });
      vi.advanceTimersByTime(100);

      expect(listener).toHaveBeenCalledTimes(1);
      const scanEvent = listener.mock.calls[0][0] as ScanEvent;
      expect(scanEvent.keystrokes).toBeDefined();
      expect(scanEvent.keystrokes).toHaveLength(3);
      expect(scanEvent.keystrokes![0]).toEqual({
        key: "1",
        timestamp: expect.any(Number),
        delay: 0, // First keystroke has 0 delay
      });
      expect(scanEvent.keystrokes![1].delay).toBe(5);

      debugDetector.destroy();
    });

    it("should omit keystroke data when debug disabled", () => {
      const listener = vi.fn();
      detector.onScan(listener);

      ["1", "2", "3"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(5);
      });
      vi.advanceTimersByTime(100);

      expect(listener).toHaveBeenCalledTimes(1);
      const scanEvent = listener.mock.calls[0][0] as ScanEvent;
      expect(scanEvent.keystrokes).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle listener errors gracefully", () => {
      const faultyListener = vi.fn(() => {
        throw new Error("Listener error");
      });
      const workingListener = vi.fn();

      detector.onScan(faultyListener);
      detector.onScan(workingListener);

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      ["1", "2", "3"].forEach((key, index) => {
        const event = new KeyboardEvent("keydown", { key });
        document.dispatchEvent(event);
        if (index < 2) vi.advanceTimersByTime(5);
      });
      vi.advanceTimersByTime(100);

      // Both listeners should be called despite error in first
      expect(faultyListener).toHaveBeenCalledTimes(1);
      expect(workingListener).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith("Error in barcode scan listener:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
