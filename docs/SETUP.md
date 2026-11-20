# Setup Guide

How to set up the project on macOS and test it on the Meta Quest 3.

## 1. Requirements

- macOS with [Homebrew](https://brew.sh)
- Git (`xcode-select --install`)
- VS Code (recommended)
- Meta Quest 3 + USB-C data cable (for VR testing)

## 2. Install Node.js (via fnm)

We use **fnm** so everyone runs the same Node version (pinned in `.node-version`).

```bash
brew install fnm
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
```

When you `cd` into the project folder, fnm switches to the right Node version automatically.
If that version isn't installed yet:

```bash
fnm install
node --version
```

## 3. Clone and run

```bash
mkdir -p ~/Projects && cd ~/Projects
git clone https://github.com/<your-username>/fokus-vr-potree.git
cd fokus-vr-potree
npm install
npm start
```

Open http://localhost:1234/examples/ in the browser. The examples should load.
Stop the server with `Ctrl+C`.

## 4. Test on the Meta Quest 3 (standalone, via USB)

### One-time setup
1. Create a developer organization at https://developers.meta.com (same Meta account as the Quest).
2. Meta Horizon app (phone) → Devices → Quest 3 → Headset settings → **Developer mode: on**. Restart the headset.
3. Install adb:
   ```bash
   brew install --cask android-platform-tools
   ```
4. Connect the Quest with a USB-C **data** cable, put the headset on, and accept
   **"Allow USB debugging" → Always allow from this computer**.
5. Check the connection:
   ```bash
   adb devices      # must show: <serial>   device
   ```
   If it shows `unauthorized`, install the **Meta Quest Developer Hub** and reconnect.

### Every session
```bash
npm start                          # terminal 1
adb reverse tcp:1234 tcp:1234      # terminal 2 (repeat after every replug)
```

In the headset: **Browser** → http://localhost:1234/examples/ → open a VR example → press the VR button.

> WebXR only works on `https://` or `localhost`. That's why we use `adb reverse` instead of the Mac's IP address.

## 5. Debugging on the Quest

In Chrome on the Mac, open `chrome://inspect/#devices` → the Quest Browser tab → **inspect**.
This gives full DevTools (console, errors, network) for the page running in the headset.

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `adb devices` shows `unauthorized` | Put the headset on, replug, accept the prompt (also check notifications). |
| "adb server version doesn't match" | Meta Quest Developer Hub has its own adb. Quit it, or set its ADB path to `which adb`. |
| Page doesn't load on the Quest | Run `adb reverse tcp:1234 tcp:1234` again; check that `npm start` is running. |
| No VR button / WebXR error | Check the console via `chrome://inspect`. |
| `npm install` fails | Try Node 18: `fnm install 18 && fnm use 18`, then delete `node_modules` and reinstall. |

## 7. Point cloud data

The FOKUS building dataset is **not** stored in git (internal data, large files).
Get it from the team, convert it with PotreeConverter, and put the result in `pointclouds/fokus/`.