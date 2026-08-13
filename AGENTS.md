# AGENTS.md

## 1. Project Overview

Build a simple REST API in **JavaScript/Node.js** for collecting, normalizing, and exposing tourism information about **Cartagena de Indias, Colombia**.

The initial information categories are:

- Events
- Places
- Food / traditional dishes

The initial data sources are strictly:

1. **Visit Cartagena**
2. **Official Open Data sources related to Cartagena**

Do not add other cities or external tourism sources unless explicitly requested.

The application is **backend-only**.

Do NOT implement:

- Frontend
- Mobile application
- Booking system
- Authentication system
- Admin dashboard
- Microservices
- Distributed architecture
- CQRS
- Event sourcing
- Hexagonal architecture
- Domain-driven design
- Unnecessary abstractions

Keep the implementation simple, modular, readable, and easy to maintain.

---

# 2. Technology

Use:

- Node.js
- JavaScript
- Express.js

For external data:

- `fetch` or `axios` for HTTP requests
- `cheerio` for static HTML parsing
- `playwright` only when required for dynamically rendered content

Do not introduce Playwright automatically.

First determine whether the required information can be obtained using normal HTTP requests and HTML parsing.

---

# 3. Architecture

Use the following initial structure:

```text
src/
├── controllers/
│   ├── events.controller.js
│   ├── places.controller.js
│   └── food.controller.js
│
├── services/
│   ├── events.service.js
│   ├── places.service.js
│   └── food.service.js
│
├── scrapers/
│   └── visitCartagena.scraper.js
│
├── integrations/
│   └── datosAbiertos.js
│
├── routes/
│   ├── events.routes.js
│   ├── places.routes.js
│   └── food.routes.js
│
├── config/
│   └── config.js
│
├── app.js
└── server.js
```

Do not create additional layers unless they become necessary.

The expected flow is:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Scraper / Integration
  ↓
External Source
```

---

# 4. Responsibilities

## Routes

Routes only define HTTP endpoints.

They must not contain business logic or scraping logic.

Example:

```javascript
router.get('/events', eventsController.getEvents);
router.get('/events/:id', eventsController.getEventById);
```

---

## Controllers

Controllers are responsible for:

- Reading request parameters.
- Reading query parameters.
- Calling the corresponding service.
- Returning the HTTP response.
- Returning appropriate HTTP status codes.

Controllers must NOT:

- Perform scraping.
- Call external websites directly.
- Contain normalization logic.
- Contain complex business logic.

---

## Services

Services contain application logic.

They are responsible for:

- Requesting data from scrapers/integrations.
- Normalizing data.
- Filtering data.
- Removing duplicates.
- Preparing data for controllers.

---

## Scrapers

Scrapers are responsible only for obtaining information from web pages.

The initial scraper is:

```text
src/scrapers/visitCartagena.scraper.js
```

Do not put Express code inside scrapers.

---

## Integrations

Official Open Data sources must be consumed through their available official APIs/datasets/OData endpoints.

Do NOT scrape the HTML interface of an Open Data portal when an official API or dataset endpoint is available.

The integration is:

```text
src/integrations/datosAbiertos.js
```

---

# 5. Data Sources

## Visit Cartagena

Visit Cartagena is the initial web scraping source.

Before implementing selectors:

1. Inspect the real website.
2. Determine where the required information is located.
3. Determine whether the content exists in the initial HTML.
4. Determine whether JavaScript dynamically loads the content.
5. Check whether the website exposes an API used by its frontend.
6. Choose the simplest reliable extraction method.

Do not invent:

- CSS selectors
- XPath expressions
- API endpoints
- HTML structures
- URLs
- Data fields

Use the actual structure discovered during implementation.

Prefer:

```text
HTTP request + Cheerio
```

Use:

```text
Playwright
```

only if necessary.

---

# 6. Open Data

Open Data must be integrated through official APIs, datasets, or OData endpoints whenever available.

The system must not depend on scraping the visual HTML interface of the Open Data portal.

Normalize Open Data records into the same internal structure used by Visit Cartagena.

The API consumer must not need to know which source produced the record.

---

# 7. Normalization

Different sources may use different field names and structures.

Normalize all records into the API's standard format.

Example:

```text
source field: nombre_evento
API field:    title
```

The API must expose consistent field names regardless of the source.

Perform:

- Whitespace cleanup.
- HTML cleanup.
- URL normalization.
- Date normalization.
- Basic validation.
- Duplicate detection.
- Invalid record filtering.

Never fabricate missing information.

If a value cannot be obtained:

```json
null
```

or:

```json
[]
```

depending on the field.

---

# 8. API Endpoints

The public REST API initially exposes:

```text
GET /api/events
GET /api/events/:id

GET /api/places
GET /api/places/:id

GET /api/food
GET /api/food/:id
```

Optional query filters:

```text
GET /api/events?category=Cultura
GET /api/events?date=2026-08-20
GET /api/events?source=visit-cartagena

GET /api/places?category=Museos
GET /api/places?source=visit-cartagena

