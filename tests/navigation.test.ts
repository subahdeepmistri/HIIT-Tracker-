import { describe, expect, it, vi } from 'vitest';

import { goBackOr } from '../src/ui/navigation';

describe('goBackOr', () => {
  it('always replaces so Expo never receives an unhandled GO_BACK', () => {
    const router = { canGoBack: () => true, back: vi.fn(), replace: vi.fn() };
    goBackOr(router, '/workouts');
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/workouts');
  });

  it('replaces even when the stack looks empty', () => {
    const router = { canGoBack: () => false, back: vi.fn(), replace: vi.fn() };
    goBackOr(router, '/history');
    expect(router.replace).toHaveBeenCalledWith('/history');
  });
});
