import { startCalendarDisplay } from './calendar-display.js';
import { DivoomPixoo } from './divoom-pixoo.js';
import { config } from 'dotenv';
config({ path: '/config/.env' }); // Docker volume mount
config();                          // local .env fallback

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
let pixooIp = ipArg || process.env.PIXOO_IP;
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

async function resolvePixooIp() {
  if (pixooIp) return;
  console.log('No IP provided — scanning local network for Pixoo devices...');
  const found = await DivoomPixoo.discover();
  if (found.length === 0) {
    console.error('❌ No Pixoo devices found on the network.');
    console.error('Pass an IP explicitly: node index.js 192.168.x.x');
    process.exit(1);
  }
  if (found.length > 1) {
    console.log(`Found multiple devices: ${found.join(', ')}`);
    console.log(`Using first: ${found[0]}`);
  } else {
    console.log(`Found Pixoo at ${found[0]}`);
  }
  pixooIp = found[0];
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
  await resolvePixooIp();

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
