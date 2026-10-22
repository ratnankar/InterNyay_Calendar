# InterNyay Calendar (mobile)

A small Expo / React Native app that shows an advocate's hearing calendar from the InterNyay backend.

## What it does
Looks and works like Google Calendar.
- Sign in with your InterNyay email and password, or **Continue with Google** (advocate or associate; asks which one only if the email has both).
- **Month calendar**: swipe left/right to move forward or back a month (the month follows your finger and slides in and out; animations are skipped when the phone's reduce-motion setting is on); on wider screens use the arrows. Above the calendar, a bar shows January to December of the year on screen: tap a month to jump to it, use its arrows to change the year, and a dot marks months that have hearings.
- **Miscellaneous applications** (bail and other applications filed in a case) show on every date they are listed for, next to the case's own hearings.
  An application has its own title, status (Pending, or Disposed Off - Allowed / Disallowed), filing date and a note for each hearing; in a month cell it is a court-coloured bar with a dark marker on its left edge
  (wide cells also name the application), in the date list it is a card tagged **Misc. application** (it says which case it is filed in), and the date heading counts them apart
  ("3 hearings · 1 application"). Dates it was listed for earlier show as **Heard**. Applications have no cause list number.
  They need the **Documents** feature of the plan: on a plan without it the server refuses the request and the calendar simply shows no applications; any other failure shows a notice with **Try again**.
- **Item number**: when the server has a cause list number for a hearing, the month cell shows it before the case title (`12. Title`), the "Your cases" lines in the Judges on leave lists add `(Item 12)`, and the hearing card, hearing screen and search keep showing it as the list no. The numbers are fetched per hearing date of the month on screen (`GET /cases/hearing-leave?date`) and cached; hearings without one stay as before.
- **Judge on leave**: a hearing whose judge is on leave gets a red-ringed dot in the month cell. The date window shows the leave notice on that case's hearing only. Both the month and the day have a **Judges on leave** bar at the bottom: swipe up on the calendar (or drag / tap the bar) for the month on screen, split into one section per day, with a strip of day chips (a red dot marks days with a judge on leave) and a **Search** box (judge name, court, district or reason, never a date; while searching it lists the matches for the whole month). The month heading opens a month and year picker, the arrows change month, **Today** (icon) jumps back to today, and **Archive** lists past leave by month with its own search; inside a date window drag / tap its own bar for that day only (it has the same search box), which changes as you step to another day with the arrows. The court chips (All, or one or more courts) narrow the list. Cases of yours affected by a leave are named under the judge.
- Sundays are highlighted in amber (date numbers, weekday names, and a light tint on month cells).
- On wide screens the side menu keeps a small date picker with a dot on days that have hearings.
- **Search** (🔍): find hearings and applications by case title, case no., client, opposite party, court, judge, CNR or file no., or by application type / status ("bail", "disposed").
- Tap a hearing to open it full screen (court, judge, cause list no., client, opposite party, outcome, notes, judge-on-leave notice).
  Tap a date (month cell) to see every hearing that day: the selected court's cases first, then other courts'.
- **Courts** in the menu work like Google Calendar's "My calendars": tapping a court while all courts are shown selects only that court and unticks the others, tap more courts to add them, "All courts" resets;
  chips under the title show the selection, tap a chip to remove it, and the palette icon picks a court's colour from 24 colours (saved to the account).
  The menu also lists every court from the server's court table and the court holiday colours (District, High, Both).
- **List no.**: every hearing shows its cause list number (date list, hearing screen, search results), looked up once per date and remembered for the session; Refresh clears it.
- **Notepad** (menu, first item under the Calendar title): private notes, one set per signed-in account (an associate and an advocate do not see each other's notes). They are kept on the phone and also saved to the InterNyay server (`/api/notes`), so they come back after a new phone or a reinstall. Notes open and save at once, also offline; they are sent a few seconds after you stop typing, and when the app opens or returns to the front. If two phones edit the same note, the newest edit wins. Deleting a note on one phone deletes it everywhere. Tapping **Add note** on a hearing card (or **Notes for this case** in an open hearing, when the case has no notes yet) opens a new note linked to that case straight away; once the case has notes, **Notes (n)** opens that case's list. On every screen size a **Type / Write** switch lets you write by hand on a ruled page with a pen in three colours, an eraser (removes whole strokes), undo and clear; the page holds a limited amount of writing and says so when it is full. Notes can be pinned to the top, searched (once there are more than three), shared or copied, and unlinked from a case. They are saved as you type and when the app goes to the background. Empty notes are dropped, deleting asks first.
- **Preferences and offline use**: the colour of each court, the court filter and the view settings (week start, holidays, no-hearing dates, appearance) belong to the signed-in account. They are kept on the phone and saved to the InterNyay server (`GET/PUT /api/app-preferences`), so they follow the account to a new phone; the newest change wins. The last loaded hearings (cases, hearings, misc. applications, holidays, no-hearing dates, courts, judges on leave) are also saved on the phone for that account: the calendar shows them at once on opening, refreshes in the background, and keeps showing them with a notice when there is no internet. Signing out removes the saved hearings from the phone.
- **Settings** is the last item in the menu: theme, week starts on Sunday or Monday, hide court holidays or "no hearing" dates. They belong to the signed-in account (kept on the phone and saved to the server, see Preferences above).
- Refresh is the button at the top of the menu (or pull down); Sign out is in the account menu (profile picture).
- Tablet / desktop width (900 px and up) keeps the menu open on the left, with the date picker and the courts in it.

## Responsive layout
One hook (`src/layout.ts`) decides the layout for every screen:

| Width | Layout |
| --- | --- |
| under 600 px (phone) | Menu in a drawer, month bar scrolls sideways, swipe to move |
| 600 - 899 px | Previous / next arrows; **Today** is a labelled button from 720 px (an icon below that); menu still a drawer |
| 900 px and up | Menu stays open on the left with the date picker (search becomes a box in the top bar from 1180 px) |
| 1280 px and up | Wider menu. Month cells that are about 104 px wide or more (large windows) name a misc. application before its case title |

- Month cells adapt to their own width: first party only on narrow phones, full weekday names on wide cells.
- Hearing details and the date list open as a **centred dialog** on tablets and desktop windows, and as a full-screen sheet on phones.
- Sign-in splits into a brand panel and the form on wide screens.
- Text on every court colour is chosen for contrast (white on dark colours, near-black on light ones).
- Phone and tablet rotation is allowed.

## Fonts and look
Same type pairing as the InterNyay website: **Source Sans 3** for text, buttons and fields, **Playfair Display** for titles of sheets and
dialogs, the event title and the sign-in screen. The calendar screen follows Google Calendar: the month heading is Source Sans 3 SemiBold at 22 px (tracked -0.2),
while the "Calendar" name in the menu uses the same Playfair Display style as the sheet titles. Both fonts are loaded in `App.tsx`; `src/ui.tsx` maps every text weight to the right font file,
so use its `Text` / `TextInput` and set `fontFamily: theme.display` on a style to get a title.
When an account has no profile photo (or it fails to load), the avatar shows the same person symbol as the website.

Wide screens (900 px and up) are laid out like Google Calendar: a light blue-grey page, the menu on it with no divider, and the calendar as
a rounded white card. The top bar is 64 px high (Today, arrows, month heading, search, settings, account). **Courts** and **Court holidays** fold away with their arrow.
Month cells show `SUN`, `MON` ... in small capitals, and hearings are 22 px bars with bold text (wide cells only). Sundays keep their amber tint.

## Type scale
Every text style takes its size and line height from `font` in `src/theme.ts` (`...font.small`, `...font.title` ...), so the same kind of text is the same size everywhere.
Weights: 400 reading text, 500 labels and controls, 600 emphasis, 700 names, titles and buttons. List numbers, counts and the date numbers in the month grids use tabular figures so they line up.
Do not write a bare `fontSize` / `lineHeight` in a component; add a token if a new size is really needed. (Text fields keep a plain 16 px so iOS does not zoom into them.)

## Dark mode
**Settings > Appearance > Theme**: System (follows the phone or browser, the default), Light or Dark. It switches instantly and is saved with your other preferences (on the phone and on your account).
- Colours live in `src/theme.ts` as two palettes (`light`, `dark`). Components never hard-code colours: they build their styles with
  `makeStyles(() => StyleSheet.create({ ... }))` and call `const s = useS()` in the component, so a theme change re-styles everything.
- Court colours stay the same in both themes; the text on them is picked for contrast.
- To adjust dark colours, edit the `dark` palette in `src/theme.ts` only.

## Keyboard shortcuts (browser)
`T` today, `←` / `→` (or `K` / `J`, `P` / `N`) previous / next, `/` search. They are listed in Settings too.

## Preview the design without a server
```bash
EXPO_PUBLIC_DEMO=1 npm run web      # sample hearings, no sign-in, nothing is sent anywhere
```
In PowerShell use `$env:EXPO_PUBLIC_DEMO=1; npm run web`, or put `EXPO_PUBLIC_DEMO=1` in `.env`.

## Run it
```bash
npm install
npx expo start          # scan the QR code with Expo Go (Android / iOS)
npm run check           # TypeScript check + lint (run before every build)
```
Backend address: set `EXPO_PUBLIC_API_BASE_URL` in the `.env` file (default `https://api.internyay.publicvm.com/api`).
After changing it, restart with `npx expo start -c` (the `-c` clears the cache).

## Google sign-in (needs a development build)
Google sign-in uses native code, so it does not run in Expo Go or the browser (the button is hidden there).
1. `npx expo install @react-native-google-signin/google-signin expo-dev-client`
2. In Google Cloud Console create OAuth clients: **Web**, **iOS** (bundle id `com.internyay.calendar`) and **Android**
   (package `com.internyay.calendar` + your SHA-1).
3. Fill `.env`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`.
4. `npx expo prebuild --clean && npx expo run:android` (or `run:ios`), or `eas build --profile development` (the profile is in `eas.json`; install the resulting build, then run `npx expo start --dev-client`).
5. Backend: the app calls `POST /auth/google/login` with `{ idToken, accountType? }` (same as the website). The backend
   verifies the ID token, so `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` must be the same Google client ID the backend is configured with
   (`GOOGLE_CLIENT_ID`). The Google account must already be registered on the website.

## Network behaviour
Every request gives up after 30 seconds and shows the usual "Cannot reach InterNyay" message (the calendar then keeps the hearings saved on the phone), so a weak connection never leaves a spinner running for ever.
If the server answers 401 (the sign-in has ended) the app signs out once, clears the saved hearings and shows a notice on the sign-in screen.

## Test on a PC (browser)
```bash
npm install
npm run web            # opens http://localhost:3000
```
Port 3000 matters: the backend only accepts browser requests from the origins in `CORS_ALLOWED_ORIGINS`
(default `http://localhost:5173,http://localhost:3000`). If you use the live server and the browser shows
"Cannot reach InterNyay", add `http://localhost:3000` to that setting on the server. The phone app is not affected by CORS.

## Build an installable Android APK
```bash
npm i -g eas-cli && eas login
eas build -p android --profile preview      # installable APK (profile in eas.json)
eas build -p android --profile production   # app bundle for the Play Store
```
`eas.json` also has a `development` profile (development client, used for Google sign-in). Run `npm run check` first.

## How the server tells this app from the website
Every request carries the header `X-Client-App: calendar` (`src/api.ts`). The InterNyay backend stores it with each sign-in, and the
admin console shows it under **Login Activity** (App column and filter). Keep the header if you touch the request code.

## Backend endpoints used
Read only (GET): `/auth/me`, `/cases`, `/hearings?from&to`, `/cases/hearing-leave?date`, `/courts`, `/holidays`, `/no-hearing-dates`,
`/quick-access/judges-on-leave`, `/misc-applications` (paged; each application lists its own hearing dates in `hearings`, so no per-date request is needed), `/notes`, `/app-preferences`.

Sign-in (POST): `/auth/login`, `/auth/google/login`.

The only writes are the app's own private data: `PUT` / `DELETE /notes/{id}` (the Notepad) and `PUT /app-preferences` (colours, court filter, settings).
The calendar never creates, changes or deletes hearings, cases or clients. The server answers 409 to an identical save that is still running (its double-save guard); the app simply sends it again on the next round.

`GET /hearings` can still return old rows whose notes hold only `Misc. Application: <name>` lines (older versions saved an application's date into the case's history that way).
They are not hearings of the case, so `src/hearings.ts` ignores them (same rule as the website and `MiscHearings.java`) and the application itself is shown through `/misc-applications`.
