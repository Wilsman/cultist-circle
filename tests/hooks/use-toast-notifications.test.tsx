import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastNotifications } from '@/hooks/use-toast-notifications';

const toastMock = vi.fn();

vi.mock('sonner', () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

function ToastHarness() {
  const { triggerNewNotifications } = useToastNotifications();

  useEffect(() => {
    triggerNewNotifications();
  }, [triggerNewNotifications]);

  return null;
}

describe('useToastNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastMock.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('shows the Tarkov.dev API warning toast with an icon', async () => {
    render(<ToastHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(toastMock).toHaveBeenCalledTimes(1);

    const apiCall = toastMock.mock.calls.find(
      ([title]) => title === 'Tarkov.dev API Issues'
    );

    expect(apiCall).toBeDefined();
    expect(apiCall?.[1]).toMatchObject({
      description: expect.stringContaining('Tarkov.dev is currently having API issues'),
      icon: expect.anything(),
    });
  });
});
