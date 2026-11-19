# BizTrack Frontend

This is a cleanup of the existing `src` folder.

## What changed
- Split the application shell into `components/layout/Sidebar.tsx`, `Topbar.tsx`, and `AppLayout.tsx`.
- Simplified `App.tsx` so it handles authentication state and page selection.
- Kept the existing page modules, API service, CSS, and asset files unchanged.
- Kept login and logout. No public signup was added.
- Kept the existing API base URL and token-based API request behavior.

## Important
This cleanup intentionally does not remove authentication or change backend permissions.
The page files are preserved as-is in this first pass to avoid breaking existing CRUD and analytics behavior.
The current Dashboard and Analytics & Reports menu items both show the existing Analytics page, matching the previous App.tsx behavior.

## Apply
1. Make a backup of your current `frontend/src` folder.
2. Replace the local `frontend/src` folder with the `src` folder in this ZIP.
3. From the `frontend` folder, run `npm run build`.
4. If the build succeeds, run `npm run dev` and test login plus each page before deploying.

Do not replace the deployed version until local testing succeeds.
