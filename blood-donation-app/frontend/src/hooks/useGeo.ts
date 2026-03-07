import { useState, useEffect } from 'react';

export function useGeo(): { lng: number | null; lat: number | null; error: string | null } {
  const [lng, setLng] = useState<number | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setError(null);
      },
      () => setError('Location unavailable'),
      { maximumAge: 60000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { lng, lat, error };
}
