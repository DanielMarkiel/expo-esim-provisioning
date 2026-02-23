# Recording Demo GIFs

## What to show in the demos

### iOS Demo (`demo-ios.gif`)

**Duration:** ~10-15 seconds  
**Recommended size:** 300-400px width, 15 fps

**Flow to demonstrate:**

1. App opens with "expo-esim-provisioning Demo" header
2. Device support card shows: ✅ "eSIM supported" with iOS version
3. Fill in test data:
   - SM-DP+ Address: `test.example.com`
   - Activation Code: `DEMO-CODE-123`
4. Tap "Install eSIM" button
5. Loading indicator appears
6. iOS native eSIM modal opens with "Invalid Activation Code" error
7. Return to app
8. Error state displays with red badge: `INSTALL_FAILED`

**Text overlay to add (optional):**

- Start: "Demo with test data - shows error handling ⚠️"

---

### Android Demo (`demo-android.gif`)

**Duration:** ~10-15 seconds  
**Recommended size:** 300-400px width, 15 fps

**Flow to demonstrate:**

1. App opens with "expo-esim-provisioning Demo" header
2. Device support card shows: ✅ "eSIM supported" with EuiccManager status
3. Fill in test data:
   - SM-DP+ Address: `test.example.com`
   - Activation Code: `DEMO-CODE-123`
4. Tap "Install eSIM" button
5. Loading indicator appears
6. Android system eSIM dialog/activity opens
7. Shows error (activation code invalid)
8. Return to app
9. Error state displays with red badge: `INSTALL_FAILED`

**Text overlay to add (optional):**

- Start: "Demo with test data - shows error handling ⚠️"

---

## Recording Tools

### Recommended (easiest)

- **Kap** (macOS): `brew install --cask kap`
  - Records directly to GIF with optimization
  - Built-in editing and trimming
- **Licecap** (cross-platform): `brew install --cask licecap`
  - Simple and lightweight
  - Records region of screen

### iOS Simulator

```bash
# Record video
xcrun simctl io booted recordVideo --codec=h264 demo-ios.mov

# Stop with Ctrl+C, then convert:
ffmpeg -i demo-ios.mov -vf "fps=15,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 demo-ios.gif
```

### Android Device/Emulator

```bash
# Option 1: Record with time limit (recommended for demos)
# Records for 15 seconds then stops automatically
adb shell screenrecord --time-limit 15 /sdcard/demo.mp4

# Option 2: Manual recording (stop with Ctrl+C)
# Note: You need to start demo BEFORE running this command
adb shell screenrecord /sdcard/demo.mp4 &
# Perform your demo actions, then:
# pkill -INT screenrecord  # or just wait for default 180s timeout

# Option 3: Using Android Studio
# View → Tool Windows → Running Devices → Click Record button

# Pull the file from device
adb pull /sdcard/demo.mp4 demo-android.mp4

# Optional: cleanup
adb shell rm /sdcard/demo.mp4

# Convert to GIF
ffmpeg -i demo-android.mp4 -vf "fps=15,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 demo-android.gif
```

---

## Optimization

Keep file size under 5MB for GitHub:

```bash
# Optimize existing GIF
ffmpeg -i demo-ios.gif -vf "fps=12,scale=300:-1:flags=lanczos" demo-ios-optimized.gif

# Or use online tool
# https://ezgif.com/optimize
```

---

## Alternative: Side-by-side comparison

Record both and create a combined GIF showing iOS and Android simultaneously:

```bash
ffmpeg -i demo-ios.gif -i demo-android.gif -filter_complex hstack demo-combined.gif
```
