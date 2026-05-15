import { useEffect, useState } from "react";

interface Result<T> {
  data: T | null;
  error: { message: string } | null;
}

type Loader<T> = () => PromiseLike<Result<T>>;

export function useSupabaseQuery<T>(
  loader: Loader<T>,
  deps: ReadonlyArray<unknown> = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshIdx, setRefreshIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.resolve(loader()).then(({ data, error }) => {
      if (cancelled) return;
      setData(data);
      setError(error?.message ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshIdx]);

  return { data, error, loading, refresh: () => setRefreshIdx((i) => i + 1) };
}
