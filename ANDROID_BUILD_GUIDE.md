# building Neuro RAVE for Android

This guide explains how to build the Android application for Strudel (Neuro RAVE).
The project uses [Tauri v2](https://v2.tauri.app/) to wrap the web application into a native Android app.

## Prerequisites

1.  **Rust**: Install Rust from [rustup.rs](https://rustup.rs/).
2.  **Android Studio**: Install Android Studio and the Android SDK.
3.  **Environment Variables**: Ensure `ANDROID_HOME` and `NDK_HOME` are set in your environment.
    *   `ANDROID_HOME`: Usually `C:\Users\YourUser\AppData\Local\Android\Sdk`
    *   `NDK_HOME`: Usually inside `ANDROID_HOME\ndk\<version>`

## Setup

1.  **Install Config Migration (if needed)**:
    If `tauri.conf.json` is outdated (v1 format), run:
    ```bash
    npx tauri migrate
    ```

2.  **Initialize Android Project**:
    ```bash
    npx tauri android init
    ```
    This will generate the `src-tauri/gen/android` directory.

## Development

To run the app on a connected Android device or Emulator:

```bash
npx tauri android dev
```

## Build APK/Bundle

To build a release APK:

```bash
npx tauri android build
```

## UI Improvements

The UI has been optimized for mobile with:
*   **Premium Glassmorphism Design**: New header with blur effects and gradients.
*   **Mobile-Friendly Controls**: Larger touch targets for key actions (Play, Update).
*   **Dark Theme**: Deep zinc/black color palette.
