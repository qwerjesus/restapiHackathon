const test = require('node:test');
const assert = require('node:assert');
const recommendationsService = require('../src/services/recommendations.service');
const placesService = require('../src/services/places.service');
const geminiApi = require('../src/integrations/gemini.api');

test('normalizeLimit handles default 5, min 1, and max 6', () => {
  assert.strictEqual(recommendationsService.normalizeLimit(undefined), 5);
  assert.strictEqual(recommendationsService.normalizeLimit(null), 5);
  assert.strictEqual(recommendationsService.normalizeLimit(3), 3);
  assert.strictEqual(recommendationsService.normalizeLimit(6), 6);
  assert.strictEqual(recommendationsService.normalizeLimit(10), 6);
  assert.strictEqual(recommendationsService.normalizeLimit(100), 6);
  assert.strictEqual(recommendationsService.normalizeLimit(-2), 5);
});

test('scoreCandidate ranks items correctly based on category, interest, description, image', () => {
  const item1 = { id: 'place-1', category: 'Museos', description: 'Museo de historia importante', imageUrl: 'http://img', latitude: 10.4, longitude: -75.5 };
  const item2 = { id: 'place-2', category: 'Otros', description: 'Corta' };

  const score1 = recommendationsService.scoreCandidate(item1, 'Museos', 'historia');
  const score2 = recommendationsService.scoreCandidate(item2, 'Museos', 'historia');

  assert.ok(score1 > score2);
});

test('getTopCandidates selects at most 10 candidates', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({
    id: `place-${i}`,
    name: `Lugar ${i}`,
    category: 'Museos',
    description: `Descripción detallada del lugar ${i}`
  }));

  const candidates = recommendationsService.getTopCandidates(items, 'Museos', 'historia');
  assert.strictEqual(candidates.length, 10);
  assert.strictEqual(candidates[0].id, 'place-0');
});

test('buildPrompt includes category, interest, and instructions', () => {
  const prompt = recommendationsService.buildPrompt({
    category: 'Museos',
    interest: 'historia',
    candidatesPayload: [{ id: 'place-1', name: 'Museo A' }]
  });

  assert.ok(prompt.includes('Categoría solicitada: Museos'));
  assert.ok(prompt.includes('Interés del usuario: historia'));
  assert.ok(prompt.includes('Devuelve ÚNICAMENTE IDs'));
});

test('getRecommendations filters out hallucinated IDs and duplicate IDs from Gemini', async (t) => {
  const originalGetPlaces = placesService.getPlaces;
  const originalGenerate = geminiApi.generateRecommendations;

  // Mock placesService to isolate unit test
  placesService.getPlaces = async () => ({
    data: [
      {
        id: 'place-898',
        name: 'Palacio de la Inquisición',
        category: 'Museos',
        description: 'Museo histórico de Cartagena',
        latitude: 10.42,
        longitude: -75.55,
        imageUrl: 'http://img.jpg',
        source: 'visit-cartagena',
        sourceUrl: 'http://url.com'
      }
    ],
    meta: { total: 1, source: 'visit-cartagena' }
  });

  // Mock Gemini API
  geminiApi.generateRecommendations = async () => {
    return {
      recommendations: [
        { id: 'place-898', reason: 'Excelente recorrido histórico' },
        { id: 'place-999999', reason: 'Inventado por IA' }, // Nonexistent ID
        { id: 'place-898', reason: 'Duplicado' } // Duplicate ID
      ]
    };
  };

  t.after(() => {
    placesService.getPlaces = originalGetPlaces;
    geminiApi.generateRecommendations = originalGenerate;
  });

  const result = await recommendationsService.getRecommendations({
    type: 'places',
    limit: 6
  });

  assert.strictEqual(result.data.recommendations.length, 1);
  assert.strictEqual(result.data.recommendations[0].id, 'place-898');
  assert.strictEqual(result.data.recommendations[0].reason, 'Excelente recorrido histórico');
});

test('getRecommendations handles missing API key or Gemini failure with 503 error', async (t) => {
  const originalGetPlaces = placesService.getPlaces;
  const originalGenerate = geminiApi.generateRecommendations;

  placesService.getPlaces = async () => ({
    data: [{ id: 'place-1', name: 'Test', category: 'Museos' }],
    meta: { total: 1, source: 'visit-cartagena' }
  });

  geminiApi.generateRecommendations = async () => {
    const error = new Error('El servicio de recomendaciones no está disponible actualmente.');
    error.statusCode = 503;
    error.code = 'RECOMMENDATION_SERVICE_UNAVAILABLE';
    throw error;
  };

  t.after(() => {
    placesService.getPlaces = originalGetPlaces;
    geminiApi.generateRecommendations = originalGenerate;
  });

  await assert.rejects(
    async () => {
      await recommendationsService.getRecommendations({ type: 'places' });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 503);
      assert.strictEqual(err.code, 'RECOMMENDATION_SERVICE_UNAVAILABLE');
      return true;
    }
  );
});
