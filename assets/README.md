# GyneClinics App — Assets

This folder contains all static assets for the **GyneClinics** mobile application — a healthcare platform focused on expert women's care.

---

## Brand Colors

| Name | Hex | Usage |
|---|---|---|
| Primary Pink | `#d13a8b` | Buttons, active states, highlights |
| Light Pink | `#f472b6` | Glow effects, subtle accents |
| Secondary Purple | `#834d8b` | Secondary accents, disclaimers |
| Background (Light) | `#ffffff` | Light mode background |
| Background (Dark) | `#121212` | Dark mode background |

---

## Required Asset Files

| File | Size | Purpose |
|---|---|---|
| `icon.png` | 1024×1024 | App icon (iOS & Android) |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground |
| `splash.png` | 1242×2436 | Native splash screen fallback |
| `logo/gyneclinics-logo.png` | Any | In-app logo used across screens |
| `logo/gyneclinics-logo.svg` | Any | Vector source of the logo |

---

## Folder Structure

```
assets/
├── logo/
│   ├── gyneclinics-logo.png     ← Main app logo (PNG)
│   ├── gyneclinics-logo.svg     ← Vector source
│   └── gyneclinics-logo.webp    ← WebP variant
├── icon.png                     ← App icon
├── adaptive-icon.png            ← Android adaptive icon
├── splash.png                   ← Splash screen image
└── README.md                    ← This file
```

---

## About GyneClinics

**GyneClinics** is a healthcare mobile application designed to support women's health and wellness. Key features include:

- **Period Tracker** — Calendar-based cycle tracking with dot indicators
- **Find a Specialist** — Search and connect with gynaecology specialists
- **Learn** — Curated articles and featured health stories
- **Chat** — Secure messaging with healthcare providers
- **Health Profile** — Personal health setup including cycle and condition data
- **Authentication** — Phone-based OTP login with secure session management

---

## Notes

- All assets should use the brand's primary pink palette
- Icons are implemented as custom SVG components via `react-native-svg`
- The animated splash screen is handled by `AppSplashScreen.tsx` — the native `splash.png` is only used as a brief fallback before the JS bundle loads
