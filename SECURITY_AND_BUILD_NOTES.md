# Security and build notes

## Environment variables

- The real `.env` file is intentionally not included in this archive. Copy `.env.example` to `.env` on your own computer and fill in the values locally.
- Never commit `.env`, signing keys, service-account files, or private API credentials. `.gitignore` now excludes `.env*` while allowing `.env.example`.
- Values prefixed with `EXPO_PUBLIC_` are embedded into the client app and must be treated as public. Do not put backend secrets in them.
- The API base URL and Google web client ID in `eas.json` are public client configuration, not server-side secrets. Keep private server credentials only on the backend.

## Checks and release

Run these from the project folder after installing dependencies:

```powershell
npm ci
npm run typecheck
npm run lint
npx expo-doctor
```

The supplied terminal log showed TypeScript typechecking passing, but ESLint reported 131 errors and 4 warnings. Most reports came from the React Hooks compiler lint rules (`react-hooks/refs`, `react-hooks/set-state-in-effect`, and `react-hooks/preserve-manual-memoization`). Those require source-level review; they have not been hidden or disabled in this cleanup archive. Re-run lint after addressing them.

The supplied install log also reported 16 high-severity npm audit findings. Review the current dependency tree with `npm audit` and apply compatible fixes deliberately; do not use `npm audit fix --force` without reviewing breaking upgrades.

For Android production distribution, build with the EAS production profile configured in `eas.json`:

```powershell
npx eas-cli@latest build --platform android --profile production
```

The production profile is configured to produce an Android App Bundle (AAB). Test the resulting build on a real device or emulator before Play Store submission.
