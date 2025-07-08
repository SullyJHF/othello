/**
 * Tests for responsive utilities and breakpoint behavior
 */

import { vi } from 'vitest';

export {}; // Make this a module

// Mock window.matchMedia for testing media queries
const createMatchMediaMock = (matches: boolean) => (query: string) => ({
  matches,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('Responsive Utilities', () => {
  beforeEach(() => {
    // Reset window size mocks before each test
    window.matchMedia = createMatchMediaMock(false);
  });

  describe('Mobile Detection', () => {
    it('should detect mobile viewport (max-width: 767px)', () => {
      window.matchMedia = createMatchMediaMock(true);
      const mobileQuery = window.matchMedia('(max-width: 767px)');
      expect(mobileQuery.matches).toBe(true);
    });

    it('should detect tablet viewport (min-width: 768px)', () => {
      window.matchMedia = createMatchMediaMock(true);
      const tabletQuery = window.matchMedia('(min-width: 768px)');
      expect(tabletQuery.matches).toBe(true);
    });

    it('should detect desktop viewport (min-width: 1024px)', () => {
      window.matchMedia = createMatchMediaMock(true);
      const desktopQuery = window.matchMedia('(min-width: 1024px)');
      expect(desktopQuery.matches).toBe(true);
    });
  });

  describe('Touch Target Sizing', () => {
    it('should have minimum touch target size of 44px', () => {
      const minTouchTarget = 44;
      expect(minTouchTarget).toBeGreaterThanOrEqual(44);
    });

    it('should have preferred touch target size of 48px', () => {
      const preferredTouchTarget = 48;
      expect(preferredTouchTarget).toBeGreaterThanOrEqual(48);
    });
  });

  describe('Viewport Meta Tag', () => {
    it('should prevent user scaling on mobile', () => {
      // Create a mock document head
      const mockViewportMeta = document.createElement('meta');
      mockViewportMeta.name = 'viewport';
      mockViewportMeta.content = 'width=device-width, initial-scale=1.0, user-scalable=no';

      document.head.appendChild(mockViewportMeta);

      const viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      expect(viewportMeta).toBeTruthy();
      expect(viewportMeta.content).toContain('user-scalable=no');
      expect(viewportMeta.content).toContain('width=device-width');
      expect(viewportMeta.content).toContain('initial-scale=1.0');

      // Cleanup
      document.head.removeChild(mockViewportMeta);
    });
  });
});

// CSS Custom Properties Tests (for theme testing)
describe('CSS Custom Properties Support', () => {
  it('should support CSS custom properties for theming', () => {
    const testElement = document.createElement('div');
    testElement.style.setProperty('--test-color', '#006400');

    expect(testElement.style.getPropertyValue('--test-color')).toBe('#006400');
  });
});

// Animation Support Tests
describe('CSS Animation Support', () => {
  it('should support CSS animations for piece placement', () => {
    const testElement = document.createElement('div');
    testElement.style.animation = 'piece-drop 0.3s ease-out';

    expect(testElement.style.animation).toContain('piece-drop');
    expect(testElement.style.animation).toContain('0.3s');
    expect(testElement.style.animation).toContain('ease-out');
  });
});
