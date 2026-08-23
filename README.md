# GyneClinics — Mobile App

Expert Women's Healthcare platform built with **React Native + Expo + TypeScript**.
No UI library — just React Native primitives + `StyleSheet` + a small design-token system.

---

## Stack

| Concern | Choice |
|---------|--------|
| Runtime | Expo SDK 54 (New Architecture, Hermes) |
| Routing | `expo-router` (file-based) |
| Language | TypeScript (strict) |
| Styling | `StyleSheet.create` + theme tokens |
| State (auth) | React Context (`AuthContext`) + `AsyncStorage` |
| State (theme) | React Context (`ThemeContext`) — light/dark/system |
| Animations | `react-native` Animated API |
| Safe area | `react-native-safe-area-context` |
| SVG Icons | `react-native-svg` (custom components) |
| Gradients | `expo-linear-gradient` |
| Date Picker | `@react-native-community/datetimepicker` |

---

## Features

- **Splash Screen** — Animated branded splash with logo, progress bar and footer
- **Authentication** — Phone number + OTP login (test code: `123456`)
- **Health Profile Setup** — 3-step onboarding (Personal, Cycle, Conditions)
- **Period Tracker** — Home dashboard with interactive cycle calendar
- **Learn** — Featured stories and articles with filter pills
- **Find a Specialist** — Doctor search with filters and chat cards
- **Chat** — Messaging screen with healthcare providers
- **Settings** — Theme toggle (light/dark/system), account management, sign out
- **Dark Mode** — Full dark mode support across all screens

---

## Brand Colors

| Name | Hex |
|---|---|
| Primary Pink | `#d13a8b` |
| Secondary Purple | `#834d8b` |
| Teal (supporting) | `#217580` |

---

## Folder layout

```
mobile-app/
├── app/                        # expo-router screens
│   ├── _layout.tsx             # root navigator + providers
│   ├── index.tsx               # auth routing entry point
│   ├── login.tsx               # phone number login
│   ├── verify-otp.tsx          # OTP verification
│   ├── health-profile.tsx      # onboarding health setup
│   └── (tabs)/
│       ├── index.tsx           # Period Tracker Dashboard
│       ├── learn.tsx           # Articles & stories
│       ├── help.tsx            # Find a Specialist
│       ├── chat.tsx            # Chat screen
│       └── settings.tsx        # App settings
├── src/
│   ├── components/             # NavIcon, BottomNavBar, AppSplashScreen
│   ├── store/                  # AuthContext.tsx
│   └── theme/                  # colors.ts, ThemeContext.tsx
├── assets/
│   └── logo/                   # gyneclinics-logo.png / .svg
├── app.json
└── package.json
```

Import alias `@/*` → `src/*`.

---

## Getting Started

```bash
cd mobile-app
npm install
npx expo start
```

Then:
- Scan the **QR code** with **Expo Go** app on your iPhone/Android
- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS only)

### Test Credentials
```
Any phone number (min 7 digits)
OTP code: 123456
```

---

## Native Builds (EAS)

```bash
npm i -g eas-cli
eas login
eas build --platform android   # Free — generates APK
eas build --platform ios        # Requires Apple Developer account ($99/yr)
```

---

## Environment

Set your API URL in `.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.x:5000
```
