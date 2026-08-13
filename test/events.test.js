const test = require('node:test');
const assert = require('node:assert');
const eventsService = require('../src/services/events.service');

test('sanitizeCoordinates converts (0,0) and invalid values to null', () => {
  assert.deepStrictEqual(eventsService.sanitizeCoordinates(0, 0), { latitude: null, longitude: null });
  assert.deepStrictEqual(eventsService.sanitizeCoordinates('0', '0'), { latitude: null, longitude: null });
  assert.deepStrictEqual(eventsService.sanitizeCoordinates(null, undefined), { latitude: null, longitude: null });
  assert.deepStrictEqual(eventsService.sanitizeCoordinates('invalid', 10.4), { latitude: null, longitude: null });
  assert.deepStrictEqual(eventsService.sanitizeCoordinates(10.4236, -75.5495), { latitude: 10.4236, longitude: -75.5495 });
});

test('normalizeEvent adheres to the Event Contract in AGENTS.md', () => {
  const raw = {
    id: 40,
    eventName: "Festival de Música Clásica",
    description: "<p>Ciclo de conciertos de música clásica.</p>",
    dateTime: "2026-01-04T00:00:00.000Z",
    images: ["https://ctg-bucket-prd.s3.us-east-1.amazonaws.com/events/ac49.jpg"],
    categories: [{ id: 1, name: "Cultura" }],
    latitude: 0,
    longitude: 0,
    url: null
  };

  const normalized = eventsService.normalizeEvent(raw);

  assert.strictEqual(normalized.id, "event-40");
  assert.strictEqual(normalized.title, "Festival de Música Clásica");
  assert.strictEqual(normalized.description, "Ciclo de conciertos de música clásica.");
  assert.strictEqual(normalized.category, "Cultura");
  assert.strictEqual(normalized.startDate, "2026-01-04");
  assert.strictEqual(normalized.endDate, "2026-01-04");
  assert.strictEqual(normalized.latitude, null);
  assert.strictEqual(normalized.longitude, null);
  assert.strictEqual(normalized.imageUrl, "https://ctg-bucket-prd.s3.us-east-1.amazonaws.com/events/ac49.jpg");
  assert.strictEqual(normalized.source, "visit-cartagena");
  assert.strictEqual(normalized.sourceUrl, "https://www.visitcartagena.com.co/events");
});

test('getDefaultDateWindow returns valid YYYY-MM-DD range', () => {
  const window = eventsService.getDefaultDateWindow();
  assert.ok(window.startDate.match(/^\d{4}-\d{2}-\d{2}$/));
  assert.ok(window.endDate.match(/^\d{4}-\d{2}-\d{2}$/));
  assert.ok(window.startDate <= window.endDate);
});
