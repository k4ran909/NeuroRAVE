import { afterEach } from 'vitest';
import { useRNG } from './packages/core/signal.mjs';

afterEach(() => {
  // Avoid bleed between tests
  useRNG('legacy');
});
