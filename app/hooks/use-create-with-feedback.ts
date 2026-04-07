'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { resourceEvents, type ResourceEvent, type ResourceKey } from '@/lib/resource-events';

export interface UseCreateWithFeedbackOptions<TInput, TOutput> {
  /** The async creator (e.g. a service call). */
  mutationFn: (input: TInput) => Promise<TOutput>;
  /** Resource key(s) to invalidate on success — subscribers auto-refresh. */
  invalidates?: ResourceKey | ResourceKey[];
  /** Text used while the request is in flight. Shown as loading toast. */
  loadingMessage?: string;
  /** Text used after success. Pass a function to derive from the result. */
  successMessage?: string | ((result: TOutput) => string);
  /** Text used after failure. Defaults to the error's message. */
  errorMessage?: string | ((error: unknown) => string);
  /** Called after a successful mutation (for local state updates, navigation, etc). */
  onSuccess?: (result: TOutput) => void | Promise<void>;
  /** Called after a failed mutation. */
  onError?: (error: unknown) => void;
  /** Show toast(s). Defaults to true. */
  showToasts?: boolean;
}

export interface CreateMutationState<TInput, TOutput> {
  run: (input: TInput) => Promise<TOutput | undefined>;
  isPending: boolean;
  error: unknown;
  data: TOutput | undefined;
  reset: () => void;
}

/**
 * Generic "create something" hook.
 *
 * Handles:
 *  - loading state (isPending) to disable buttons and show spinners
 *  - sonner toasts: loading → success | error
 *  - emitting resource events so listings refresh automatically
 *  - swallowing concurrent calls (prevents double-submits)
 *
 * Usage:
 *   const createList = useCreateWithFeedback({
 *     mutationFn: (input) => listsService.create(input),
 *     invalidates: 'lists',
 *     loadingMessage: 'Criando lista...',
 *     successMessage: 'Lista criada com sucesso.',
 *   });
 *   <Button disabled={createList.isPending} onClick={() => createList.run({ name })} />
 */
export function useCreateWithFeedback<TInput, TOutput>(
  options: UseCreateWithFeedbackOptions<TInput, TOutput>,
): CreateMutationState<TInput, TOutput> {
  const {
    mutationFn,
    invalidates,
    loadingMessage,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    showToasts = true,
  } = options;

  const [isPending, setIsPending] = useState(false);
  const [data, setData] = useState<TOutput | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const inflight = useRef(false);

  const run = useCallback(
    async (input: TInput): Promise<TOutput | undefined> => {
      if (inflight.current) return undefined;
      inflight.current = true;
      setIsPending(true);
      setError(null);

      const toastId = showToasts && loadingMessage ? toast.loading(loadingMessage) : undefined;

      try {
        const result = await mutationFn(input);
        setData(result);

        if (invalidates) {
          const event: ResourceEvent = {
            action: 'created',
            data: result,
            id:
              result && typeof result === 'object' && 'id' in (result as Record<string, unknown>)
                ? ((result as Record<string, unknown>).id as number | string)
                : undefined,
          };
          resourceEvents.emit(invalidates, event);
        }

        if (showToasts) {
          const msg =
            typeof successMessage === 'function'
              ? successMessage(result)
              : successMessage ?? 'Criado com sucesso.';
          if (toastId !== undefined) {
            toast.success(msg, { id: toastId });
          } else {
            toast.success(msg);
          }
        }

        await onSuccess?.(result);
        return result;
      } catch (err) {
        setError(err);

        if (showToasts) {
          const fallback =
            err instanceof ApiError || err instanceof Error
              ? err.message
              : 'Não foi possível concluir a ação.';
          const msg =
            typeof errorMessage === 'function'
              ? errorMessage(err)
              : errorMessage ?? fallback;
          if (toastId !== undefined) {
            toast.error(msg, { id: toastId });
          } else {
            toast.error(msg);
          }
        }

        onError?.(err);
        return undefined;
      } finally {
        inflight.current = false;
        setIsPending(false);
      }
    },
    [
      mutationFn,
      invalidates,
      loadingMessage,
      successMessage,
      errorMessage,
      onSuccess,
      onError,
      showToasts,
    ],
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setIsPending(false);
  }, []);

  return { run, isPending, data, error, reset };
}
