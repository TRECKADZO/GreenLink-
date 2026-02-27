// metro.config.js - Expo SDK 53 compatible configuration
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports to avoid ESM resolution errors
// This fixes issues with packages that use Node built-ins (stream, events, util, ws, etc.)
config.resolver.unstable_enablePackageExports = false;

// Ensure sourceExts includes all necessary extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Block problematic Node.js built-in modules that shouldn't be bundled
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // List of Node.js built-ins that should be blocked/polyfilled
  const nodeBuiltins = [
    'stream',
    'events', 
    'util',
    'ws',
    'crypto',
    'buffer',
    'http',
    'https',
    'net',
    'tls',
    'fs',
    'path',
    'os',
    'zlib',
  ];

  // If it's a direct Node built-in import, return empty module
  if (nodeBuiltins.includes(moduleName)) {
    return {
      type: 'empty',
    };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
