import { useNavigate, useRouterState } from "@tanstack/react-router";

export function useSearchParams(): [
  URLSearchParams,
  (
    next: URLSearchParams | Record<string, string | undefined> | ((prev: URLSearchParams) => URLSearchParams),
  ) => void,
] {
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });

  const searchParams = new URLSearchParams(searchStr);

  const setSearchParams = (
    next: URLSearchParams | Record<string, string | undefined> | ((prev: URLSearchParams) => URLSearchParams),
  ) => {
    const resolved =
      typeof next === "function"
        ? next(new URLSearchParams(searchStr))
        : next instanceof URLSearchParams
          ? next
          : new URLSearchParams(
              Object.entries(next).flatMap(([k, v]) => (v === undefined ? [] : [[k, v]])),
            );

    const search = Object.fromEntries(resolved.entries()) as Record<string, string>;
    navigate({ search, replace: true });
  };

  return [searchParams, setSearchParams];
}
