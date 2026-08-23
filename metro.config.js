// Expo SDK 54 default Metro config.
// Keep this minimal — Expo already enables package exports and tsconfig paths.
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
