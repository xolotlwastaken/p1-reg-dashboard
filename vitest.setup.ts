import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock
});

Object.defineProperty(globalThis.URL, "createObjectURL", {
  writable: true,
  value: () => "blob:mock"
});

Object.defineProperty(globalThis.URL, "revokeObjectURL", {
  writable: true,
  value: () => undefined
});

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  get() {
    return 960;
  }
});

Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  get() {
    return 540;
  }
});

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return {
    width: 960,
    height: 540,
    top: 0,
    left: 0,
    right: 960,
    bottom: 540,
    x: 0,
    y: 0,
    toJSON() {
      return this;
    }
  };
};
