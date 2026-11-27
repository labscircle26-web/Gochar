# Gochar Android app

This Android project creates an installable APK named `Gochar.apk`.

- Package ID: `in.gochar.app`
- Display name: `Gochar`
- The app opens the live Gochar web app at `https://gochar-three.vercel.app/`.
- An internet connection is required for live transit calculations and account/server features.
- Personal Transit Alerts are calculated on the device from locally saved birth charts. Android schedules local reminders one day before and at the event time, including when Gochar is closed. Pending reminders are restored after a device restart.
- Notifications require the user to grant Android's notification permission. The app does not send birth details to a push-notification provider.
- The GitHub Actions build signs the debug APK with the standard Android debug key. This is suitable for direct installation/testing, not a Play Store production release.

The workflow copies the app's current logo from `public/gochar-icon-192.png` into the Android launcher resources during the build.
