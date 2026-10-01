import { useState, useEffect } from 'react';
import { getMediaUrl } from '../services/mediaStorage';

/**
 * Hook that retrieves a media URL from IndexedDB and creates
 * an object URL for rendering. Automatically revokes on unmount.
 *
 * Falls back to the provided fallbackUrl if mediaId is not found.
 */
export function useMediaUrl(mediaId: string | undefined, fallbackUrl?: string): {
  url: string | null;
  loading: boolean;
} {
  const [url, setUrl] = useState<string | null>(fallbackUrl || null);
  const [loading, setLoading] = useState(!!mediaId);

  useEffect(() => {
    if (!mediaId) {
      setUrl(fallbackUrl || null);
      setLoading(false);
      return;
    }

    let revoked = false;
    let objectUrl: string | null = null;

    const load = async () => {
      try {
        const retrieved = await getMediaUrl(mediaId);
        if (!revoked) {
          if (retrieved) {
            objectUrl = retrieved;
            setUrl(retrieved);
          } else {
            // Media not found in IndexedDB — use fallback
            setUrl(fallbackUrl || null);
          }
          setLoading(false);
        } else if (retrieved) {
          // Component unmounted before we finished — clean up
          URL.revokeObjectURL(retrieved);
        }
      } catch {
        if (!revoked) {
          setUrl(fallbackUrl || null);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      revoked = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [mediaId, fallbackUrl]);

  return { url, loading };
}
