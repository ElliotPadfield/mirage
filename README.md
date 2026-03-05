# Mirage

**Spoof your iPhone's GPS location from your Mac.** Click anywhere on a map and your iPhone thinks it's there. No jailbreak required.

## Download

**[Download the latest release](../../releases/latest)** — grab the `.dmg`, drag to Applications, done.

Want automatic updates? Mirage is also available on the Mac App Store (coming soon).

## Features

- **Click to teleport** — click anywhere on the map to set your iPhone's location instantly
- **Search any place** — find addresses, cities, landmarks, or coordinates
- **Save locations** — bookmark your favourite spots for quick access
- **Works with iOS 16–18** — supports both legacy and modern iOS tunnelling
- **Native macOS app** — lightweight, fast, with system dark mode support

## Requirements

- macOS 12 or later
- iPhone connected via USB
- Administrator password (required once for iOS 17+ devices)

## How to Use

1. Open Mirage
2. Connect your iPhone via USB cable
3. Select your device from the dropdown
4. Click anywhere on the map — your iPhone's location updates immediately
5. Hit "Stop" to restore your real location

## Building from Source

Mirage is open source under GPL v3. If you'd rather build it yourself:

```bash
# Prerequisites: Node.js, pnpm, Python 3, Rust
pnpm install
pip install -r requirements.txt

# Build the app
python3 build-python-fast.py
pnpm tauri build
```

The `.app` and `.dmg` output to `src-tauri/target/release/bundle/`.

See [DEVELOPMENT.md](DEVELOPMENT.md) for the full development setup.

## Contributing

Contributions are welcome! Fork the repo, make your changes, and open a pull request.

```bash
# Run in dev mode
pnpm install
pnpm tauri dev
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development instructions.

## Tech Stack

- **App shell**: Tauri v2 (Rust)
- **Frontend**: React, Leaflet, Tailwind CSS
- **Backend**: Python, Flask, [pymobiledevice3](https://github.com/doronz88/pymobiledevice3)

## License

Mirage is free software, released under the [GNU General Public License v3.0](LICENSE).

You are free to use, modify, and redistribute this software under the terms of the GPL v3.
