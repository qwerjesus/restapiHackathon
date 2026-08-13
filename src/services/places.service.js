const visitCartagenaApi = require('../integrations/visitCartagena.api');

class PlacesService {
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
   * Normalize raw Visit Cartagena place object to API Place Contract
   * @param {Object} rawPlace
   * @param {string} [fallbackCategory]
   */
  normalizePlace(rawPlace, fallbackCategory = 'Atracciones') {
    if (!rawPlace) return null;

    const rawId = rawPlace.id != null ? String(rawPlace.id) : '';
    const id = rawId.startsWith('place-') ? rawId : `place-${rawId}`;

    const name = this.cleanText(rawPlace.name || rawPlace.details?.name || 'Lugar sin nombre');
    const description = this.cleanText(rawPlace.details?.description || rawPlace.description || name);

    let category = fallbackCategory;
    if (Array.isArray(rawPlace.categories) && rawPlace.categories.length > 0) {
      const primaryCat = rawPlace.categories.find(c => c.name && c.name !== 'Atracción');
      category = this.cleanText(primaryCat ? primaryCat.name : rawPlace.categories[0].name) || fallbackCategory;
    } else if (typeof rawPlace.category === 'string') {
      category = this.cleanText(rawPlace.category) || fallbackCategory;
    }

    const coords = this.sanitizeCoordinates(
      rawPlace.location?.latitude ?? rawPlace.latitude,
      rawPlace.location?.longitude ?? rawPlace.longitude
    );

    const imageUrl = rawPlace.imageUrl || rawPlace.details?.imageUrl?.[0] || null;
    const sourceUrl = rawPlace.url || 'https://www.visitcartagena.com.co/places';

    return {
      id,
      name,
      description,
      category,
      latitude: coords.latitude,
      longitude: coords.longitude,
      imageUrl,
      source: 'visit-cartagena',
      sourceUrl
    };
  }

  /**
   * Extract and normalize all places from category groups returned by Visit Cartagena
   */
  extractPlacesFromCategories(categoryGroups) {
    const placeMap = new Map();

    for (const group of categoryGroups) {
      const groupName = this.cleanText(group.name) || 'Lugar';
      const placesList = Array.isArray(group.places) ? group.places : [];

      for (const rawPlace of placesList) {
        const normalized = this.normalizePlace(rawPlace, groupName);
        if (normalized && !placeMap.has(normalized.id)) {
          placeMap.set(normalized.id, normalized);
        }
      }
    }

    return Array.from(placeMap.values());
  }

  /**
   * Get list of normalized places
   */
  async getPlaces(queryParams = {}) {
    const { category, source } = queryParams;

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

    const categoryGroups = await visitCartagenaApi.fetchPlaces('es');
    let normalizedPlaces = this.extractPlacesFromCategories(categoryGroups);

    // Apply category filter if specified
    if (category) {
      const catLower = category.toLowerCase();
      normalizedPlaces = normalizedPlaces.filter(
        p => p.category && p.category.toLowerCase() === catLower
      );
    }

    return {
      data: normalizedPlaces,
      meta: {
        total: normalizedPlaces.length,
        source: 'visit-cartagena'
      }
    };
  }

  /**
   * Get single normalized place by ID
   */
  async getPlaceById(id) {
    if (!id) {
      const error = new Error('Place ID is required.');
      error.statusCode = 400;
      error.code = 'INVALID_PARAMETER';
      throw error;
    }

    const cleanId = String(id).trim();

    const categoryGroups = await visitCartagenaApi.fetchPlaces('es');
    const normalizedPlaces = this.extractPlacesFromCategories(categoryGroups);

    const found = normalizedPlaces.find(
      p => p.id === cleanId || p.id === `place-${cleanId}` || p.id.replace('place-', '') === cleanId
    );

    if (!found) {
      const error = new Error(`Place with ID '${cleanId}' not found.`);
      error.statusCode = 404;
      error.code = 'PLACE_NOT_FOUND';
      throw error;
    }

    return found;
  }
}

module.exports = new PlacesService();
