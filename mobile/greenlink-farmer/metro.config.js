// metro.config.js - Expo SDK 53 compatible configuration
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports to avoid ESM resolution errors
config.resolver.unstable_enablePackageExports = false;

// Ensure sourceExts includes all necessary extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config;
