# KostMate design

Source: `KostMate.pdf`, 18 slides. User delegates visual decisions and requests a minimalist, easy-to-understand React website with a Python backend.

## Purpose

Help students find available rooms near BINUS without repeated surveys; help owners of 5–50 rooms publish accurate availability and manage their boarding houses.

## Visual direction

Warm white backgrounds, dark teal brand, readable sans-serif typography, generous space, natural room photographs, restrained borders, and clear action labels in Indonesian. Airbnb informs property discovery and Linear informs dashboard hierarchy. Preserve the teal identity visible on slide 5. Desktop listing grid collapses to one column on mobile; filters move into a sheet on small screens. Status uses text as well as color.

## Scope

- Public discovery with search by name, district or campus, rent range, gender, facilities, availability, property type, move-in date and sorting.
- Listing cards show monthly price, facilities, district and actual available-room counts.
- Property details show photo gallery, size, location, rules, additional fees, room types, owner contact and survey request.
- Account registration/login supports student and owner roles. Favorites persist per student.
- Students can submit complaints and see their status; owners can update complaints only for their own properties.
- Owner dashboard shows property, room and occupancy totals, monthly payment totals, editable listing information and room availability, tenant/payment records and survey inquiries.
- Availability updates propagate to open clients through a server-sent events stream; reconnect and normal fetch remain available.
- Demo data and clearly labeled demo accounts make the app reviewable locally. All listing and tenant data is illustrative, and room images are illustrative.

## Architecture

React with TypeScript and Vite, React Router and Lucide icons. FastAPI exposes JSON endpoints under `/api`. SQLite persists accounts, properties, favorites, inquiries, complaints, tenants, payments and expiring sessions. Passwords use salted PBKDF2; sessions use random tokens held in HttpOnly cookies. Vite proxies API requests locally. The Python server serves the production React build when present.

## Data constraints

Prices are nonnegative integer rupiah. Available rooms cannot exceed total rooms or be negative. Payment and complaint records are authorized through property ownership. Account email is unique and case-insensitive. Private endpoints return 401 when signed out and 403 for a disallowed role. User input is validated by the server.

## Boundaries

No real inventory is claimed. No online payment processing, paid subscriptions, automatic WhatsApp messages or email delivery is performed. Contact opens a user-initiated WhatsApp link. Survey requests are saved in the owner dashboard. Tenant payments are manual bookkeeping. Move-in filtering uses the property's available-from date. Seed contacts use a number supplied by the user in their own listing; demo contact is explicitly illustrative.

## Verification

API integration tests cover search/filtering, signup/session, authorization, persistent favorites, inquiries, complaints, ownership, availability bounds and payments. TypeScript and production build must pass. Browser checks cover desktop/mobile discovery, detail, login/favorite and owner changes. README provides standard setup plus demo credentials.
