export function WeatherLogo() {
  const stationName = process.env.NEXT_PUBLIC_STATION_NAME || 'Weather Station';
  
  return (
    <div className="flex items-center gap-2">
      <div className="text-2xl">🌪️</div>
      <div className="font-light tracking-wide text-xl">
        {stationName}
      </div>
    </div>
  );
} 