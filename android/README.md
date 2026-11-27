# Gochar Android app

This Android project creates an installable APK named `Gochar.apk`.

- Package ID: `in.gochar.app`
- Display name: `Gochar`
- The app opens the live Gochar web app at `https://gochar-three.vercel.app/`.
- An internet connection is required. The hosted Gochar site remains the source of live transit data and server features.
- The GitHub Actions build signs the debug APK with the standard Android debug key. This is suitable for direct installation/testing, not a Play Store production release.

The workflow copies the app's current logo from `public/gochar-icon-192.png` into the Android launcher resources during the build.
