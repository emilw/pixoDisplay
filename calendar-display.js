import { DivoomPixoo } from './divoom-pixoo.js';
import { CalendarService } from './calendar-service.js';
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

async function fetchSummary(calendarFeeds, customDate) {
  const calendar = new CalendarService([], customDate);
  calendarFeeds.forEach(feed => calendar.addFeed(feed));
  const displayDate = customDate || new Date();
  console.log(`Fetching calendar events for: ${displayDate.toDateString()}\n`);
  return await calendar.getDailySummary();
}

function logSummary(summary) {
  console.log('📅 TODAY:');
  if (summary.today.length === 0) {
    console.log('  No events today');
  } else {
    summary.today.forEach(event => console.log(`  ${event.time} - ${event.summary}`));
  }

  console.log('\n📅 TOMORROW:');
  if (summary.tomorrow.length === 0) {
    console.log('  No events tomorrow');
  } else {
    summary.tomorrow.forEach(event => console.log(`  ${event.time} - ${event.summary}`));
  }

  console.log('\n📅 WEEKEND:');
  const satDate = summary.weekend.saturdayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sunDate = summary.weekend.sundayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  console.log(`  Saturday (${satDate}):`);
  summary.weekend.saturday.forEach(event => console.log(`    ${event.time} - ${event.summary}`));
  console.log(`  Sunday (${sunDate}):`);
  summary.weekend.sunday.forEach(event => console.log(`    ${event.time} - ${event.summary}`));
}

async function displayCalendar(pixoo, summary) {
  console.log('\n📺 Initializing display...');
  await pixoo.clearAll();
  await new Promise(resolve => setTimeout(resolve, 20));
  console.log('Starting calendar slideshow (4 screens, 6 seconds each)...');
  console.log('Press Ctrl+C to stop\n');
  const intervalId = await displaySlideshowOnPixoo(pixoo, summary);
  console.log('✓ Calendar display updated!');
  return intervalId;
}

async function displaySlideshowOnPixoo(pixoo, summary) {
  let currentScreen = 0;
  
  // Function to display the current screen
  const showScreen = async () => {
    // Fill screen black first for instant clear
    await pixoo.fillScreenColor(0, 0, 0);
    
    // Clear all GIFs (including smiley) and reset GIF ID
    await pixoo.sendCommand({ Command: 'Draw/ClearHttpGifs' });
    await pixoo.sendCommand({ Command: 'Draw/ResetHttpGifId' });
    
    // Clear all text IDs (on black background, so less visible)
    for (let i = 1; i <= 20; i++) {
      await pixoo.drawTextSimple('', 0, 0, [0, 0, 0], i);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (currentScreen) {
      case 0:
        console.log('Showing: TODAY');
        await displayTodayScreen(pixoo, summary);
        break;
      case 1:
        console.log('Showing: TOMORROW');
        await displayTomorrowScreen(pixoo, summary);
        break;
      case 2:
        console.log('Showing: SATURDAY');
        await displaySaturdayScreen(pixoo, summary);
        break;
      case 3:
        console.log('Showing: SUNDAY');
        await displaySundayScreen(pixoo, summary);
        break;
    }
    currentScreen = (currentScreen + 1) % 4;
  };
  
  const safeShowScreen = async () => {
    try {
      await showScreen();
    } catch (error) {
      console.error('Display error (will retry next cycle):', error.message);
    }
  };

  // Show first screen immediately
  await safeShowScreen();

  const intervalId = setInterval(safeShowScreen, 10000);
  return intervalId;
}

/**
 * Common function to display a screen with title and events
 */
async function displayScreen(pixoo, title, events, eventColor, startTextId = 1) {
  let yPos = 0;
  let textId = startTextId;
  
  // Display header
  await pixoo.drawTextSimple(title, 0, yPos, [255, 255, 0], textId++);
  yPos += 12;
  
  // Display events with smaller text
  if (events.length === 0) {
    await pixoo.drawTextSimple("Inget :-)", 2, yPos, [255, 255, 255], textId++);
  } else {
    const maxEvents = 5;
    
    // If more than 5 events, show 3 events + "X more.." line
    if (events.length > maxEvents) {
      const displayableEvents = maxEvents-1;
      const displayEvents = events.slice(0, displayableEvents);
      for (const event of displayEvents) {
        const text = `${event.time} ${event.summary.substring(0, 14)}`;
        await pixoo.drawTextSimple(text, 2, yPos, eventColor, textId++);
        yPos += 10;
      }
      const remaining = events.length - displayableEvents;
      await pixoo.drawTextSimple(`${remaining} more..`, 2, yPos, [150, 150, 150], textId++);
    } else {
      // Show all events (4 or fewer)
      const displayEvents = events.slice(0, maxEvents);
      for (const event of displayEvents) {
        const text = `${event.time} ${event.summary.substring(0, 14)}`;
        await pixoo.drawTextSimple(text, 2, yPos, eventColor, textId++);
        yPos += 10;
      }
    }
  }
}

async function displayTodayScreen(pixoo, summary) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  await displayScreen(pixoo, `Idag (${day}/${month})`, summary.today, [0, 255, 0], 1);
}

