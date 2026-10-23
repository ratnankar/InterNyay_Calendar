# Release guide: InterNyay Calendar (Android, with Google login)

Already done in this project
- App icon, adaptive icon (Android), monochrome icon, favicon and splash image generated from `assets/logo.png` (gold scales on navy #0A1628).
- App name `InterNyay Calendar`, package `com.internyay.calendar`.
- `eas.json`: `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` are set for every build profile.
  (`.env` is gitignored, so EAS cloud builds never saw it. Without this, the built app has no Google button.) They live once, in the `base` profile that the others extend.
- Google web client ID in the app equals `GOOGLE_CLIENT_ID` on the backend. Keep them identical.

## 1. Install and check (on your PC)
    npm install
    npx expo install expo-splash-screen      # optional: custom splash, then add to app.json plugins:
    #   ["expo-splash-screen", {"backgroundColor":"#0A1628","image":"./assets/splash-icon.png","imageWidth":200}]
    npm run check

## 2. Build once to get the signing fingerprint
    npm i -g eas-cli && eas login
    eas build -p android --profile preview
Then get the SHA-1 of the signing key:
    eas credentials -p android        # Keystore -> shows SHA1 Fingerprint

## 3. Google Cloud Console (project that owns the web client ID 905072813135-...)
1. APIs & Services -> OAuth consent screen: set App name "InterNyay Calendar", upload the logo
   (assets/logo.png), support email, and click **Publish app** (otherwise only test users can sign in).
2. Credentials -> Create credentials -> OAuth client ID -> **Android**:
   package name `com.internyay.calendar`, SHA-1 from step 2.
3. If you publish on Google Play: Play Console -> App integrity -> App signing -> copy the
   **App signing key SHA-1** and add a SECOND Android OAuth client with it (Play re-signs the app).
4. Do NOT put the Android client ID in the app. Only the Web client ID is used, and it stays as is.

## 4. Backend (AWS)
- `GOOGLE_CLIENT_ID` = the Web client ID above (already matches).
- Behind nginx/ALB: set `FORWARD_HEADERS_STRATEGY=native` so rate limits see real user IPs.
- The mobile app is not affected by CORS. Only add your website origin to `CORS_ALLOWED_ORIGINS`.
- The Google account must already be registered on InterNyay (as the README says).

## 5. Test, then ship
    eas build -p android --profile preview       # APK: install, tap "Continue with Google"
    eas build -p android --profile production    # .aab for Play Store
    eas submit -p android --profile production

If Google login shows "DEVELOPER_ERROR" the SHA-1 or package name in the Android OAuth client is wrong.
If the button is missing, the build did not get EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (check eas.json).
