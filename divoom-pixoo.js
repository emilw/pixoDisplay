import axios from 'axios';

export class DivoomPixoo {
  constructor(ip, port = 80) {
    this.ip = ip;
    this.port = port;
    this.baseUrl = `http://${ip}:${port}/post`;
  }

  /**
   * Send a command to the Pixoo device
   */
  async sendCommand(command) {
    try {
      const response = await axios.post(this.baseUrl, command, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Pixoo at ${this.ip}:${this.port}. Check IP address and network.`);
      }
      throw new Error(`Failed to send command to Pixoo: ${error.message}`);
    }
  }

  /**
   * Send multiple drawing commands as a batch
   */
  async sendCommandList(commands) {
    const command = {
      Command: 'Draw/CommandList',
      CommandList: commands
    };
    return await this.sendCommand(command);
  }

  /**
   * Fill the entire screen with a solid color (simple method for Pixoo 64)
   */
  async fillScreenColor(r, g, b) {
    // Create 64x64 pixels, each as 3 bytes RGB
    const buffer = Buffer.alloc(64 * 64 * 3);
    for (let i = 0; i < 64 * 64; i++) {
      buffer[i * 3] = r;
      buffer[i * 3 + 1] = g;
      buffer[i * 3 + 2] = b;
    }
    
    const command = {
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: 64,
      PicOffset: 0,
      PicID: 0,
      PicSpeed: 1000,
      PicData: buffer.toString('base64')
    };
    return await this.sendCommand(command);
  }

  /**
   * Clear the screen (fill with black)
   */
  async clearScreen() {
    const command = {
      Command: 'Draw/ClearHttpGifs'
    };
    await this.sendCommand(command);
    // Reset the GIF ID after clearing
    return await this.resetGifId();
  }

  /**
   * Clear everything - both GIFs and text drawings
   */
  async clearAll() {
    // Clear all text IDs (1-20) by sending empty text
    for (let textId = 1; textId <= 20; textId++) {
      await this.sendCommand({
        Command: 'Draw/SendHttpText',
        TextId: textId,
        x: 0,
        y: 0,
        dir: 0,
        font: 0,
        TextWidth: 64,
        TextString: '',
        speed: 0,
        color: '#000000',
        align: 1
      });
    }
    
    // Clear HTTP GIFs
    await this.sendCommand({ Command: 'Draw/ClearHttpGifs' });
    // Reset GIF ID
    await this.sendCommand({ Command: 'Draw/ResetHttpGifId' });
    // Fill screen with black to ensure clean slate
    await this.fillScreenColor(0, 0, 0);
  }

  /**
   * Reset the HTTP GIF ID (needed after clearing)
   */
  async resetGifId() {
    const command = {
      Command: 'Draw/ResetHttpGifId'
    };
    return await this.sendCommand(command);
  }

  /**
   * Draw a smiley face on the screen
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {number} size - Radius of the smiley
   * @param {Array} color - RGB color array [r, g, b]
   */
  async drawSmiley(centerX, centerY, size, color) {
    // Create a 32x32 frame buffer (smaller to not overwrite everything)
    const width = 32;
    const height = 32;
    const buffer = Buffer.alloc(width * height * 3);
    
    // Calculate offset to center the 32x32 area around centerX, centerY
    const offsetX = centerX - width / 2;
    const offsetY = centerY - height / 2;
    
    // Helper to set pixel in the 32x32 buffer
    const setPixel = (x, y, r, g, b) => {
      const localX = x - offsetX;
      const localY = y - offsetY;
      if (localX >= 0 && localX < width && localY >= 0 && localY < height) {
        const index = (localY * width + localX) * 3;
        buffer[index] = r;
        buffer[index + 1] = g;
        buffer[index + 2] = b;
      }
    };
    
    // Draw circle outline (face)
    for (let angle = 0; angle < 360; angle += 2) {
      const rad = (angle * Math.PI) / 180;
      const x = Math.round(centerX + size * Math.cos(rad));
      const y = Math.round(centerY + size * Math.sin(rad));
      setPixel(x, y, color[0], color[1], color[2]);
    }
    
    // Draw eyes (two small circles)
    const eyeY = centerY - Math.floor(size / 3);
    const eyeOffset = Math.floor(size / 2.5);
    
    // Left eye
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx * dx + dy * dy <= 4) {
          setPixel(centerX - eyeOffset + dx, eyeY + dy, color[0], color[1], color[2]);
        }
      }
    }
    
    // Right eye
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx * dx + dy * dy <= 4) {
          setPixel(centerX + eyeOffset + dx, eyeY + dy, color[0], color[1], color[2]);
        }
      }
    }
    
    // Draw smile (arc)
    const smileRadius = Math.floor(size / 1.8);
    const smileY = centerY + Math.floor(size / 4);
    for (let angle = 20; angle <= 160; angle += 2) {
      const rad = (angle * Math.PI) / 180;
      const x = Math.round(centerX + smileRadius * Math.cos(rad));
      const y = Math.round(smileY + smileRadius * Math.sin(rad) / 2);
      setPixel(x, y, color[0], color[1], color[2]);
    }
    
    const command = {
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: width,
      PicOffset: Math.round(offsetY * 64 + offsetX),
      PicID: 99,
      PicSpeed: 1000,
      PicData: buffer.toString('base64')
    };
    return await this.sendCommand(command);
  }

  /**
   * Select the custom/faces channel (required for drawing)
   */
  async selectChannel(channel = 0) {
    const command = {
      Command: 'Channel/SetIndex',
      SelectIndex: channel // 0 = faces/custom, 1 = cloud, 2 = visualizer, 3 = clock
    };
    return await this.sendCommand(command);
  }

  /**
   * Get current device settings
   */
  async getSettings() {
    const command = {
      Command: 'Channel/GetAllConf'
    };
    return await this.sendCommand(command);
  }

  /**
   * Play a buzzer sound (to test if device is responding)
   */
  async playBuzzer(duration = 500) {
    const command = {
      Command: 'Device/PlayBuzzer',
      ActiveTimeInCycle: duration,
      OffTimeInCycle: 0,
      PlayTotalTime: duration
    };
    return await this.sendCommand(command);
  }

  /**
   * Select visualizer page
   */
  async selectVisualizer(index = 0) {
    const command = {
      Command: 'Channel/SetCustomPageIndex',
      CustomPageIndex: index
    };
    return await this.sendCommand(command);
  }

  /**
   * Draw text on the screen (simplified version that works reliably)
   * @param {string} text - Text to display
   * @param {number} textId - Text ID (1-20, use different IDs for multiple texts)
   * @param {number} x - X position (0-63)
   * @param {number} y - Y position (0-63)
   * @param {Array} color - RGB color array [r, g, b] (0-255)
   * @param {number} font - Font size (0-7, default 2)
   */
  async drawTextSimple(text, x, y, color = [255, 255, 255], textId = 1, font = 2) {
    const command = {
      Command: 'Draw/SendHttpText',
      TextId: textId,
      x: x,
      y: y,
      dir: 0,
      font: font,
      TextWidth: 64,
      TextString: text,
      speed: 4,
      color: `#${this.rgbToHex(color)}`,
      align: 0
    };
    return await this.sendCommand(command);
  }

  /**
   * Draw text on the screen
   * @param {string} text - Text to display
   * @param {number} x - X position (0-63)
   * @param {number} y - Y position (0-63)
   * @param {Array} color - RGB color array [r, g, b] (0-255)
   * @param {number} fontSize - Font size (default: 16)
   */
  async drawText(text, x, y, color = [255, 255, 255], fontSize = 16) {
    const command = {
      Command: 'Draw/SendHttpText',
      TextId: 1,
      x: x,
      y: y,
      dir: 0, // 0 = left to right
      font: 2, // Font style
      TextWidth: 64,
      TextString: text,
      speed: 0,
      color: `#${this.rgbToHex(color)}`,
      align: 1 // 1 = left, 2 = center, 3 = right
    };
    return await this.sendCommand(command);
  }

  /**
   * Draw a pixel at specified position
   * @param {number} x - X position (0-63)
   * @param {number} y - Y position (0-63)
   * @param {Array} color - RGB color array [r, g, b]
   */
  async drawPixel(x, y, color) {
    const command = {
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: 64,
      PicOffset: 0,
      PicID: 0,
      PicSpeed: 1000,
      PicData: this.createPixelData(x, y, color)
    };
    return await this.sendCommand(command);
  }

  /**
   * Fill screen with a solid color (optimized version)
   * @param {Array} color - RGB color array [r, g, b]
   */
  async fillScreenSimple(color) {
    // Create a much smaller payload - single pixel repeated
    const hexColor = this.rgbToHex(color);
    const pixelData = hexColor.repeat(64 * 64);
    
    const command = {
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: 64,
      PicOffset: 0,
      PicID: 0,
      PicSpeed: 1000,
      PicData: pixelData
    };
    return await this.sendCommand(command);
  }

  /**
   * Fill screen with a solid color
   * @param {Array} color - RGB color array [r, g, b]
   */
  async fillScreen(color) {
    const pixelData = new Array(64 * 64).fill(this.rgbToHex(color));
    const base64Data = Buffer.from(pixelData.join('')).toString('base64');
    
    const command = {
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: 64,
      PicOffset: 0,
      PicID: 0,
      PicSpeed: 1000,
      PicData: base64Data
    };
    return await this.sendCommand(command);
  }

  /**
   * Set brightness
   * @param {number} brightness - Brightness level (0-100)
   */
  async setBrightness(brightness) {
    const command = {
      Command: 'Channel/SetBrightness',
      Brightness: Math.max(0, Math.min(100, brightness))
    };
    return await this.sendCommand(command);
  }

  /**
   * Convert RGB array to hex string
   */
  rgbToHex(rgb) {
    return rgb.map(c => {
      const hex = Math.max(0, Math.min(255, c)).toString(16);
      return hex.padStart(2, '0');
    }).join('');
  }

  /**
   * Create a simple test image (64x64)
   */
  createSimpleImage() {
    const pixels = [];
    
    // Create a gradient pattern that's definitely visible
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        if (y < 20) {
          pixels.push('FF0000'); // Red top
        } else if (y < 40) {
          pixels.push('00FF00'); // Green middle
        } else {
          pixels.push('0000FF'); // Blue bottom
        }
      }
    }
    
