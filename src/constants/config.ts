import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const config = {
  apiUrl:
    process.env.EXPO_PUBLIC_API_URL ||
    (typeof extra.apiUrl === "string" ? extra.apiUrl : "http://localhost:5000"),
  appVersion: Constants.expoConfig?.version ?? "1.0.0",
  isProd: !__DEV__,
} as const;
