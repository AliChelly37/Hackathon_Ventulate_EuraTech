import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { suggestFieldPlaceholders } from "@/lib/ai-suggest.functions";

export type AiField = { key: string; label: string; hint?: string };

/**
 * Fetch contextual placeholders for a set of fields. Returns a map keyed by field key.
 * Re-fetches when `context` changes. Empty context → empty map.
 *
 * Use together with `resolveValue(value, placeholders[key])` at submission: if the user
 * leaves a field empty, the placeholder text becomes the saved answer.
 */
export function useAiPlaceholders(context: string, fields: AiField[]) {
  const fn = useServerFn(suggestFieldPlaceholders);
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify({ c: context, f: fields.map((f) => f.key) });

  useEffect(() => {
    let cancelled = false;
    const ctx = context.trim();
    if (!ctx || fields.length === 0) { setPlaceholders({}); return; }
    setLoading(true);
    fn({ data: { context: ctx, fields } })
      .then((r) => { if (!cancelled) setPlaceholders(r.suggestions ?? {}); })
      .catch(() => { if (!cancelled) setPlaceholders({}); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { placeholders, loading };
}

/** If user left field empty, fall back to the AI placeholder as the official answer. */
export function resolveValue(value: string, placeholder: string | undefined): string {
  const v = (value ?? "").trim();
  if (v) return v;
  return (placeholder ?? "").trim();
}