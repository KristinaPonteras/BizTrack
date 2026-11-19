# StoreFlow — five-module frontend

This ZIP contains the complete `src` folder based on the uploaded latest StoreFlow/BizTrack frontend.

## Main navigation (only five)
1. Dashboard
2. Products
3. Inventory
4. Sales
5. Analytics

## Where the smaller features went
- Categories is now a sub-section inside Products.
- Expenses is now a sub-section inside Analytics.
- The existing category and expense pages were preserved and are still connected to their existing API endpoints.
- User Management page file is retained in `pages/`, but it is no longer a main navigation item.

## Preserved
- Login and logout flow.
- Existing API service and `biztrack_token` local-storage key.
- Existing Laravel API endpoints and CRUD pages.
- Existing analytics calculations and charts.
- Existing database and backend are not modified.

## Install
1. Back up the current `frontend/src` folder.
2. Extract this ZIP.
3. Replace `frontend/src` with the ZIP's `src` folder.
4. From the `frontend` directory, run `npm run build`.
5. If the build succeeds, run `npm run dev` and test each of the five main modules.
6. Do not deploy until the local version has been checked.

Note: Dashboard and Analytics currently use the existing Analytics page; Dashboard is an overview entry point. Analytics includes the Analytics and Expenses sub-sections.