    return pixels.join('');
  }

  /**
   * Send raw image data to the display
   */
  async sendImage(imageData) {
    const command = {
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: 64,
      PicOffset: 0,
      PicID: 0,
      PicSpeed: 1000,
      PicData: imageData
    };
    return await this.sendCommand(command);
  }

  /**
   * Create pixel data for a single pixel
   */
  createPixelData(x, y, color) {
    const pixels = new Array(64 * 64).fill('000000');
    const index = y * 64 + x;
    pixels[index] = this.rgbToHex(color);
    return Buffer.from(pixels.join('')).toString('base64');
  }

  /**
   * Create a simple animation frame buffer
   * @param {Array} frames - Array of 64x64 pixel arrays
   */
  async sendAnimation(frames) {
    const picData = frames.map(frame => {
      const hexData = frame.map(color => this.rgbToHex(color)).join('');
      return hexData;
    }).join('');
    
    const command = {
      Command: 'Draw/SendHttpGif',
      PicNum: frames.length,
      PicWidth: 64,
      PicOffset: 0,
      PicID: 0,
      PicSpeed: 1000,
      PicData: Buffer.from(picData).toString('base64')
    };
    return await this.sendCommand(command);
  }

  /**
   * Create an empty frame (64x64 black pixels)
   */
  createEmptyFrame() {
    return Array(64 * 64).fill([0, 0, 0]);
  }

  /**
   * Set a pixel in a frame
   */
  setPixelInFrame(frame, x, y, color) {
    if (x >= 0 && x < 64 && y >= 0 && y < 64) {
      frame[y * 64 + x] = color;
    }
  }

  /**
   * Display a frame on the device
   */
  async displayFrame(frame) {
    const hexData = frame.map(color => this.rgbToHex(color)).join('');
    
    const command = {
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: 64,
      PicOffset: 0,
      PicID: 0,
      PicSpeed: 100,
      PicData: hexData
    };
    return await this.sendCommand(command);
  }

  /**
   * Draw a vertical line in a frame
   */
  drawVerticalLine(frame, x, y, height, color) {
    for (let i = 0; i < height; i++) {
      this.setPixelInFrame(frame, x, y + i, color);
    }
  }

  /**
   * Draw a horizontal line in a frame
   */
  drawHorizontalLine(frame, x, y, width, color) {
    for (let i = 0; i < width; i++) {
      this.setPixelInFrame(frame, x + i, y, color);
    }
  }

  /**
   * Draw letter H in a frame
   */
  drawLetterH(frame, x, y, color) {
    this.drawVerticalLine(frame, x, y, 7, color);
    this.drawVerticalLine(frame, x + 4, y, 7, color);
    this.drawHorizontalLine(frame, x, y + 3, 5, color);
  }

  /**
   * Draw letter E in a frame
   */
  drawLetterE(frame, x, y, color) {
    this.drawVerticalLine(frame, x, y, 7, color);
    this.drawHorizontalLine(frame, x, y, 5, color);
    this.drawHorizontalLine(frame, x, y + 3, 4, color);
    this.drawHorizontalLine(frame, x, y + 6, 5, color);
  }

  /**
   * Draw letter L in a frame
   */
  drawLetterL(frame, x, y, color) {
    this.drawVerticalLine(frame, x, y, 7, color);
    this.drawHorizontalLine(frame, x, y + 6, 5, color);
  }

  /**
   * Draw letter O in a frame
   */
  drawLetterO(frame, x, y, color) {
    this.drawVerticalLine(frame, x, y, 7, color);
    this.drawVerticalLine(frame, x + 4, y, 7, color);
    this.drawHorizontalLine(frame, x, y, 5, color);
    this.drawHorizontalLine(frame, x, y + 6, 5, color);
  }

  /**
   * 3x5 pixel font definitions for small text rendering
   * Each character is represented as an array of 5 rows (each row is 3 bits)
   */
  getSmallFont() {
    return {
      '0': [0b111, 0b101, 0b101, 0b101, 0b111],
      '1': [0b010, 0b110, 0b010, 0b010, 0b111],
      '2': [0b111, 0b001, 0b111, 0b100, 0b111],
      '3': [0b111, 0b001, 0b111, 0b001, 0b111],
      '4': [0b101, 0b101, 0b111, 0b001, 0b001],
      '5': [0b111, 0b100, 0b111, 0b001, 0b111],
      '6': [0b111, 0b100, 0b111, 0b101, 0b111],
      '7': [0b111, 0b001, 0b001, 0b001, 0b001],
      '8': [0b111, 0b101, 0b111, 0b101, 0b111],
      '9': [0b111, 0b101, 0b111, 0b001, 0b111],
      ':': [0b000, 0b010, 0b000, 0b010, 0b000],
      ' ': [0b000, 0b000, 0b000, 0b000, 0b000],
      'A': [0b111, 0b101, 0b111, 0b101, 0b101],
      'B': [0b110, 0b101, 0b110, 0b101, 0b110],
      'C': [0b111, 0b100, 0b100, 0b100, 0b111],
      'D': [0b110, 0b101, 0b101, 0b101, 0b110],
      'E': [0b111, 0b100, 0b111, 0b100, 0b111],
      'F': [0b111, 0b100, 0b111, 0b100, 0b100],
      'G': [0b111, 0b100, 0b101, 0b101, 0b111],
      'H': [0b101, 0b101, 0b111, 0b101, 0b101],
      'I': [0b111, 0b010, 0b010, 0b010, 0b111],
      'J': [0b111, 0b001, 0b001, 0b101, 0b111],
      'K': [0b101, 0b110, 0b100, 0b110, 0b101],
      'L': [0b100, 0b100, 0b100, 0b100, 0b111],
      'M': [0b101, 0b111, 0b111, 0b101, 0b101],
      'N': [0b101, 0b111, 0b111, 0b111, 0b101],
      'O': [0b111, 0b101, 0b101, 0b101, 0b111],
      'P': [0b111, 0b101, 0b111, 0b100, 0b100],
      'Q': [0b111, 0b101, 0b101, 0b111, 0b001],
      'R': [0b111, 0b101, 0b110, 0b101, 0b101],
      'S': [0b111, 0b100, 0b111, 0b001, 0b111],
      'T': [0b111, 0b010, 0b010, 0b010, 0b010],
      'U': [0b101, 0b101, 0b101, 0b101, 0b111],
      'V': [0b101, 0b101, 0b101, 0b101, 0b010],
      'W': [0b101, 0b101, 0b111, 0b111, 0b101],
      'X': [0b101, 0b101, 0b010, 0b101, 0b101],
      'Y': [0b101, 0b101, 0b010, 0b010, 0b010],
      'Z': [0b111, 0b001, 0b010, 0b100, 0b111],
      '-': [0b000, 0b000, 0b111, 0b000, 0b000],
      '/': [0b001, 0b001, 0b010, 0b100, 0b100],
      '.': [0b000, 0b000, 0b000, 0b000, 0b010],
    };
  }

  /**
   * Draw small text (3x5 pixel characters) by creating an image overlay
   * @param {string} text - Text to display
   * @param {number} x - X position
   * @param {number} y - Y position  
   * @param {Array} color - RGB color array [r, g, b]
   * @param {number} textId - Text ID (used as PicID)
   */
  async drawSmallText(text, x, y, color, textId) {
    const font = this.getSmallFont();
    const upperText = text.toUpperCase();
    
    // Create a 64x64 frame buffer with transparent background
    const buffer = Buffer.alloc(64 * 64 * 3);
    
    let xOffset = x;
    for (let i = 0; i < upperText.length; i++) {
      const char = upperText[i];
      const charData = font[char] || font[' '];
      
      // Draw each row of the character
      for (let row = 0; row < 5; row++) {
        const rowBits = charData[row];
        for (let col = 0; col < 3; col++) {
          if (rowBits & (1 << (2 - col))) {
            const pixelX = xOffset + col;
            const pixelY = y + row;
            if (pixelX >= 0 && pixelX < 64 && pixelY >= 0 && pixelY < 64) {
              const index = (pixelY * 64 + pixelX) * 3;
              buffer[index] = color[0];
              buffer[index + 1] = color[1];
              buffer[index + 2] = color[2];
            }
          }
        }
      }
      xOffset += 4; // 3 pixels + 1 pixel spacing
    }
    
    const command = {
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: 64,
      PicOffset: 0,
      PicID: textId,
      PicSpeed: 1000,
      PicData: buffer.toString('base64')
    };
    return await this.sendCommand(command);
  }

  /**
   * Display "Hello World" in yellow text
   * Clears the screen and shows the classic greeting
   */
  async displayHelloWorld() {
    // Clear to black
    await this.fillScreenColor(0, 0, 0);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Draw "Hello World" text in yellow
    await this.drawTextSimple('Hello World', 2, 28, [255, 255, 0]);
  }
}