GET /api/food?category=Comida Caribeña
GET /api/food?source=visit-cartagena
```

Do not implement unnecessary endpoints.

---

# 9. Event Contract

The standard event object is:

```json
{
  "id": "event-001",
  "title": "Festival de Música",
  "description": "Festival cultural realizado en Cartagena.",
  "category": "Cultura",
  "startDate": "2026-08-20",
  "endDate": "2026-08-22",
  "latitude": 10.4236,
  "longitude": -75.5495,
  "imageUrl": "https://...",
  "source": "visit-cartagena",
  "sourceUrl": "https://..."
}
```

## Event location

Do not expose `address` or `location` as the primary location fields.

Use:

```text
latitude
longitude
```

These fields must always exist in the response.

If coordinates cannot be determined:

```json
{
  "latitude": null,
  "longitude": null
}
```

Never invent coordinates.

Try to obtain coordinates in this order:

1. Coordinates directly provided by the source.
2. Coordinates contained in source metadata, maps, links, or structured data.
3. Geocoding when appropriate and permitted.
4. `null` when coordinates cannot be reliably determined.

Keep the original location name internally when useful for geocoding, but do not expose it as a required API field.

---

# 10. Place Contract

The standard place object is:

```json
{
  "id": "place-001",
  "name": "Torre del Reloj",
  "description": "Monumento histórico de Cartagena.",
  "category": "Monumentos",
  "latitude": 10.4236,
  "longitude": -75.5495,
  "imageUrl": "https://...",
  "source": "visit-cartagena",
  "sourceUrl": "https://..."
}
```

Use `latitude` and `longitude` instead of exposing an address as the primary location information.

If coordinates cannot be obtained:

```json
{
  "latitude": null,
  "longitude": null
}
```

---

# 11. Food Contract

The standard food object is:

```json
{
  "id": "food-001",
  "name": "Arroz con coco",
  "description": "Preparación tradicional de la región Caribe.",
  "category": "Comida Caribeña",
  "keyIngredients": [
    "arroz",
    "coco"
  ],
  "origin": "Caribe colombiano",
  "imageUrl": "https://...",
  "source": "visit-cartagena",
  "sourceUrl": "https://..."
}
```

## keyIngredients

Do NOT return every ingredient of a recipe.

Use:

```text
keyIngredients
```

to represent only the principal or characteristic ingredients that identify the dish.

Example:

```json
{
  "name": "Arroz con coco",
  "keyIngredients": [
    "arroz",
    "coco"
  ]
}
```

Another example:

```json
{
  "name": "Arepa de huevo",
  "keyIngredients": [
    "maíz",
    "huevo"
  ]
}
```

Only use ingredients supported by the source.

Do not invent ingredients.

If the source does not provide enough information:

```json
{
  "keyIngredients": []
}
```

---

# 12. Collection Response

All collection endpoints must use the same response structure:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "source": "visit-cartagena"
  }
}
```

Example:

```http
GET /api/events
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "event-001",
      "title": "Festival de Música",
      "description": "Festival cultural realizado en Cartagena.",
      "category": "Cultura",
      "startDate": "2026-08-20",
      "endDate": "2026-08-22",
      "latitude": 10.4236,
      "longitude": -75.5495,
      "imageUrl": "https://...",
      "source": "visit-cartagena",
      "sourceUrl": "https://..."
    }
  ],
  "meta": {
    "total": 1,
    "source": "visit-cartagena"
  }
}
```

---

# 13. Single Resource Response

Individual resources must use:

```json
{
  "success": true,
  "data": {}
}
```

For example:

```text
GET /api/events/:id
```

returns:

```json
{
  "success": true,
  "data": {
    "id": "event-001",
    "title": "Festival de Música",
    "description": "Festival cultural realizado en Cartagena.",
    "category": "Cultura",
    "startDate": "2026-08-20",
    "endDate": "2026-08-22",
    "latitude": 10.4236,
    "longitude": -75.5495,
    "imageUrl": "https://...",
    "source": "visit-cartagena",
    "sourceUrl": "https://..."
  }
}
```

Apply the same structure to places and food.

---

# 14. Error Contract

All API errors must use:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found."
  }
}
```

Examples:

```text
EVENT_NOT_FOUND
PLACE_NOT_FOUND
FOOD_NOT_FOUND
SOURCE_UNAVAILABLE
INVALID_PARAMETER
SCRAPING_ERROR
INTERNAL_ERROR
```

Use appropriate HTTP status codes:

```text
200 OK
400 Bad Request
404 Not Found
500 Internal Server Error
502 Bad Gateway
```

Do not expose unnecessary stack traces or internal implementation details.

---

# 15. Scraping Rules

Do not execute scraping on every public GET request.

For example:

```text
GET /api/events
```

must not automatically trigger a new scrape.

Keep data acquisition separate from API querying.

The initial version does not require public scraping endpoints.

If a scraping trigger is added later, keep it separate from public read endpoints.

---

# 16. External Request Rules

All external requests must implement:

- Timeout.
- Error handling.
- Response validation.
- Reasonable request frequency.
- Configurable User-Agent when appropriate.
- Basic logging.

Do not make excessive requests.

Respect:

- `robots.txt`
- Terms of use.
- Applicable usage policies.
- Reasonable request limits.

Do not bypass access controls, CAPTCHAs, authentication, or other technical restrictions.

---

# 17. Duplicate Handling

Avoid obvious duplicate records.

A possible matching strategy is:

```text
name/title + date + coordinates/location
```

Do not delete records based only on similar names.

When records from different sources represent the same entity, prefer the most complete reliable record while preserving the source information appropriately.

---

# 18. Source Metadata

Every record must identify its origin:

```json
{
  "source": "visit-cartagena",
  "sourceUrl": "https://..."
}
```

or:

```json
{
  "source": "datos-abiertos",
  "sourceUrl": "https://..."
}
```

Never lose the original source reference during normalization.

---

# 19. Environment Configuration

Use environment variables.

Example:

```env
PORT=3000