async function displayTomorrowScreen(pixoo, summary) {
  await displayScreen(pixoo, 'Imorgon', summary.tomorrow, [0, 150, 255], 6);
}

async function displaySaturdayScreen(pixoo, summary) {
  await displayScreen(pixoo, 'Lördag', summary.weekend.saturday, [255, 150, 0], 11);
}

async function displaySundayScreen(pixoo, summary) {
  await displayScreen(pixoo, 'Söndag', summary.weekend.sunday, [255, 100, 200], 16);
}

// Parse command line arguments for custom date
// Usage: node calendar-display.js IP_ADDRESS [YYYY-MM-DD]
const args = process.argv.slice(2);
const dateArg = args.find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg));
const customDate = dateArg ? new Date(dateArg) : null;

if (customDate && isNaN(customDate.getTime())) {
  console.error('Invalid date format. Use YYYY-MM-DD');
  process.exit(1);
}

// Main function with day change detection
export async function startCalendarDisplay(
  pixooIp = process.env.PIXOO_IP,
  customDate = null,
  calendarFeeds = parseCalendarFeeds(process.env.CALENDAR_FEEDS)
) {
  console.log(`Using Pixoo at IP: ${pixooIp}`);
  if (customDate) {
    console.log(`Using custom date: ${customDate.toDateString()}`);
  }

  const pixoo = new DivoomPixoo(pixooIp);
  let currentIntervalId = null;
  let currentDay = null;
  let cachedSummary = null;

  const checkAndRefresh = async () => {
    const now = new Date();
    const today = now.toDateString();

    if (today !== currentDay) {
      console.log(`\n${currentDay ? '📅 Day changed!' : '🚀 Starting calendar display...'} Refreshing data for ${today}\n`);

      if (currentIntervalId) clearInterval(currentIntervalId);

      let summary = null;
      try {
        summary = await fetchSummary(calendarFeeds, customDate);
        cachedSummary = summary;
        logSummary(summary);
      } catch (error) {
        console.error('Failed to fetch calendar data:', error.message);
        if (cachedSummary) {
          console.log('Using cached calendar data from previous fetch...');
          summary = cachedSummary;
        } else {
          console.error('No cached data available, will retry next minute.');
          return;
        }
      }

      try {
        currentIntervalId = await displayCalendar(pixoo, summary);
        currentDay = today;
      } catch (error) {
        console.error('Failed to initialize display (will retry next minute):', error.message);
      }
    }
  };
  
  // Initial display
  await checkAndRefresh();
  
  // Check for day change every minute (only if not using custom date)
  if (!customDate) {
    setInterval(checkAndRefresh, 60000);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  // Parse IP from command line args
  // Usage: node calendar-display.js IP_ADDRESS [YYYY-MM-DD]
  const ipArg = args.find(arg => /^\d+\.\d+\.\d+\.\d+$/.test(arg));
  
  const envIp = process.env.PIXOO_IP;
  const pixooIp = ipArg || envIp;
  const calendarFeeds = parseCalendarFeeds(process.env.CALENDAR_FEEDS);

  if (!pixooIp) {
    console.error('❌ Error: IP address is required');
    console.error('Usage: node calendar-display.js [IP_ADDRESS] [YYYY-MM-DD]');
    console.error('Or set PIXOO_IP in environment');
    console.error('Example: node calendar-display.js 192.168.10.139');
    console.error('Example: node calendar-display.js 192.168.10.139 2026-04-01');
    process.exit(1);
  }

  if (calendarFeeds.length === 0) {
    console.error('❌ Error: CALENDAR_FEEDS is required');
    console.error('Set CALENDAR_FEEDS as comma-separated URLs in environment.');
    process.exit(1);
  }

  startCalendarDisplay(pixooIp, customDate, calendarFeeds);
}
