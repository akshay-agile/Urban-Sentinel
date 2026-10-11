const EARTH_RADIUS_METERS = 6_371_000;

export function distanceAndDirection(from, to) {
  if (!from || !to || from.length < 2 || to.length < 2) return null;
  const [fromLat, fromLon] = from.map(Number);
  const [toLat, toLon] = to.map(Number);
  if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)
    || Math.abs(fromLat) > 90 || Math.abs(toLat) > 90
    || Math.abs(fromLon) > 180 || Math.abs(toLon) > 180) return null;

  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(toLat - fromLat);
  const longitudeDelta = radians(toLon - fromLon);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(longitudeDelta / 2) ** 2;
  const distance = 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const y = Math.sin(longitudeDelta) * Math.cos(radians(toLat));
  const x = Math.cos(radians(fromLat)) * Math.sin(radians(toLat))
    - Math.sin(radians(fromLat)) * Math.cos(radians(toLat)) * Math.cos(longitudeDelta);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return { distanceMeters: distance, direction: directions[Math.round(bearing / 22.5) % 16] };
}

export function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) return null;
  return distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(1)} km`;
}
