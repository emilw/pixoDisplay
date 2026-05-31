import { startCalendarDisplay } from './calendar-display.js';
import { DivoomPixoo } from './divoom-pixoo.js';
import 'dotenv/config';

function parseCalendarFeeds(rawFeeds) {
  if (!rawFeeds) {
    return [];
  }

  return rawFeeds
    .split(/[\n,;]+/)
    .map(feed => feed.trim())
    .filter(Boolean);
}

// Parse command line arguments
// Usage: node index.js [IP_ADDRESS] [YYYY-MM-DD] [--test-mode|-t]
const args = process.argv.slice(2);
const ipArg = args.find(arg => /^\d+\.\d+\.\d+\.\d+$/.test(arg));
const dateArg = args.find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg));
const customDate = dateArg ? new Date(dateArg) : null;
const testMode = args.some(arg => arg === '--test-mode' || arg === '-t');
const pixooIp = ipArg || process.env.PIXOO_IP;
const calendarFeeds = parseCalendarFeeds(process.env.CALENDAR_FEEDS);

// Validate date if provided
if (customDate && isNaN(customDate.getTime())) {
  console.error('❌ Error: Invalid date format. Use YYYY-MM-DD');
  process.exit(1);
}

// Debug: show what we parsed
console.log(`Arguments: ${args.join(', ')}`);
console.log(`Detected IP: ${pixooIp || 'none'}`);
console.log(`Detected date: ${dateArg || 'today'}`);
console.log(`Test mode: ${testMode}\n`);

// Require IP address
if (!pixooIp) {
  console.error('❌ Error: IP address is required');
  console.error('Usage: node index.js [IP_ADDRESS] [YYYY-MM-DD] [--test-mode|-t]');
  console.error('Or set PIXOO_IP in environment');
  console.error('Example: node index.js 192.168.10.139');
  console.error('Example: node index.js 192.168.10.139 2026-04-05');
  console.error('Example: node index.js 192.168.10.139 --test-mode');
  console.error('Example: node index.js 192.168.10.139 2026-04-05 --test-mode');
  process.exit(1);
}

/**
 * Run hello world test
 */
async function runTestMode() {
  try {
    const pixoo = new DivoomPixoo(pixooIp);
    
    console.log('🧪 TEST MODE');
    console.log(`Testing Pixoo 64 at ${pixooIp}...\n`);
    
    // Display Hello World
    console.log('Displaying "Hello World"...');
    await pixoo.displayHelloWorld();
    
    console.log('\n✓ Test complete!');
    console.log('Your Pixoo 64 should now show "Hello World" in yellow!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Main orchestration function
 */
async function main() {
  if (testMode) {
    // Run in test mode (hello world)
    await runTestMode();
  } else {
    // Normal mode: start calendar display
    if (calendarFeeds.length === 0) {
      console.error('❌ Error: CALENDAR_FEEDS is required in normal mode');
      console.error('Set CALENDAR_FEEDS as comma-separated URLs in environment.');
      process.exit(1);
    }

    await startCalendarDisplay(pixooIp, customDate, calendarFeeds);
  }
}

main();
