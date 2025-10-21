const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer'),
  process: require.resolve('process'),
  util: require.resolve('util'),
  events: require.resolve('events'),
};

module.exports = config;

module.exports = withNativeWind(config, { input: './global.css' });
