import '@testing-library/jest-dom';
import 'core-js/full/set-immediate';
import { vi } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
});