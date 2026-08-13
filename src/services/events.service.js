const visitCartagenaApi = require('../integrations/visitCartagena.api');
const config = require('../config/config');

class EventsService {
  /**
   * Format Date object or string to YYYY-MM-DD
   */
  formatDate(dateObj) {
    if (!dateObj) return null;
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  /**
   * Clean text string (strip HTML, trim extra whitespace)
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') return null;
    const cleaned = text
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || null;
  }

  /**
   * Sanitize coordinates: convert (0,0), missing, or invalid values to null
   */
  sanitizeCoordinates(lat, lng) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return { latitude: null, longitude: null };
    }

    if (parsedLat === 0 && parsedLng === 0) {
      return { latitude: null, longitude: null };
    }

    return {
      latitude: parsedLat,
      longitude: parsedLng
    };
  }

  /**
   * Normalize raw Visit Cartagena event object to API Event Contract
   */
  normalizeEvent(rawEvent) {
    if (!rawEvent) return null;

    const rawId = rawEvent.id != null ? String(rawEvent.id) : '';
    const id = rawId.startsWith('event-') ? rawId : `event-${rawId}`;

    const title = this.cleanText(rawEvent.eventName || rawEvent.title || 'Evento sin título');
    const description = this.cleanText(rawEvent.description);

    let category = 'General';
    if (Array.isArray(rawEvent.categories) && rawEvent.categories.length > 0) {
      category = this.cleanText(rawEvent.categories[0].name) || 'General';
    } else if (typeof rawEvent.category === 'string') {
      category = this.cleanText(rawEvent.category) || 'General';
    }

    const startDate = this.formatDate(rawEvent.dateTime || rawEvent.startDate);
    const endDate = this.formatDate(rawEvent.endDate || rawEvent.dateTime);

    const imageUrl = Array.isArray(rawEvent.images) && rawEvent.images.length > 0
      ? rawEvent.images[0]
      : (typeof rawEvent.imageUrl === 'string' ? rawEvent.imageUrl : null);

    const coords = this.sanitizeCoordinates(
      rawEvent.latitude ?? rawEvent.location?.latitude,
      rawEvent.longitude ?? rawEvent.location?.longitude
    );

    const sourceUrl = rawEvent.url || 'https://www.visitcartagena.com.co/events';

    return {
      id,
      title,
      description,
      category,
      startDate,
      endDate,
      latitude: coords.latitude,
      longitude: coords.longitude,
      imageUrl,
      source: 'visit-cartagena',
      sourceUrl
    };
  }

  /**
   * Compute default date window (configurable past/future range)
   */
  getDefaultDateWindow() {
    const now = Date.now();
    const pastTime = now - (config.defaultDateWindowPastDays * 24 * 60 * 60 * 1000);
    const futureTime = now + (config.defaultDateWindowFutureDays * 24 * 60 * 60 * 1000);

    const startDate = this.formatDate(new Date(pastTime));
    const endDate = this.formatDate(new Date(futureTime));
    return { startDate, endDate };
  }

  /**
   * Get list of normalized events
   */
  async getEvents(queryParams = {}) {
    const { category, date, source, startDate: reqStartDate, endDate: reqEndDate } = queryParams;

    // Source filtering check
    if (source && source !== 'visit-cartagena') {
      return {
        data: [],
        meta: {
          total: 0,
          source: source
        }
      };
    }

    let startDate = reqStartDate;
    let endDate = reqEndDate;

    // Handle query parameter `date` (e.g. date=2026-01-04)
    if (date) {
      const formattedDate = this.formatDate(date);
      if (!formattedDate) {
        const error = new Error('Invalid date parameter format. Expected YYYY-MM-DD.');
        error.statusCode = 400;
        error.code = 'INVALID_PARAMETER';
        throw error;
      }
      startDate = formattedDate;
      endDate = formattedDate;
    }

    // Generate default date window if no dates provided
    if (!startDate || !endDate) {
      const defaultWindow = this.getDefaultDateWindow();
      startDate = startDate || defaultWindow.startDate;
      endDate = endDate || defaultWindow.endDate;
    }

    const rawEvents = await visitCartagenaApi.fetchEvents({
      startDate,
      endDate
    });

    let normalizedEvents = rawEvents
      .map(e => this.normalizeEvent(e))
      .filter(Boolean);

    // Apply category filter if specified
    if (category) {
      const catLower = category.toLowerCase();
      normalizedEvents = normalizedEvents.filter(
        e => e.category && e.category.toLowerCase() === catLower
      );
    }

    // Apply date filter if specified
    if (date) {
      const dateStr = this.formatDate(date);
      normalizedEvents = normalizedEvents.filter(
        e => (e.startDate && e.startDate <= dateStr) && (e.endDate && e.endDate >= dateStr)
      );
    }

    return {
      data: normalizedEvents,
      meta: {
        total: normalizedEvents.length,
        source: 'visit-cartagena'
      }
    };
  }

  /**
   * Get single normalized event by ID
   */
  async getEventById(id) {
    if (!id) {
      const error = new Error('Event ID is required.');
      error.statusCode = 400;
      error.code = 'INVALID_PARAMETER';
      throw error;
    }

    const cleanId = String(id).trim();

    // Fetch list of events using default date window
    const defaultWindow = this.getDefaultDateWindow();
    const rawEvents = await visitCartagenaApi.fetchEvents({
      startDate: defaultWindow.startDate,
      endDate: defaultWindow.endDate
    });

    const normalizedEvents = rawEvents.map(e => this.normalizeEvent(e));
    const found = normalizedEvents.find(
      e => e.id === cleanId || e.id === `event-${cleanId}` || e.id.replace('event-', '') === cleanId
    );

    if (!found) {
      const error = new Error(`Event with ID '${cleanId}' not found.`);
      error.statusCode = 404;
      error.code = 'EVENT_NOT_FOUND';
      throw error;
    }

    return found;
  }
}

module.exports = new EventsService();
