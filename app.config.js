// Extends app.json. The Google Sign-In native plugin is only added when EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is set,
// so the app still starts in Expo Go / the browser (without the Google button) until Google is configured.
module.exports = ({ config }) => {
  const plugins = [...(config.plugins || [])]
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
  if (iosUrlScheme) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }])
  return { ...config, plugins }
}
