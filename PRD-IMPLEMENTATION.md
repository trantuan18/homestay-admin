# PRD implementation checklist

## Architecture
- Axios central HTTP client with Authorization + Accept-Language + refresh interceptor.
- React Query for server state/cache/refetch.
- Zustand for UI/client state.
- TypeScript contracts under `src/types`.
- Feature-based modules under `src/features`.
- Shared UI under `src/components/ui`.

## i18n
- `src/i18n/locales/vi/common.json`
- `src/i18n/locales/en/common.json`
- localStorage -> browser -> vi fallback.
- Instant language switch without reload.
- `Accept-Language` sent on every API request.

## UX states
- Loading component for queries.
- Error state with retry.
- Empty table states.
- Toast for login success/failure.
- Submit buttons disabled while loading.

## Responsive
- Mobile <640px
- Tablet 640-1024px
- Desktop >1024px

## Design system
All tokens live in `src/styles/theme.css`.
Do not hardcode colors, spacing, radii or shadows in feature components.

## Next implementation pass
1. Add CRUD modals/forms for Properties.
2. Add Room detail drawer + images/pricing/blocked periods tabs.
3. Add Admin Booking create/edit/status flow.
4. Add manual payment drawer and payment history using `/api/admin/bookings/:bookingId/payments`.
5. Add role-management form with ADMIN/SUPER_ADMIN safeguards.
6. Add analytics API integration.
