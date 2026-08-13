const visitCartagenaApi = require('../integrations/visitCartagena.api');

class FoodService {
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
   * Normalize raw Visit Cartagena place/experience item from gastronomic categories into Food Contract
   * @param {Object} rawItem
   * @param {string} [fallbackCategory]
   */
  normalizeFood(rawItem, fallbackCategory = 'Comida Caribeña') {
    if (!rawItem) return null;

    const rawId = rawItem.id != null ? String(rawItem.id) : '';
    const id = rawId.startsWith('food-') ? rawId : `food-${rawId}`;

    const name = this.cleanText(rawItem.name || rawItem.details?.name || 'Gastronomía de Cartagena');
    const description = this.cleanText(rawItem.details?.description || rawItem.description || name);

    let category = fallbackCategory;
    if (Array.isArray(rawItem.categories) && rawItem.categories.length > 0) {
      const foodCat = rawItem.categories.find(
        c => c.name && (c.name.includes('Restaurante') || c.name.includes('Comida') || c.name.includes('Gastronom'))
      );
      category = this.cleanText(foodCat ? foodCat.name : rawItem.categories[0].name) || fallbackCategory;
    } else if (typeof rawItem.category === 'string') {
      category = this.cleanText(rawItem.category) || fallbackCategory;
    }

    const imageUrl = rawItem.imageUrl || rawItem.details?.imageUrl?.[0] || null;
    const sourceUrl = rawItem.url || 'https://www.visitcartagena.com.co/explore';

    // Visit Cartagena provides establishment/experience payloads without explicit ingredient lists.
    // Per AGENTS.md Section 11: "Only use ingredients supported by the source. Do not invent ingredients.
    // If the source does not provide enough information: { "keyIngredients": [] }"
    const keyIngredients = Array.isArray(rawItem.keyIngredients) ? rawItem.keyIngredients : [];

    // Origin defaults to Cartagena / Caribe Colombian region if verifiable from source location, otherwise null/string.
    const origin = rawItem.origin ? this.cleanText(rawItem.origin) : 'Cartagena, Caribe Colombiano';

    return {
      id,
      name,
      description,
      category,
      keyIngredients,
      origin,
      imageUrl,
      source: 'visit-cartagena',
      sourceUrl
    };
  }

  /**
   * Extract food records from category groups (Restaurante, Comida y bebida, etc.)
   */
  extractFoodFromCategories(categoryGroups) {
    const foodMap = new Map();

    const foodGroupFilter = g => {
      const name = (g.name || '').toLowerCase();
      return name.includes('restaurante') || name.includes('comida') || name.includes('gastronom') || g.id === 61 || g.id === 48;
    };

    const targetGroups = categoryGroups.filter(foodGroupFilter);

    for (const group of targetGroups) {
      const groupName = this.cleanText(group.name) || 'Comida y bebida';
      const itemsList = Array.isArray(group.places) ? group.places : [];

      for (const item of itemsList) {
        const normalized = this.normalizeFood(item, groupName);
        if (normalized && !foodMap.has(normalized.id)) {
          foodMap.set(normalized.id, normalized);
        }
      }
    }

    return Array.from(foodMap.values());
  }

  /**
   * Get list of normalized food/gastronomy items
   */
  async getFood(queryParams = {}) {
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
    let normalizedFood = this.extractFoodFromCategories(categoryGroups);

    // Apply category filter if specified
    if (category) {
      const catLower = category.toLowerCase();
      normalizedFood = normalizedFood.filter(
        f => f.category && f.category.toLowerCase() === catLower
      );
    }

    return {
      data: normalizedFood,
      meta: {
        total: normalizedFood.length,
        source: 'visit-cartagena'
      }
    };
  }

  /**
   * Get single normalized food item by ID
   */
  async getFoodById(id) {
    if (!id) {
      const error = new Error('Food ID is required.');
      error.statusCode = 400;
      error.code = 'INVALID_PARAMETER';
      throw error;
    }

    const cleanId = String(id).trim();

    const categoryGroups = await visitCartagenaApi.fetchPlaces('es');
    const normalizedFood = this.extractFoodFromCategories(categoryGroups);

    const found = normalizedFood.find(
      f => f.id === cleanId || f.id === `food-${cleanId}` || f.id.replace('food-', '') === cleanId
    );

    if (!found) {
      const error = new Error(`Food item with ID '${cleanId}' not found.`);
      error.statusCode = 404;
      error.code = 'FOOD_NOT_FOUND';
      throw error;
    }

    return found;
  }
}

module.exports = new FoodService();
