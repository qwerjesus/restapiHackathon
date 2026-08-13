const placesService = require('./places.service');
const eventsService = require('./events.service');
const foodService = require('./food.service');
const geminiApi = require('../integrations/gemini.api');
const config = require('../config/config');

class RecommendationsService {
  /**
   * Normalize limit parameter: default 5, max 6
   */
  normalizeLimit(limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) return 5;
    return Math.min(parsed, 6);
  }

  /**
   * Preliminary local ranking algorithm to score candidate items
   */
  scoreCandidate(item, targetCategory, targetInterest) {
    let score = 0;

    // Category match
    if (targetCategory && item.category) {
      if (item.category.toLowerCase() === targetCategory.toLowerCase()) {
        score += 10;
      }
    }

    // Interest match in title/description
    if (targetInterest) {
      const interestLower = targetInterest.toLowerCase();
      const textToSearch = `${item.name || item.title || ''} ${item.description || ''}`.toLowerCase();
      if (textToSearch.includes(interestLower)) {
        score += 8;
      }
    }

    // Completeness of description
    if (item.description && item.description.length > 20) {
      score += 5;
    }

    // Image presence
    if (item.imageUrl) {
      score += 3;
    }

    // Source URL presence
    if (item.sourceUrl) {
      score += 2;
    }

    // Coordinates presence
    if (item.latitude != null && item.longitude != null) {
      score += 2;
    }

    return score;
  }

  /**
   * Select top 10 candidates using preliminary local ranking
   */
  getTopCandidates(items, category, interest) {
    const scored = items.map(item => ({
      item,
      score: this.scoreCandidate(item, category, interest)
    }));

    scored.sort((a, b) => b.score - a.score);

    // Pick top 10 max
    return scored.slice(0, 10).map(s => s.item);
  }

  /**
   * Format candidates for Gemini prompt payload (minimal essential fields)
   */
  formatCandidatesForPrompt(candidates) {
    return candidates.map(c => ({
      id: c.id,
      name: c.name || c.title || 'Sin nombre',
      description: c.description || 'Sin descripción',
      category: c.category || 'General'
    }));
  }

  /**
   * Construct dynamic prompt for Gemini
   */
  buildPrompt({ category, interest, candidatesPayload }) {
    return `Categoría solicitada: ${category || 'Todas'}
Interés del usuario: ${interest || 'General'}

Candidatos disponibles:
${JSON.stringify(candidatesPayload, null, 2)}

Instrucciones para Gemini:
1. Selecciona los candidatos más relevantes según la categoría e interés del usuario.
2. Devuelve ÚNICAMENTE IDs que estén presentes en la lista de candidatos proporcionada.
3. NO inventes lugares, eventos, restaurantes ni platos.
4. NO inventes información, coordenadas ni ingredientes.
5. NO modifiques los nombres ni las categorías.
6. Utiliza exclusivamente la información proporcionada en los candidatos.
7. Ordena los resultados de mayor a menor relevancia.
8. Devuelve máximo 6 recomendaciones.
9. Genera una razón breve ("reason") en español para cada selección basándote exclusivamente en la descripción del candidato.`;
  }

  /**
   * Get recommendations for places, events, or food
   */
  async getRecommendations({ type, category, interest, limit }) {
    const finalLimit = this.normalizeLimit(limit);

    let rawDataResult;
    if (type === 'places') {
      rawDataResult = await placesService.getPlaces({ category });
    } else if (type === 'events') {
      rawDataResult = await eventsService.getEvents({ category });
    } else if (type === 'food') {
      rawDataResult = await foodService.getFood({ category });
    } else {
      const error = new Error(`Tipo de recomendación no soportado: '${type}'`);
      error.statusCode = 400;
      error.code = 'INVALID_PARAMETER';
      throw error;
    }

    const availableItems = rawDataResult.data || [];
    if (availableItems.length === 0) {
      return {
        data: {
          category: category || null,
          interest: interest || null,
          recommendations: []
        },
        meta: {
          total: 0,
          source: 'visit-cartagena',
          model: config.geminiModel
        }
      };
    }

    // Step 1: Local Preliminary Ranking -> Select top 10 max
    const topCandidates = this.getTopCandidates(availableItems, category, interest);
    const candidateMap = new Map(topCandidates.map(c => [c.id, c]));

    // Step 2: Build minimal payload & prompt for Gemini
    const promptPayload = this.formatCandidatesForPrompt(topCandidates);
    const promptText = this.buildPrompt({
      category,
      interest,
      candidatesPayload: promptPayload
    });

    // Step 3: Call Gemini API integration
    const aiResponse = await geminiApi.generateRecommendations(promptText);

    // Step 4: Strict Validation of Gemini Response
    const rawRecommendations = Array.isArray(aiResponse?.recommendations) ? aiResponse.recommendations : [];

    const validatedRecommendations = [];
    const seenIds = new Set();

    for (const rec of rawRecommendations) {
      if (!rec || !rec.id || typeof rec.id !== 'string') continue;

      const cleanId = rec.id.trim();

      // Enforce: ID MUST exist in candidate list
      if (!candidateMap.has(cleanId)) {
        continue;
      }

      // Enforce: Remove duplicates
      if (seenIds.has(cleanId)) {
        continue;
      }

      seenIds.add(cleanId);

      // Retrieve original full entity from backend candidate map
      const originalEntity = candidateMap.get(cleanId);
      const reasonText = (typeof rec.reason === 'string' && rec.reason.trim())
        ? rec.reason.trim()
        : `Recomendado según la categoría ${originalEntity.category}.`;

      validatedRecommendations.push({
        ...originalEntity,
        reason: reasonText
      });

      // Enforce: Max limit (default 5, max 6)
      if (validatedRecommendations.length >= finalLimit) {
        break;
      }
    }

    return {
      data: {
        category: category || null,
        interest: interest || null,
        recommendations: validatedRecommendations
      },
      meta: {
        total: validatedRecommendations.length,
        source: 'visit-cartagena',
        model: config.geminiModel
      }
    };
  }
}

module.exports = new RecommendationsService();
