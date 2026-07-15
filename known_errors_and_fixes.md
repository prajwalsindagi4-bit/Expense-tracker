# Known Errors and Fixes

## 1. Google Login Button Not Working
- **The Error**: Google login failed. The application was using a placeholder Client ID (`YOUR_GOOGLE_CLIENT_ID_HERE`) for Google Identity Services. Google requires a real, registered Client ID to authorize logins and verify the requesting website.
- **The Flow**: 
  1. The user navigates to the login page and clicks the "Log in with Google" social authentication button.
  2. The frontend Javascript (`login.js`) triggers the Google Identity Services token client via `tokenClient.requestAccessToken()`.
  3. The request is sent to Google's OAuth 2.0 servers, passing the `client_id` defined in the code (which was the default placeholder string `YOUR_GOOGLE_CLIENT_ID_HERE`).
  4. Google's servers receive the request, but fail to find a registered application matching that placeholder ID in their database.
  5. Google immediately rejects the authentication attempt to prevent unauthorized data access, causing the login flow to abruptly fail without showing the user the Google account selection popup.
- **The Solution**: 
  1. Created a new project in the Google Cloud Console.
  2. Configured the OAuth Consent Screen.
  3. Created OAuth 2.0 Client credentials (Web application) and authorized the local and live URLs (`http://localhost` and `https://expense-tracker-prajwal11.vercel.app`).
  4. Replaced the placeholder string in `frontend/login.js` with the real Client ID.
  5. Removed the hardcoded validation block in `frontend/login.js` that was checking for the placeholder string.
