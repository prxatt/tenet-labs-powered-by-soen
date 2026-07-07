import { useEffect, useState } from 'react';

interface Wx { temp: number; city: string; condition: string; }

const CODES: Record<number, string> = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy', 51: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Snow', 80: 'Showers', 95: 'Thunderstorm',
};

export default function WeatherChip() {
  const [wx, setWx] = useState<Wx | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: la, longitude: lo } = pos.coords;
        const met = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`,
        );
        const mj = await met.json();
        const temp = Math.round(mj.current?.temperature_2m ?? 0);
        const code = mj.current?.weather_code ?? 0;
        let city = '';
        try {
          const geo = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${la}&longitude=${lo}&localityLanguage=en`);
          const gj = await geo.json();
          city = gj.city || gj.locality || gj.principalSubdivision || '';
        } catch { /* city optional */ }
        setWx({ temp, city, condition: CODES[code] || 'Clear' });
      } catch { /* weather optional */ }
      setLoading(false);
    }, () => setLoading(false), { maximumAge: 600000, timeout: 12000 });
  }, []);

  if (loading) return <span className="live-chip weather">…</span>;
  if (!wx) return null;
  return (
    <span className="live-chip weather" title={wx.condition}>
      {wx.temp}°{wx.city ? ` · ${wx.city}` : ''}
    </span>
  );
}
