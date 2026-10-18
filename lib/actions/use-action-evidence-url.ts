"use client";

import { useEffect, useState } from "react";

import type { MyActionEvidence } from "@/features/five-s/types/my-actions";
import { getGembaPhoto } from "@/lib/gemba/gemba-photo-storage";

/** Resolves source-owned evidence without copying its binary into the Action. */
export function useActionEvidenceUrl(evidence: Pick<MyActionEvidence, "url" | "storageKey"> | null | undefined) {
  const directUrl = evidence?.url || undefined;
  const storageKey = evidence?.storageKey;
  const [resolvedUrl, setResolvedUrl] = useState<{ key: string; url: string }>();

  useEffect(() => {
    if (directUrl || !storageKey) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    getGembaPhoto(storageKey)
      .then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedUrl({ key: storageKey, url: objectUrl });
      })
      .catch((error) => console.error(`[actions] unable to resolve source evidence ${storageKey}`, error));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [directUrl, storageKey]);

  return directUrl ?? (resolvedUrl && resolvedUrl.key === storageKey ? resolvedUrl.url : undefined);
}
