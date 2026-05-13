/**
 * Тонкие обёртки над TanStack Query для типовых CRM-эндпоинтов.
 *
 * Делают три вещи:
 *  1) Кэшируют ответ списка по ключу [resource] — при переключении вкладок
 *     данные показываются мгновенно из кэша, в фоне обновляются.
 *  2) `useCrmList` нормализует ответ — бэк может возвращать либо массив,
 *     либо `{ success, data }`, либо `{ data, total, page, ... }` (после
 *     перехода на пагинацию в PR #17).
 *  3) `useCrmMutation` после успешного create/update/delete инвалидирует
 *     соответствующий list-кэш, чтобы UI сразу подтянул свежее состояние.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiInstance } from './instance';

type ListResponse<T> = T[] | { data?: T[]; items?: T[] };

function normalizeList<T>(payload: ListResponse<T> | unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const obj = payload as { data?: T[]; items?: T[] } | null | undefined;
  if (obj && Array.isArray(obj.data)) return obj.data;
  if (obj && Array.isArray(obj.items)) return obj.items;
  return [];
}

export function useCrmList<T>(
  resource: string,
  options?: Omit<UseQueryOptions<T[], Error, T[], string[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T[], Error, T[], string[]>({
    queryKey: [resource],
    queryFn: async () => {
      const res = await apiInstance.get(`/${resource}`);
      return normalizeList<T>(res.data);
    },
    ...options,
  });
}

type Method = 'post' | 'put' | 'patch' | 'delete';

interface CrmMutationParams<TVars> {
  resource: string;
  method: Method;
  url?: (vars: TVars) => string;
}

export function useCrmMutation<TVars = unknown, TResp = unknown>(
  { resource, method, url }: CrmMutationParams<TVars>,
  options?: UseMutationOptions<TResp, Error, TVars>,
) {
  const qc = useQueryClient();
  return useMutation<TResp, Error, TVars>({
    mutationFn: async (vars: TVars) => {
      const path = url ? url(vars) : `/${resource}`;
      const cfg = method === 'delete' || method === 'get' ? undefined : (vars as object);
      const res =
        method === 'delete'
          ? await apiInstance.delete(path)
          : method === 'post'
            ? await apiInstance.post(path, cfg)
            : method === 'put'
              ? await apiInstance.put(path, cfg)
              : await apiInstance.patch(path, cfg);
      return res.data as TResp;
    },
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: [resource] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
