# Practice Care Hub Backend

Production-oriented Node.js/TypeScript backend using Clean Architecture boundaries:

- Route layer: HTTP wiring and middleware composition
- Controller layer: request/response orchestration
- Service layer: business rules and transaction boundaries
- Repository layer: PostgreSQL data access

## Run locally

1. Copy `.env.example` to `.env` and configure secrets.
2. Start Postgres and backend via Docker:

```bash
docker compose up --build
```

3. Or run backend directly:

```bash
npm install
npm run dev
```

## API base URL

- `/api/v1`

## Core endpoints

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/signin`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/dentist/profile`
- `PUT /api/v1/dentist/profile`
- `GET /api/v1/licenses/current`
- `GET /api/v1/backups/latest`
- `POST /api/v1/backups/import`
- `GET /api/v1/system/status`
- `GET /api/v1/reminders/stats`

## Security baseline

- Password hashing with bcrypt (configurable rounds)
- JWT access + refresh token rotation
- Auth middleware with RBAC capability
- Request payload validation with Zod
- SQL injection protection with parameterized queries
- Helmet, CORS restriction, rate limiting, centralized error handling
