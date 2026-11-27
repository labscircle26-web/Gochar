export type City = {
  name: string;
  region: string;
  lat: number;
  lon: number;
  tz: string;
};

export const CITIES: City[] = [
  { name: "Delhi", region: "India", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" },
  { name: "Mumbai", region: "India", lat: 19.076, lon: 72.8777, tz: "Asia/Kolkata" },
  { name: "Kolkata", region: "India", lat: 22.5726, lon: 88.3639, tz: "Asia/Kolkata" },
  { name: "Chennai", region: "India", lat: 13.0827, lon: 80.2707, tz: "Asia/Kolkata" },
  { name: "Bengaluru", region: "India", lat: 12.9716, lon: 77.5946, tz: "Asia/Kolkata" },
  { name: "Hyderabad", region: "India", lat: 17.385, lon: 78.4867, tz: "Asia/Kolkata" },
  { name: "Pune", region: "India", lat: 18.5204, lon: 73.8567, tz: "Asia/Kolkata" },
  { name: "Ahmedabad", region: "India", lat: 23.0225, lon: 72.5714, tz: "Asia/Kolkata" },
  { name: "Jaipur", region: "India", lat: 26.9124, lon: 75.7873, tz: "Asia/Kolkata" },
  { name: "Lucknow", region: "India", lat: 26.8467, lon: 80.9462, tz: "Asia/Kolkata" },
  { name: "Varanasi", region: "India", lat: 25.3176, lon: 82.9739, tz: "Asia/Kolkata" },
  { name: "Patna", region: "India", lat: 25.5941, lon: 85.1376, tz: "Asia/Kolkata" },
  { name: "Bhopal", region: "India", lat: 23.2599, lon: 77.4126, tz: "Asia/Kolkata" },
  { name: "Chandigarh", region: "India", lat: 30.7333, lon: 76.7794, tz: "Asia/Kolkata" },
  { name: "Amritsar", region: "India", lat: 31.634, lon: 74.8723, tz: "Asia/Kolkata" },
  { name: "Srinagar", region: "India", lat: 34.0837, lon: 74.7973, tz: "Asia/Kolkata" },
  { name: "Guwahati", region: "India", lat: 26.1445, lon: 91.7362, tz: "Asia/Kolkata" },
  { name: "Bhubaneswar", region: "India", lat: 20.2961, lon: 85.8245, tz: "Asia/Kolkata" },
  { name: "Thiruvananthapuram", region: "India", lat: 8.5241, lon: 76.9366, tz: "Asia/Kolkata" },
  { name: "Kochi", region: "India", lat: 9.9312, lon: 76.2673, tz: "Asia/Kolkata" },
  { name: "Madurai", region: "India", lat: 9.9252, lon: 78.1198, tz: "Asia/Kolkata" },
  { name: "Nagpur", region: "India", lat: 21.1458, lon: 79.0882, tz: "Asia/Kolkata" },
  { name: "Indore", region: "India", lat: 22.7196, lon: 75.8577, tz: "Asia/Kolkata" },
  { name: "Surat", region: "India", lat: 21.1702, lon: 72.8311, tz: "Asia/Kolkata" },
  { name: "Visakhapatnam", region: "India", lat: 17.6868, lon: 83.2185, tz: "Asia/Kolkata" },
  { name: "Ujjain", region: "India", lat: 23.1765, lon: 75.7885, tz: "Asia/Kolkata" },
  { name: "Haridwar", region: "India", lat: 29.9457, lon: 78.1642, tz: "Asia/Kolkata" },
  { name: "Mysuru", region: "India", lat: 12.2958, lon: 76.6394, tz: "Asia/Kolkata" },
  { name: "Kathmandu", region: "Nepal", lat: 27.7172, lon: 85.324, tz: "Asia/Kathmandu" },
  { name: "Colombo", region: "Sri Lanka", lat: 6.9271, lon: 79.8612, tz: "Asia/Colombo" },
  { name: "Dhaka", region: "Bangladesh", lat: 23.8103, lon: 90.4125, tz: "Asia/Dhaka" },
  { name: "Karachi", region: "Pakistan", lat: 24.8607, lon: 67.0011, tz: "Asia/Karachi" },
  { name: "Lahore", region: "Pakistan", lat: 31.5204, lon: 74.3587, tz: "Asia/Karachi" },
  { name: "Dubai", region: "UAE", lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai" },
  { name: "Singapore", region: "Singapore", lat: 1.3521, lon: 103.8198, tz: "Asia/Singapore" },
  { name: "Bangkok", region: "Thailand", lat: 13.7563, lon: 100.5018, tz: "Asia/Bangkok" },
  { name: "Hong Kong", region: "China", lat: 22.3193, lon: 114.1694, tz: "Asia/Hong_Kong" },
  { name: "Tokyo", region: "Japan", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
  { name: "London", region: "UK", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { name: "Paris", region: "France", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
  { name: "Berlin", region: "Germany", lat: 52.52, lon: 13.405, tz: "Europe/Berlin" },
  { name: "Rome", region: "Italy", lat: 41.9028, lon: 12.4964, tz: "Europe/Rome" },
  { name: "Madrid", region: "Spain", lat: 40.4168, lon: -3.7038, tz: "Europe/Madrid" },
  { name: "Zurich", region: "Switzerland", lat: 47.3769, lon: 8.5417, tz: "Europe/Zurich" },
  { name: "Moscow", region: "Russia", lat: 55.7558, lon: 37.6173, tz: "Europe/Moscow" },
  { name: "Istanbul", region: "Türkiye", lat: 41.0082, lon: 28.9784, tz: "Europe/Istanbul" },
  { name: "Cairo", region: "Egypt", lat: 30.0444, lon: 31.2357, tz: "Africa/Cairo" },
  { name: "Nairobi", region: "Kenya", lat: -1.2921, lon: 36.8219, tz: "Africa/Nairobi" },
  { name: "Johannesburg", region: "South Africa", lat: -26.2041, lon: 28.0473, tz: "Africa/Johannesburg" },
  { name: "New York", region: "USA", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
  { name: "Washington", region: "USA", lat: 38.9072, lon: -77.0369, tz: "America/New_York" },
  { name: "Chicago", region: "USA", lat: 41.8781, lon: -87.6298, tz: "America/Chicago" },
  { name: "Houston", region: "USA", lat: 29.7604, lon: -95.3698, tz: "America/Chicago" },
  { name: "Denver", region: "USA", lat: 39.7392, lon: -104.9903, tz: "America/Denver" },
  { name: "Los Angeles", region: "USA", lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles" },
  { name: "San Francisco", region: "USA", lat: 37.7749, lon: -122.4194, tz: "America/Los_Angeles" },
  { name: "Seattle", region: "USA", lat: 47.6062, lon: -122.3321, tz: "America/Los_Angeles" },
  { name: "Toronto", region: "Canada", lat: 43.6532, lon: -79.3832, tz: "America/Toronto" },
  { name: "Vancouver", region: "Canada", lat: 49.2827, lon: -123.1207, tz: "America/Vancouver" },
  { name: "Mexico City", region: "Mexico", lat: 19.4326, lon: -99.1332, tz: "America/Mexico_City" },
  { name: "São Paulo", region: "Brazil", lat: -23.5558, lon: -46.6396, tz: "America/Sao_Paulo" },
  { name: "Buenos Aires", region: "Argentina", lat: -34.6037, lon: -58.3816, tz: "America/Argentina/Buenos_Aires" },
  { name: "Sydney", region: "Australia", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
  { name: "Melbourne", region: "Australia", lat: -37.8136, lon: 144.9631, tz: "Australia/Melbourne" },
  { name: "Auckland", region: "New Zealand", lat: -36.8509, lon: 174.7645, tz: "Pacific/Auckland" },
  { name: "Honolulu", region: "USA", lat: 21.3069, lon: -157.8583, tz: "Pacific/Honolulu" },
];

export function guessCity(timeZone: string): City {
  const exact = CITIES.find((city) => city.tz === timeZone);
  if (exact) return exact;
  const prefix = timeZone.split("/")[0] ?? "";
  const regional = CITIES.find((city) => city.tz.startsWith(prefix));
  return regional ?? CITIES[0]!;
}

export function searchCities(query: string): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, 8);
  return CITIES.filter((city) =>
    `${city.name} ${city.region} ${city.tz}`.toLowerCase().includes(q),
  ).slice(0, 12);
}
