// The web build can live under a sub-path (e.g. sionmarket.com/app next to the website).
// EXPO_BASE_URL=/app sets it; native builds and local dev ignore it when unset.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