- **The Impact**: The Google login button now properly connects to Google Identity Services and can authorize real users seamlessly.
- **The Use Case**: 
  This setup is critical for modern web applications to provide a frictionless and secure user experience. By implementing Google Identity Services correctly:
  - Users do not need to create, remember, or reset a new password just for this specific expense tracker application, which significantly increases user sign-up and retention rates.
  - The application offloads the heavy lifting of security, password hashing, and brute-force protection directly to Google's highly secure authentication infrastructure.
  - The application can reliably pull verified profile information (like the user's real name and email address) to personalize their financial dashboard immediately upon their first visit.

## 2. "Failed to load Google login" Error on Vercel
- **The Error**: The application threw a "Failed to load Google login. Please try again later." alert when clicking the Google button on the live Vercel site.
- **The Flow**: User loads page -> `DOMContentLoaded` event fires -> Application immediately tries to initialize `tokenClient` using `window.google`, but the Google Identity Services script is still loading asynchronously over the network -> `window.google` is undefined, so `tokenClient` is skipped. When the user clicks the button, the app realizes `tokenClient` doesn't exist and throws the alert.
- **The Solution**: Moved the `tokenClient` initialization out of the `DOMContentLoaded` event and into the button's `click` event handler. By lazily initializing it only when the button is clicked, we guarantee the Google script has finished downloading.
- **The Impact**: The Google login button now works consistently on live deployed environments like Vercel, regardless of internet connection speeds.
- **The Use Case**: Prevents the user interface from breaking for users on slower network connections who might click the login button before all external third-party scripts have fully loaded.

## 3. Error 400: origin_mismatch (Google OAuth)
- **The Error**: Google blocks the login attempt with `Error 400: origin_mismatch`.
- **The Flow**: Developer pushes a new commit -> Vercel automatically generates a unique "preview branch" URL (e.g., `https://expense-tracker-git-main-prajwal11.vercel.app`) -> Developer tests Google Login on this preview URL -> Google checks the exact URL against the Authorized JavaScript origins list -> The preview URL is not on the list -> Google throws Error 400 and blocks the login.
- **The Solution**: Either test the login button exclusively on the main production URL (`https://expense-tracker-prajwal11.vercel.app`) OR go back to the Google Cloud Console (APIs & Services > Credentials > Web Client) and add the specific Vercel preview URL to the Authorized JavaScript origins list.
- **The Impact**: Aligns the Vercel branch preview deployment URLs with Google's strict security protocols, allowing OAuth testing on staging environments.
- **The Use Case**: Essential for securely testing authentication flows on preview/staging branches before merging code into the main production branch.

## 4. Lack of User Persistence and Backend Database
- **The Error**: The application lacked a real backend and database, meaning user accounts were entirely simulated. The browser would "forget" the user immediately after refreshing the page, and the Google Login button only triggered a visual animation without actually saving the user's data anywhere.
- **The Flow**: 
  1. The user manually signs up or logs in with Google.
  2. The frontend triggers the 3D card exit animation and redirects to the dashboard.
  3. Because the frontend didn't communicate with a backend or save any session state in the browser, the user was effectively anonymous.
  4. Upon refreshing the page, all context was lost, requiring the user to log in repeatedly.
- **The Solution**: 
  1. **Built a SQLite Database**: Updated the Flask backend (`backend/app.py`) to initialize a `users.db` SQLite database with a `users` table to store IDs, names, emails, and hashed passwords securely.
  2. **Created Auth API Endpoints**: Built three new HTTP POST endpoints on the backend (`/api/auth/signup`, `/api/auth/login`, and `/api/auth/google`) to handle user registration, credential verification, and OAuth bridging.
  3. **Connected the Frontend**: Modified the form submission listeners in `frontend/login.js` to send HTTP requests to these new backend endpoints instead of instantly playing the animation.
  4. **Implemented LocalStorage Sessions**: Instructed the frontend to save the securely verified user object (returned by the backend) into the browser's `localStorage` (`localStorage.setItem('user', JSON.stringify(data.user))`), allowing the browser to persistently remember the user across page reloads. The exit animation is now only triggered upon successful backend verification.
- **The Impact**: The application now features robust, secure, and persistent user authentication. The browser reliably remembers the user across sessions, and Google Logins are tied to genuine database accounts rather than just being a visual effect.
- **The Use Case**: This fundamental architectural shift guarantees that users can securely store their data and return to the application seamlessly without redundant logins. It establishes the foundational backend structure required to eventually assign personal, isolated financial transaction histories to each individual user.

## 5. Global Transaction State (Data Leakage Between Users)
- **The Error**: Transactions were stored in a global Python variable array in the backend (`transactions = []`), meaning every user who logged in saw the exact same dashboard and financial data. There was no isolation between different users' accounts.
- **The Flow**: 
  1. User A logs into their account on the frontend.
  2. The frontend sends a `GET /api/transactions` request.
  3. The backend returns the global `transactions` array. User A sees the data.
  4. User A simulates a new "Amazon Order". The backend adds it to the global array.
  5. User B logs into their entirely separate account.
  6. The frontend requests data, and User B sees User A's "Amazon Order" because the backend pulled from the exact same global memory.
- **The Solution**: 
  1. **Database Schema Upgrade**: Modified the SQLite database to include new `transactions` and `pending_confirmations` tables, both containing a critical `user_id` column.
  2. **API Context Injection**: Updated the frontend (`transactions.js`) to extract the currently logged-in user's ID from `localStorage` and inject it into the HTTP headers (`X-User-Id`) for every single API request.
  3. **Backend Filtering**: Rewrote the backend API endpoints (`/api/transactions`, `/api/transactions/simulate`, etc.) to intercept the `X-User-Id` header and execute targeted SQL queries (e.g., `SELECT * FROM transactions WHERE user_id = ?`) instead of reading from global memory.
  4. **Blank Slate Initialization**: Disabled the automatic mock data seeding so all newly registered users start with a clean, isolated $0.00 dashboard.
- **The Impact**: Transactions are now 100% isolated and strictly bound to the specific user who created them. Data leakage between accounts is completely eliminated.
- **The Use Case**: This is a mandatory security and functional requirement for any SaaS or personal finance application. It ensures data privacy, prevents unauthorized access to other people's finances, and allows the app to function correctly for multiple concurrent users.
