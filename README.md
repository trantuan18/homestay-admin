# Homestay Admin UI v2

Frontend follows the supplied PRD: Axios HTTP client + interceptors, React Query server state, Zustand UI state, react-i18next bilingual UI, feature-based architecture, TypeScript API types, responsive CSS tokens, loading/error/empty states and toast feedback.

## Quick add
1. Extract this ZIP.
2. Copy `src/` into the existing `homestay-admin/src/` (keep any custom API files you already have only if they are newer; this package includes the canonical structure).
3. Copy `.env.example` to `.env` and set `VITE_API_URL=http://localhost:3000`.
4. Run `npm install` then `npm run dev`.

## Architecture
- `services/`: central Axios client, refresh-token interceptor, Accept-Language header.
- `features/`: feature-specific pages and API hooks.
- `components/ui/`: reusable UI primitives.
- `layouts/`: shared application shell.
- `store/`: Zustand client/UI state.
- `i18n/`: `vi` and `en` translations.
- `types/`: server response contracts.
- `utils/`: reserved for formatters/helpers.

## Language
The app uses `localStorage.language` first, then browser language, then Vietnamese. Toggle is instant and every API request sends `Accept-Language`.

## Theme
All major colors, spacing, radii and shadows live in `src/styles/theme.css`. The 2026 Pantone Color of the Year is Cloud Dancer; this UI uses a calm neutral surface system with a lime/chartreuse accent for interactive emphasis rather than using the Pantone white as an accent.
