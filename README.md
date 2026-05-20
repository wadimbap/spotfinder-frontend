# SpotFinder Frontend

Frontend application for SpotFinder — a map-based service for finding and adding skate spots.

The app provides authentication, user profile management, an interactive spot map, spot creation flow, and integration with the SpotFinder backend API.

## Tech Stack

- React
- TypeScript
- Vite
- React Router
- Axios
- Leaflet / React Leaflet
- Docker
- Nginx
- Gitea Actions

## Features

- User registration and login
- JWT-based authentication
- Protected application routes
- User profile page
- Editable primary activity
- Interactive spots map
- Spot details panel
- Spot creation directly from the map
- Spot metadata loading from backend
- Stage deployment with Docker and Gitea Actions

## Project Structure

```text
src/
  app/
    App.tsx
    router.tsx

  features/
    auth/
      authApi.ts
      authTypes.ts
      LoginPage.tsx
      RegisterPage.tsx

    profile/
      ProfilePage.tsx

    spots/
      SpotsPage.tsx
      SpotsMap.tsx
      CreateSpotPanel.tsx
      SpotDetailsPanel.tsx
      spotsApi.ts
      spotsTypes.ts

  shared/
    api/
      apiClient.ts

    auth/
      RequireAuth.tsx
      tokenStorage.ts

    map/
      leafletIcon.ts
```

## Environment Variables

Create `.env.local` for local development:

```env
VITE_API_BASE_URL=http://localhost:8080
```

For stage build:

```env
VITE_API_BASE_URL=http://stage-api.deployflow.ru
```

Vite exposes only variables with the `VITE_` prefix to the browser.

## Local Development

Install dependencies:

```bash
npm install
```

Start local frontend:

```bash
npm run dev
```

Frontend will be available at:

```text
http://localhost:5173
```

The backend should be running at:

```text
http://localhost:8080
```

## Available Scripts

Start the Vite development server:

```bash
npm run dev
```

Build the production frontend bundle:

```bash
npm run build
```

Run a local preview of the production build:

```bash
npm run preview
```

Run ESLint checks:

```bash
npm run lint
```

## Docker Build

Build stage image manually:

```bash
docker build --build-arg VITE_API_BASE_URL=http://stage-api.deployflow.ru -t spotfinder-frontend:stage .
```

Run locally:

```bash
docker run --rm -p 3000:80 spotfinder-frontend:stage
```

Open:

```text
http://localhost:3000
```

## Stage Deployment

Stage deployment is handled by Gitea Actions.

Pipeline file:

```text
.gitea/workflows/stage.yml
```

Stage container:

```text
spotfinder-stage-frontend
```

Stage Docker image:

```text
spotfinder-frontend:stage
```

Stage network:

```text
spotfinder-stage-net
```

Frontend stage URL:

```text
http://stage.deployflow.ru
```

Backend stage API URL:

```text
http://stage-api.deployflow.ru
```

## Stage Access

Stage services are available through VPN.

Windows hosts example:

```text
10.8.0.1 stage.deployflow.ru
10.8.0.1 stage-api.deployflow.ru
10.8.0.1 gitea.deployflow.ru
```

After editing hosts:

```powershell
ipconfig /flushdns
```

## API Integration

The frontend communicates with backend through Axios client:

```text
src/shared/api/apiClient.ts
```

The API base URL is configured through:

```text
VITE_API_BASE_URL
```

Authenticated requests use JWT Bearer token.

## Main Routes

```text
/login
/register
/profile
/spots
/admin/spots
```

`/spots` is the main map page. Spot creation is handled inside the same page through the `Add spot` panel.

## Description

```text
React/Vite frontend for SpotFinder — a map-based skate spot discovery app with authentication, spot creation, and stage deployment.
```

## Tags

```text
react
typescript
vite
leaflet
react-leaflet
axios
react-router
docker
nginx
gitea-actions
jwt-auth
openstreetmap
map-app
skateboarding
spotfinder
```