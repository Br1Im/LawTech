import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCrmList, useCrmMutation } from './queryHooks';

vi.mock('./instance', () => ({
  apiInstance: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiInstance } from './instance';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { Wrapper, client };
}

describe('useCrmList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an array when API returns a plain array', async () => {
    (apiInstance.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{ id: 1 }, { id: 2 }],
    });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCrmList('applications'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(apiInstance.get).toHaveBeenCalledWith('/applications');
  });

  it('unwraps {data: [...]} envelope from paginated endpoint', async () => {
    (apiInstance.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true, data: [{ id: 7 }], total: 1, page: 1, page_size: 50 },
    });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCrmList('cases'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 7 }]);
  });

  it('returns empty array when API returns unexpected shape', async () => {
    (apiInstance.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: null });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCrmList('cases'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useCrmMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates the list cache after a successful POST', async () => {
    (apiInstance.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: [{ id: 1 }] })
      .mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });
    (apiInstance.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { success: true },
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => ({
        list: useCrmList<{ id: number }>('applications'),
        create: useCrmMutation<{ topic: string }>({ resource: 'applications', method: 'post' }),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(result.current.list.data?.length).toBe(1);

    result.current.create.mutate({ topic: 'Test' });

    await waitFor(() => expect(apiInstance.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.list.data?.length).toBe(2));
  });

  it('builds custom URL for DELETE via url() callback', async () => {
    (apiInstance.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useCrmMutation<{ id: number }>({
          resource: 'applications',
          method: 'delete',
          url: ({ id }) => `/applications/${id}`,
        }),
      { wrapper: Wrapper },
    );

    result.current.mutate({ id: 42 });
    await waitFor(() => expect(apiInstance.delete).toHaveBeenCalledWith('/applications/42'));
  });
});
