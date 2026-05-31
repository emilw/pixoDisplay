# Pixel Frame - Divoom Pixoo Controller

A Node.js project to control Divoom Pixoo pixel displays.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create local environment config:
```bash
cp .env.example .env
```

3. Update `.env` with your own values:
```env
PIXOO_IP=192.168.10.139
CALENDAR_FEEDS=webcal://example.com/private-feed,https://api.dagsmart.se/ical/holidays
```

## Run

Start calendar mode:
```bash
npm start
```

Run hello-world test mode:
```bash
node index.js --test-mode
```

## Docker

Build image:
```bash
docker build -t pixoo-calendar .
```

Run with env file:
```bash
docker run --rm --env-file .env pixoo-calendar
```

Or pass variables directly:
```bash
docker run --rm \
  -e PIXOO_IP=192.168.10.139 \
  -e CALENDAR_FEEDS="webcal://example.com/private-feed,https://api.dagsmart.se/ical/holidays" \
  pixoo-calendar
```

Notes for Docker networking:
- The container must be able to reach your Pixoo on the local network.
- On Linux, `--network host` is often the simplest option.
- On Docker Desktop (Windows/macOS), ensure your LAN allows container-to-device access.

## Configuration

- `PIXOO_IP`: Pixoo device IP address
- `CALENDAR_FEEDS`: Comma, semicolon, or newline-separated feed URLs
- CLI IP still works and overrides `PIXOO_IP`:
```bash
node index.js 192.168.10.139
```

## API Reference

### DivoomPixoo Class

#### Methods

- `clearScreen()` - Clear the display
- `drawText(text, x, y, color, fontSize)` - Draw text on screen
  - `text`: String to display
  - `x`, `y`: Position (0-63)
  - `color`: RGB array `[r, g, b]` (0-255)
  - `fontSize`: Font size (default: 16)
- `drawPixel(x, y, color)` - Draw a single pixel
- `fillScreen(color)` - Fill entire screen with color
- `setBrightness(brightness)` - Set brightness (0-100)
- `sendAnimation(frames)` - Send animation frames

## Examples

### Display colored text
```javascript
const pixoo = new DivoomPixoo('192.168.1.100');
await pixoo.drawText('Hello!', 5, 20, [255, 0, 0]); // Red text
```

### Clear and redraw
```javascript
await pixoo.clearScreen();
await pixoo.drawText('New Text', 0, 12, [0, 255, 0]); // Green text
```

### Set brightness
```javascript
await pixoo.setBrightness(50); // 50% brightness
```

## Notes

- The Pixoo display is 64x64 pixels
- Coordinates range from (0,0) to (63,63)
- Colors are RGB values from 0-255
- The device must be on the same network as your computer
- Keep private feed URLs only in local `.env`, never in committed source files