VISIT_CARTAGENA_URL=...

DATOS_ABIERTOS_URL=...
```

Create:

```text
.env.example
```

Do not commit `.env`.

Do not hard-code secrets or credentials.

---

# 20. Data Persistence

Do not implement a complex database architecture initially.

The first goal is:

```text
Source
  ↓
Extraction
  ↓
Normalization
  ↓
REST API
  ↓
JSON
```

If persistence is required, use a simple implementation that can later be replaced by PostgreSQL.

Do not introduce repositories or database abstractions unless actually necessary.

---

# 21. Development Strategy

Work incrementally.

Do NOT implement the entire system blindly in one step.

## Phase 1 — Project setup

Create:

- Node.js project.
- Express.
- Basic folder structure.
- Environment configuration.
- Error handling.
- Health endpoint if useful.

## Phase 2 — Events API

Implement:

```text
GET /api/events
GET /api/events/:id
```

Initially use mock data to validate the API contract.

## Phase 3 — Visit Cartagena analysis

Inspect the real source.

Determine:

- Event URLs.
- HTML structure.
- Dynamic content.
- Structured data.
- Available coordinates.
- Images.
- Categories.
- Dates.

Do not code the scraper until this analysis is complete.

## Phase 4 — Event scraper

Implement the Visit Cartagena event scraper.

Normalize the extracted data.

Connect it to `events.service.js`.

Keep the API contract unchanged.

## Phase 5 — Places

Implement places using the same principles.

## Phase 6 — Food

Implement gastronomy.

Use:

```text
keyIngredients
```

instead of a complete ingredient list.

## Phase 7 — Open Data

Identify appropriate official Cartagena/Open Data datasets.

Consume their API/OData interfaces.

Normalize the records.

## Phase 8 — Filters

Add useful query parameters.

## Phase 9 — Testing

Test:

- Controllers.
- Services.
- Normalization.
- Scraper parsing.

Do not make tests depend exclusively on live external websites.

Use saved/mock HTML or mocked HTTP responses for scraper tests.

## Phase 10 — Documentation

Update README with:

- Installation.
- Configuration.
- Running the API.
- Architecture.
- Sources.
- Endpoints.
- Response examples.
- Scraping behavior.

---

# 22. Testing Requirements

Do not test scraping exclusively against the live website.

Create representative HTML fixtures or mocked responses.

Test:

- Correct extraction.
- Missing fields.
- Invalid dates.
- Missing coordinates.
- Missing images.
- Duplicate records.
- Unexpected HTML.
- HTTP errors.

---

# 23. Code Quality

Prioritize:

- Readability.
- Simplicity.
- Small functions.
- Clear names.
- Separation of responsibilities.
- Reusable logic where justified.
- Explicit error handling.

Avoid:

- Overengineering.
- Unnecessary abstractions.
- Giant files.
- Giant functions.
- Duplicate scraping logic.
- Hard-coded selectors scattered throughout the application.

---

# 24. Important Development Rule

Before implementing any scraper, investigate the actual source.

Never assume that a website's HTML structure, API, selectors, or URLs are the same as examples provided in this document.

This document defines the **application architecture and API contract**, not the exact scraping selectors.

The actual website structure must be verified at implementation time.

---

# 25. Final API Contract

The API must expose:

```text
GET /api/events
GET /api/events/:id

GET /api/places
GET /api/places/:id

GET /api/food
GET /api/food/:id
```

The main data flow is:

```text
                    ┌─────────────────────┐
                    │      REST API       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
           EVENTS           PLACES            FOOD
              │                │                │
              ▼                ▼                ▼
          Controller        Controller        Controller
              │                │                │
              ▼                ▼                ▼
           Service           Service           Service
              │                │                │
              └────────────┬───┴────┬───────────┘
                           │        │
                           ▼        ▼
                    Visit Cartagena
                       Scraper
                           │
                           +
                    Datos Abiertos
                       API/OData
                           │
                           ▼
                     Normalization
                           │
                           ▼
                         JSON
```

The implementation must remain focused on this objective:

**Collect, normalize, and expose Cartagena tourism information through a simple REST API.**

Do not add functionality outside this scope without explicit instruction.