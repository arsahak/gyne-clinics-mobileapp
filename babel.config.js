module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Worklets plugin is required by react-native-reanimated 4 (Expo SDK 54).
    // It MUST be the LAST entry in the plugins array.
    plugins: ["react-native-worklets/plugin"],
  };
};
