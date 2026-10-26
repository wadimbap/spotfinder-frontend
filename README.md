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
- Editable display name and explicit primary activity reset
- Interactive spots map
- Spot details panel
- My spots page with Approved/Pending statuses
- Editing own pending spots, including location selection on a map
- Photo upload retries and deletion according to user permissions
- Explicit approved spot creation for moderators and administrators
- Full moderation cards with photos and comments
- Confirmed administrator spot deletion
- Threaded comments, replies, and editing of own comments
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

Run component and contract tests:

```bash
npm test
```

Tests use Vitest, React Testing Library, and mocked API responses. They cover role-based
actions, validation, failed requests, upload retries, and comment threads. They do not
replace integration testing with a running PostgreSQL/MinIO backend.

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

## Appearance

The theme control is available in the application header and on the login and registration
pages. Choose **System**, **Light**, or **Dark**. System is the default and follows changes
to the operating system's color scheme. A manual preference is saved locally in the browser
under `spotfinder.theme`. Theme switching also works for the current visit if that storage
is unavailable.

Theme and primary activity use the same rounded dropdown control. Arrow keys navigate,
Enter selects, and Escape dismisses without changing the selection. The activity dropdown
keeps **Not selected** for clearing the profile's activity when the profile is saved.

Both the main map and location pickers keep their existing OpenStreetMap tile source.
Dark mode applies a CSS filter to the raster tile pane only; markers, controls, and photos
retain their own colors. No additional map provider, API key, or subscription is required.

My spots cards load their covers as they enter the viewport. The cover is the earliest
photo by `createdAt`, with `id` used to break ties. Missing or unavailable photos use a
placeholder without blocking the card's actions. Spot details reuse the gallery's loaded
photos for their larger cover. Uploads and deletions refresh mounted list covers.

Photo galleries use three-column thumbnails, corner delete controls with confirmation,
and an **Add photos** tile. Upload and Cancel appear only after files are selected.
The full-screen viewer closes on its backdrop, close button, or Escape, restores focus,
and keeps the underlying spot card open. Nested dialogs share a scroll lock so closing
either layer cannot leave the page permanently locked.

## Main Routes

```text
/login
/register
/profile
/spots
/my-spots
/admin/spots
```

`/my-spots` includes all of the current user's spots. Only Pending spots can be edited.
The editor lets the owner change details and pick a new location on a map.

MODERATOR and ADMIN users have a separate **Create approved spot** action. The ordinary
**Add spot** flow always submits the spot for moderation. Only ADMIN can delete a spot;
photo deletion is available to the photo author, MODERATOR, and ADMIN.

Comments use the existing `/api/v1/comment` API. Replies preserve their parent ID,
only the comment author can edit text, and the maximum comment length is 3000 characters.
An **Edited** badge uses `editedAt`, with the edit time in its tooltip. Responses from
older servers without this field retain the timestamp-based indicator. The delete icon
is available only to the comment author, moderators, and administrators. Deletion requires
confirmation and reloads the discussion from the server to preserve replies and reflect
pruned branches. Deleted parents show a placeholder with no reply, edit, or delete actions.
An unsent root-comment draft survives deletion confirmation and discussion refresh retries.

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
