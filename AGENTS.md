This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run the typecheck before declaring any task done (`npm run typecheck`). ESLint is configured in `eslint.config.js`; run `npx expo lint` too.

## Structure

- This app does **not** use Expo Router. `index.ts` registers `App.tsx`, which shows `LoginScreen` or `HomeScreen` depending on the session; everything else (date sheet, event sheet, search, menu) is a modal opened from `HomeScreen`.
- `src/api.ts` is read-only on purpose for hearings, cases and clients: apart from the two sign-ins, the only writes are the private note calls (`/notes`, `saveNoteOnServer` / `deleteNoteOnServer`) and the preferences call (`/app-preferences`, `savePrefsOnServer`). Do not add create/update/delete calls for anything else.
- Every request in `src/api.ts` sends `X-Client-App: calendar` so the backend login log can tell this app from the website. Keep it.
- Fonts: Source Sans 3 (text) and Playfair Display (sheet/dialog titles and sign-in, via `fontFamily: theme.display`), mapped per weight in `src/ui.tsx`. The calendar screen's month heading stays Source Sans 3 (SemiBold, never Playfair), like Google Calendar; the "Calendar" name in the menu uses the Playfair sheet-title style. Large sizes in the `font` scale carry a small negative `letterSpacing`, tiny sizes a small positive one; keep that when adding tokens. Always use `Text` / `TextInput` from `src/ui.tsx`, not the React Native ones.
- The Notepad (`src/NotesContext.tsx`, `src/components/NotepadSheet.tsx`) keeps its working copy on the phone and syncs it to the backend (`src/notesSync.ts`, `/api/notes`, private to the signed-in account; newest `updatedAt` wins; a deleted note stays as a `deleted: true` marker until the server has it, and the server never auto-deletes anything). The phone copy: notes are saved in pieces in two alternating slots (`internyay_notes_<userId>_a_*` / `_b_*`, switched by `_slot`, so a save never damages the stored notes) in `src/storage.ts` (secure-store values are limited to about 2 KB). Handwriting (`Note.ink`, drawn by `src/components/InkPad.tsx` with `react-native-svg`) is one compact string kept inside the note: strokes joined by `|`, each `colourIndex:x,y dx,dy ...` on a fixed 1000x800 page (`src/ink.ts`, capped at `INK_MAX` characters so saving stays quick); colour is stored as an index so it follows the light/dark theme. The Type / Write switch is offered on every screen size (the ink page sizes itself to the screen in `InkPad.tsx`). "Add note" on a hearing opens a new note directly (`startNew` through `openCaseNotes` in `HomeScreen`); `Notes (n)` opens the case's list. Cause list numbers are cached per date in `src/listNo.ts`.
- Preferences (`src/prefs.ts`, `src/SettingsContext.tsx`): court colours, court filter and view settings are one `Prefs` object per account (`internyay_prefs_<userId>` through `src/localStore.ts`), synced with `/app-preferences`; newest `updatedAt` wins. The old single-device keys are only read once by `legacyPrefs()` to migrate a phone.
- Offline copy (`src/offlineCache.ts`): the last successful load (cases, hearings, applications, holidays, no-hearing dates, courts, judge leaves) is saved per account by `useHearingData` and removed on sign-out. A part that failed to load keeps its saved copy. `src/localStore.ts` cuts big values into pieces (`:meta` is written last, so an interrupted save keeps the old copy).
- Requests (`src/api.ts`) time out after 30 s and report status `0` ("cannot reach InterNyay"); callers treat `0` as offline.
- Fixed-width text (CNR numbers) uses `fontFamily: theme.mono`, never a literal family; italics are not used (the fonts have no italic files).
- Text sizes come only from the `font` scale in `src/theme.ts` (`...font.body` in a style); never write a bare `fontSize` + `lineHeight` pair in a component.
- Misc. applications (`GET /misc-applications`, loaded in `src/useHearingData.ts`) are merged into the same entry list as the hearings by `buildEntries` in `src/hearings.ts`: one `HearingEntry` with `kind: 'misc'` per date an application was listed for. Keep `kind` checks in the cards and sheets: an application has no cause list number, and its title is `applicationType`, not the case title. Each misc entry also carries the details the website's application window shows (next date, hearing history with notes, document names, case status); the sheet and card render them read-only, documents are opened on the website. Hearings and applications are both shown as the website's two-column detail table (`hearingFields` / `applicationFields` in `src/hearings.ts`, drawn by `DetailTable`) with a collapsible `HistoryPanel`; a case's hearing history is built from its `/hearings` rows in `buildEntries`. A 403 / 404 from that request means "none" (plan without Documents, or older server); any other failure sets `notice` so a missing court date is never silent. Old case-history rows that only hold `Misc. Application: <name>` lines are dropped (`isMiscOnlyRow`), the same rule as `MiscHearings.java` on the server and `isMiscOnlyHearing` on the website.
- Shared hooks for swipe and slide-in animation live in `src/motion.ts`; the "Judge on leave" sentence is built in `src/leave.ts`.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
