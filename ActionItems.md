# Action Items

## Completed
- **Backend Refactoring**: Ported the more robust backend logic from `backend_1` (which supported game types, max players, and proper session management) to the main `backend` module.
- **Backend Standardization**: Standardized the backend to run on port 8080 and use the `com.example.game` package structure.
- **Dependency Management**: Added `jackson-databind` to `backend/pom.xml` to support JSON handling required by the new logic.
- **Backend Build Fix**: Added `maven-shade-plugin` to `backend/pom.xml` to allow building a fat JAR with `mvn package`.
- **Frontend Cleanup**: Deleted the unused and incompatible `frontend/src/App.jsx`, duplicate `vite.config.js`, and unused `.jsx` components.
- **Frontend Configuration**: Updated `frontend/src/hooks/useWebRTC.ts` to default to port 8080, matching the backend.
- **Frontend Fixes**: Fixed TypeScript errors in `frontend/src/hooks/useWebRTC.ts` and removed unused variables in components to ensure a clean build.

## Improvements Needed (Priority Order)
1.  **Add Backend Tests**: The backend currently has no unit tests. Tests should be added for `GameSession`, `SessionManager`, and `MainVerticle` logic.
2.  **Frontend Testing**: Implement frontend tests using Vitest or Jest to verify component behavior and WebRTC hooks.
3.  **Environment Configuration**: Create a `.env` file for the frontend to manage the WebSocket URL properly instead of relying on hardcoded fallbacks.
4.  **Error Handling**: Enhance error handling in the frontend to provide better user feedback for connection failures or game errors.
5.  **Code Cleanup**: Further cleanup of unused imports and variables in the frontend codebase.
6.  **CI/CD**: Set up a CI/CD pipeline to automatically build and test both backend and frontend.
