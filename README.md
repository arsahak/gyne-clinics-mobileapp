# Coaching Center — Mobile App

Lean **React Native + Expo + TypeScript** starter for Android & iOS.
No UI library — just React Native primitives + `StyleSheet` + a small design-token system.

---

## Stack

| Concern | Choice |
|---------|--------|
| Runtime | Expo SDK 52 (New Architecture, Hermes) |
| Routing | `expo-router` (file-based) |
| Language | TypeScript (strict) |
| Styling | `StyleSheet.create` + theme tokens |
| State (server) | Native `fetch` wrapper (`src/lib/api.ts`) |
| State (UI) | React Context (`ThemeProvider`) + local `useState` |
| Animations | `react-native-reanimated` (preinstalled) |
| Safe area | `react-native-safe-area-context` |

---

## Folder layout

```
mobile-app/
├── app/                  # expo-router screens
│   ├── _layout.tsx       # root navigator + providers
│   ├── index.tsx         # home screen
│   └── +not-found.tsx
├── src/
│   ├── components/       # Screen, Text, Button, Card
│   ├── theme/            # colors, spacing, typography, ThemeContext
│   ├── lib/              # api.ts (fetch wrapper)
│   └── constants/        # config.ts (env, app version)
├── assets/               # icon, splash (add your own)
├── app.json
├── babel.config.js
├── metro.config.js
├── tsconfig.json
└── package.json
```

Import alias `@/*` → `src/*`.

---

## Getting started

```bash
cd mobile-app
npm install
npx expo install --check
npm start
```

Then press:
- `a` — Android emulator
- `i` — iOS simulator (macOS)
- Scan the QR with **Expo Go** for a real device

### Environment

Copy `.env.example` to `.env` and set:
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000   # Android emulator → host
# or
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000  # real device → your LAN IP
```

> `EXPO_PUBLIC_*` vars are inlined at build time and available via `process.env`.

---

## Native builds

```bash
npx expo prebuild --clean    # generates /android and /ios
npx expo run:android         # local Android build
npx expo run:ios             # local iOS build (Mac only)
```

For production binaries use **EAS Build**:
```bash
npm i -g eas-cli
eas build --platform android
eas build --platform ios
```

---

## Performance notes

- New Architecture (`newArchEnabled: true`) and Hermes are on.
- `Text`, `Button` are wrapped in `React.memo`.
- Always use `StyleSheet.create({ ... })` (cached, sent as ID, no re-allocations).
- Prefer `FlatList` (with `keyExtractor`, `getItemLayout`) over `ScrollView` for long lists.
- Avoid inline functions/objects in props inside list rows.
- Use `Pressable` (not `TouchableOpacity`) — it's the modern primitive.

---

## Adding a screen

Create a file under `app/`:

```tsx
// app/dashboard.tsx
import { Screen, Text } from "@/components";

export default function Dashboard() {
  return (
    <Screen>
      <Text variant="h2">Dashboard</Text>
    </Screen>
  );
}
```

Navigate with:

```tsx
import { router } from "expo-router";
router.push("/dashboard");
```

---

## Adding API calls

```ts
import { api } from "@/lib/api";

const result = await api<{ data: Inquiry[] }>("/api/inquiry", { token });
if (result.ok) {
  console.log(result.data);
} else {
  console.warn(result.message);
}
```
