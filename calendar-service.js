import ical from 'node-ical';
import axios from 'axios';

export class CalendarService {
  constructor(feeds = [], currentDate = null) {
    this.feeds = feeds;
    this.currentDate = currentDate || new Date();
  }

  /**
   * Add a calendar feed URL
   */
  addFeed(url) {
    // Convert webcal:// to https://
    const httpUrl = url.replace('webcal://', 'https://');
    this.feeds.push(httpUrl);
  }

  /**
   * Fetch and parse all calendar feeds
   */
  async fetchAllEvents() {
    const allEvents = [];
    
    for (const feedUrl of this.feeds) {
      try {
        console.log(`Fetching calendar from: ${feedUrl}`);
        const response = await axios.get(feedUrl);
        const events = await ical.async.parseICS(response.data);
        
        for (const k in events) {
          if (events[k].type === 'VEVENT') {
            allEvents.push(events[k]);
          }
        }
      } catch (error) {
        console.error(`Error fetching feed ${feedUrl}:`, error.message);
      }
    }
    
    return allEvents;
  }

  /**
   * Get events for a specific date
   * Includes events that start, end, or span across the target date
   */
  getEventsForDate(events, targetDate) {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = event.end ? new Date(event.end) : eventStart;
      
      // Event is relevant if:
      // 1. It starts on this day, OR
      // 2. It ends on this day, OR
      // 3. This day is between start and end
      return (eventStart <= endOfDay && eventEnd >= startOfDay);
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  /**
   * Get today's events
   */
  getTodayEvents(events) {
    return this.getEventsForDate(events, this.currentDate);
  }

  /**
   * Get tomorrow's events
   */
  getTomorrowEvents(events) {
    const tomorrow = new Date(this.currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.getEventsForDate(events, tomorrow);
  }

  /**
   * Get upcoming weekend events (Saturday and Sunday)
   */
  getWeekendEvents(events) {
    const today = new Date(this.currentDate);
    const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate days until next Saturday
    let daysUntilSaturday = (6 - currentDay + 7) % 7;
    if (daysUntilSaturday === 0 && currentDay !== 6) {
      daysUntilSaturday = 7; // If today is not Saturday, get next Saturday
    }
    
    const saturday = new Date(this.currentDate);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    
    const saturdayEvents = this.getEventsForDate(events, saturday);
    const sundayEvents = this.getEventsForDate(events, sunday);
    
    return {
      saturday: saturdayEvents,
      sunday: sundayEvents,
      saturdayDate: saturday,
      sundayDate: sunday
    };
  }

  /**
   * Format event time
   * For multi-day events, shows time only if it starts on the target day
   */
  formatEventTime(event, targetDate = null) {
    const start = new Date(event.start);
    
    // If we're checking a specific date and the event doesn't start on that day,
    // show it as an all-day/ongoing event
    if (targetDate) {
      const targetStart = new Date(targetDate);
      targetStart.setHours(0, 0, 0, 0);
      const eventStartDay = new Date(start);
      eventStartDay.setHours(0, 0, 0, 0);
      
      if (eventStartDay.getTime() !== targetStart.getTime()) {
        return '     '; // 5 spaces to align with time format (HH:MM)
      }
    }
    
    const hours = start.getHours().toString().padStart(2, '0');
    const minutes = start.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Format event for display (short version)
   */
  formatEventShort(event) {
    const time = this.formatEventTime(event);
    const summary = event.summary || 'No title';
    return `${time} ${summary}`;
  }

  /**
   * Get summary of today, tomorrow, and weekend
   */
  async getDailySummary() {
    const allEvents = await this.fetchAllEvents();
    
    const today = this.getTodayEvents(allEvents);
    const tomorrow = this.getTomorrowEvents(allEvents);
    const weekend = this.getWeekendEvents(allEvents);
    
    const todayDate = new Date(this.currentDate);
    const tomorrowDate = new Date(this.currentDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    
    return {
      today: today.map(e => ({
        time: this.formatEventTime(e, todayDate),
        summary: e.summary || 'No title',
        start: e.start,
        end: e.end,
        location: e.location
      })),
      tomorrow: tomorrow.map(e => ({
        time: this.formatEventTime(e, tomorrowDate),
        summary: e.summary || 'No title',
        start: e.start,
        end: e.end,
        location: e.location
      })),
      weekend: {
        saturday: weekend.saturday.map(e => ({
          time: this.formatEventTime(e, weekend.saturdayDate),
          summary: e.summary || 'No title',
          start: e.start,
          end: e.end,
          location: e.location
        })),
        sunday: weekend.sunday.map(e => ({
          time: this.formatEventTime(e, weekend.sundayDate),
          summary: e.summary || 'No title',
          start: e.start,
          end: e.end,
          location: e.location
        })),
        saturdayDate: weekend.saturdayDate,
        sundayDate: weekend.sundayDate
      }
    };
  }
}
