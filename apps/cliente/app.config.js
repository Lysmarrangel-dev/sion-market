// The web build can live under a sub-path (e.g. sionmarket.com/app next to the website).
// EXPO_BASE_URL=/app sets it; native builds and local dev ignore it when unset.
// GOOGLE_MAPS_ANDROID_KEY turns on Google Maps in Android builds; without it they use OpenStreetMap.
const mapsKey = process.env.GOOGLE_MAPS_ANDROID_KEY;

module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, ...(mapsKey ? { config: { googleMaps: { apiKey: mapsKey } } } : {}) },
  extra: { ...config.extra, googleMapsAndroid: Boolean(mapsKey) },
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
