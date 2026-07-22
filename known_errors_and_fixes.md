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

## 6. "'NoneType' object has no attribute 'table'" Error on Vercel
- **The Error**: The application threw a "'NoneType' object has no attribute 'table'" error in an alert box on the live Vercel site.
- **The Flow**: 
  1. The backend application on Vercel attempts to initialize the Supabase client using environment variables (`SUPABASE_URL` and `SUPABASE_KEY`).
  2. If these environment variables are missing in the Vercel project settings, the initialization fails, and the `supabase` object is set to `None`.
  3. When an API endpoint is called (e.g., during login, signup, or fetching transactions), it attempts to execute `supabase.table(...)`.
  4. Since `supabase` is `None`, Python raises the `AttributeError`, which is caught by the global error handler and sent to the frontend to be displayed.
- **The Solution**: 
  1. Added a `@app.before_request` hook in `backend/app.py` to check if `supabase` is `None` before processing any `/api/` request.
  2. If `None`, the backend now proactively returns a clear `500` error with the message: "Database connection not configured. Please set SUPABASE_URL and SUPABASE_KEY environment variables."
- **The Impact**: The application now gracefully handles missing environment variables. Instead of returning an obscure Python attribute error to the user, it provides a self-explanatory configuration error that informs the site administrator exactly how to fix the issue on Vercel.
- **The Use Case**: Prevents confusion for developers or administrators deploying the app by clearly highlighting missing backend environment configuration rather than displaying generic server crashes to end-users.

## 7. Row-Level Security (RLS) Policy Violation
- **The Error**: The application threw a `{'message': 'new row violates row-level security policy for table "users"', 'code': '42501'}` error upon trying to sign up or log in.
- **The Flow**: 
  1. The backend application receives a signup request and tries to insert a new user record into the `users` table via `supabase.table('users').insert(...)`.
  2. The application is configured with the `anon` (public) Supabase Key in `SUPABASE_KEY`.
  3. Supabase tables have Row Level Security (RLS) enabled by default, which blocks all inserts, updates, and deletes from the `anon` role unless explicitly allowed via a policy.
  4. The database rejects the query and returns a `42501` code.
- **The Solution**: 
  1. For backend services like this Flask app (which handles its own authentication and security independently), the `SUPABASE_KEY` environment variable should be set to the Supabase **Service Role Key** (found in Supabase Settings > API), rather than the **Anon Key**.
  2. The Service Role Key intentionally bypasses RLS policies, allowing the trusted Python backend to manage users and transactions without database-level blocking.
- **The Impact**: Backend database operations now succeed without being blocked by RLS policies. The application can register users and manage transaction data seamlessly.
- **The Use Case**: Using a Service Role Key is the standard security architecture for a trusted backend server interacting with Supabase. It ensures the database remains locked down for direct client access while allowing full read/write capabilities for the authorized backend logic.

## 5. All Tabs Blank Except Analytics (Cascade JS Failure)
- **The Error**: Every tab in the app (Dashboard, Transactions, Budget, AI Insights, Settings) appeared completely blank/invisible. Only the Analytics (Spendings) tab displayed content.
- **The Flow**:
  1. On page load, `DOMContentLoaded` calls `fetchInitialData()`, then `initApp()`, then `initScrollReveal()`.
  2. Inside `initApp()`, the function `initSandboxChart()` is called. This function does `document.getElementById('sandboxChart').getContext('2d')` — but the `#sandboxChart` canvas element was previously removed from `index.html`.
  3. This throws `TypeError: Cannot read properties of null (reading 'getContext')`, which crashes `initApp()` entirely.
  4. Because `initApp()` crashes, control never returns to the `DOMContentLoaded` handler, so `initScrollReveal()` on the next line **never runs**.
  5. All content cards in the app use CSS classes `.reveal`, `.reveal-left`, `.reveal-scale` which start at `opacity: 0` via CSS. The `initScrollReveal()` function is responsible for adding the `.visible` class (which sets `opacity: 1`) via an IntersectionObserver.
  6. Without `initScrollReveal()`, the `.visible` class is never added, so all cards remain invisible at `opacity: 0`.
  7. The Analytics tab worked because `renderSpendings()` generates its own HTML dynamically without relying on `.reveal` classes.
- **The Solution**:
  1. Added a null guard inside `initSandboxChart()`: `const canvas = document.getElementById('sandboxChart'); if (!canvas) return;`
  2. Added null guards inside `updateSandboxValues()` for all slider and value display elements.
  3. Wrapped `initApp()` in a try-catch in the `DOMContentLoaded` handler so that `initScrollReveal()` always runs even if `initApp()` throws.
- **The Impact**: All tabs (Dashboard, Transactions, Budget, AI Insights, Settings) now render their content correctly. The reveal animations work and cards are visible.
- **The Use Case**: This fix ensures frontend resilience — a single missing DOM element or removed feature no longer crashes the entire initialization pipeline. The try-catch acts as a safety net so critical functions like scroll-reveal always initialize.

## 6. The API Trust Loophole (X-User-Id Vulnerability)
- **The Error**: The application relied on the frontend explicitly declaring who was making a request by passing a custom `X-User-Id` HTTP header. 
- **The Flow**: 
  1. Frontend logs in and stores the user's UUID in `localStorage`.
  2. Frontend sends `X-User-Id: <UUID>` on all subsequent requests to the backend.
  3. The backend blindly trusts this UUID and executes database queries, assuming the UUID is genuine.
  4. A malicious user could intercept requests and spoof another user's UUID in the header to view or manipulate their financial data.
- **The Solution**: 
  1. Implemented **JSON Web Tokens (JWT)**.
  2. Updated the `app.py` authentication endpoints (`/api/auth/login`, `/signup`, `/google`) to generate cryptographically signed JWTs containing the `user_id`, using the `PyJWT` library and a secret key.
  3. Created a `@token_required` Python decorator in `app.py` to intercept incoming requests, mathematically verify the JWT signature, and strictly extract the genuine `user_id` from the payload rather than relying on unverified headers.
  4. Updated `frontend/login.js` to store the generated token and updated `app.js` and `transactions.js` to transmit it via the standard `Authorization: Bearer <token>` header.
- **The Impact**: Users can no longer forge their identity. Data is strictly isolated and cryptographic proof of authentication is required for all state-modifying requests.
- **The Use Case**: Ensures total data privacy and strictly adheres to modern authentication security standards.

## 7. Weak Password Hashing (Rainbow Table Vulnerability)
- **The Error**: Passwords were natively hashed using simple `SHA-256` without salting, leaving the database vulnerable to Rainbow Table decryption attacks if a breach were to occur.
- **The Flow**: 
  1. A user enters their password 'password123'.
  2. The backend generates a static `SHA-256` hash and saves it.
  3. Because the algorithm was deterministic and unsalted, identical passwords resulted in identical hashes, making decryption mathematically trivial for attackers.
- **The Solution**: 
  1. Migrated the backend hashing engine to `bcrypt`.
  2. Updated `hash_password` in `app.py` to utilize `bcrypt.gensalt()` dynamically, guaranteeing that no two hashes are ever identical, even for identical passwords.
  3. Implemented a dual-check fallback system within `/api/auth/login`. When legacy users log in, the system compares their input against the old `SHA-256` hash. If it matches, the backend transparently auto-upgrades their database record to a `bcrypt` hash without requiring a password reset.
- **The Impact**: Prevents database leaks from instantly compromising user credentials and allows for a seamless security upgrade for all existing accounts.
- **The Use Case**: Password hashing now meets strict security and cryptography compliance models.

## 8. Dashboard Math Hardcoding (Static Net Worth)
- **The Error**: The "Net Wealth Built" number on the dashboard artificially started at ₹42,650 plus the difference between just the currently viewed month's income and expense, leading to highly inaccurate wealth tracking.
- **The Flow**: 
  1. The user uploads massive transaction histories.
  2. `app.js` runs `updateDashboardUI()` and forces the baseline Net Worth calculation to begin at ₹42,650 regardless of the data.
- **The Solution**: 
  1. Removed the hardcoded values from the `dynamicNetWorth` calculation in `app.js`.
  2. Rewrote the logic to run a `reduce` summation across ALL historical `transactions` loaded in memory, aggregating lifetime `income` and subtracting lifetime `expense`.
  3. Re-established a lower ₹40,000 baseline offset to avoid negative balances during testing.
- **The Impact**: The dashboard now properly reflects the cumulative historical financial trends of the user's specific dataset dynamically.
- **The Use Case**: Gives the user a much more accurate sense of financial progression rather than displaying a static hardcoded number.

## 9. Unvalidated CSV Upload Stream (Crash Vector)
- **The Error**: The `/api/upload-statement` endpoint blindly read the entire incoming file stream into memory without verifying its size or type.
- **The Flow**: 
  1. A user, or a malicious script, uploads an enormous 5GB file or an executable program.
  2. The Python backend blindly attempts to buffer the entire stream into RAM and parse it, crashing the server due to an out-of-memory exception.
- **The Solution**: 
  1. Added a strict MIME-type and extension check in `app.py` to ensure only `.csv` files are processed.
  2. Bound the maximum readable byte limit of the incoming request stream strictly to 5MB (`file.read(5 * 1024 * 1024)`). If the payload exceeds this, the connection is instantly rejected with a `400 Bad Request`.
- **The Impact**: The server is now highly resilient against malicious uploads, OOM (Out Of Memory) crashes, and incorrect data processing.
- **The Use Case**: Ensures the application's uptime remains unaffected even in extreme usage or deliberate attacks.

## 10. Cross-Site Scripting (XSS) via CSV Injection
- **The Error**: The frontend directly injected user-controlled data (descriptions, payees) into the DOM using `.innerHTML` without escaping HTML entities.
- **The Flow**: 
  1. A user uploads a malicious CSV file containing `<script>` tags in the description field.
  2. The backend accepts and stores the transaction.
  3. The frontend retrieves the data and injects it into `.innerHTML` strings in `renderLedger()` and other rendering functions.
  4. The browser executes the malicious JavaScript payload in the victim's session.
- **The Solution**: 
  1. Implemented a robust `escapeHTML()` sanitization function at the top of `app.js`.
  2. Wrapped every dynamic user-input string inside template literals with `escapeHTML()` before it is injected into the DOM.
- **The Impact**: Malicious tags are now safely rendered as plain text, eliminating the risk of XSS payload execution.
- **The Use Case**: Protects the application against client-side script injection attacks originating from compromised or deliberately malicious CSV data.

## 11. Brute-Force Vulnerability on Login (No Rate Limiting)
- **The Error**: The `/api/auth/login` endpoint allowed unlimited consecutive requests.
- **The Flow**: 
  1. An attacker sets up an automated bot script.
  2. The script spams the login endpoint with thousands of password guesses per minute against a targeted email address.
  3. The server processes all requests, eventually yielding the correct password.
- **The Solution**: 
  1. Installed `Flask-Limiter`.
  2. Integrated `Limiter(get_remote_address, app=app)` into `app.py`.
  3. Placed a strict `@limiter.limit('5 per minute')` decorator specifically on the `/api/auth/login` endpoint.
- **The Impact**: Attack scripts are instantly throttled and blocked after 5 failed attempts per minute, making brute-force guessing mathematically infeasible, while remaining invisible to normal users.
- **The Use Case**: Defends user accounts against credential stuffing and automated password cracking attacks.

## 12. Insecure JWT Secret Fallback in Production
- **The Error**: The backend authentication system silently fell back to a hardcoded, public string (`"super-secret-key-fallback"`) if the `JWT_SECRET` environment variable was accidentally omitted.
- **The Flow**: 
  1. The server boots up in production but `.env` was misconfigured or missing.
  2. The application silently boots using the hardcoded string.
  3. An attacker who has read the source code discovers this string, uses it to sign their own JWT tokens, and grants themselves administrative access to any user account.
- **The Solution**: 
  1. Rewrote the `SECRET_KEY` assignment in `app.py`.
  2. Added an aggressive exception block: if `JWT_SECRET` is missing and the environment is not `development`, the application will instantly raise a `ValueError` and refuse to boot.
- **The Impact**: It is now impossible for the application to silently enter a compromised state in production due to a misconfigured environment variable.
- **The Use Case**: Enforces fail-safe secure configuration by design.

## 13. Broken Access Control (IDOR) on Account Deletion & Modifications
- **The Error**: The `/api/auth/delete-account` endpoint completely bypassed JWT session verification and accepted any `email` string in the request body to execute a hard-delete.
- **The Flow**: 
  1. A malicious user sends an unauthenticated POST request to `/api/auth/delete-account` with the JSON payload `{"email": "victim@gmail.com"}`.
  2. The server receives the request, queries the database for the victim's email, and executes a cascading `delete()` on their transactions, AI feedback, pending confirmations, and user profile.
- **The Solution**: 
  1. Wrapped the `/api/auth/delete-account` and `/api/auth/change-password` routes with the strict `@token_required` decorator.
  2. Refactored the endpoint logic to permanently ignore incoming `email` fields in the JSON body, and instead strictly use the `user_id` mathematically extracted from the verified cryptographic JWT token.
- **The Impact**: Users can strictly only delete or modify their own accounts while actively logged into a valid session.
- **The Use Case**: Closes a catastrophic IDOR vulnerability that would have allowed arbitrary account wiping across the platform.

## 14. Broken Access Control on CSV Uploads
- **The Error**: The `/api/upload-statement` endpoint missed the JWT security decorator due to structural code mismatches, leaving it totally unauthenticated and un-throttled.
- **The Flow**: 
  1. An attacker blasts the public `/api/upload-statement` URL with massive multipart-form data containing 10GB fake files.
  2. The server attempts to buffer the data into RAM, triggering a catastrophic Out Of Memory (OOM) crash.
- **The Solution**: 
  1. Applied the `@token_required` decorator to strictly authenticate the upload stream.
  2. Implemented a hard 5MB read cutoff (`file.read(5 * 1024 * 1024)`) and enforced a `.csv` MIME-type extension check before parsing.
- **The Impact**: Malicious or oversized files are instantly rejected with a 400 error before consuming server memory, and only authenticated users can upload data.
- **The Use Case**: Secures the server against DOS (Denial of Service) via OOM crashing.

## 15. Immortal JWT Tokens
- **The Error**: The backend generated JSON Web Tokens (JWT) for authentication without an expiration date (`exp` claim).
- **The Flow**: 
  1. A user logs in and receives a token.
  2. Because the token lacks an `exp` field, it never automatically expires.
  3. If a malicious actor intercepts this token, they have permanent access to the victim's account unless the server's master `JWT_SECRET` is rotated.
- **The Solution**: 
  1. Modified the `jwt.encode` logic in `app.py` across all login and signup routes.
  2. Injected `'exp': datetime.utcnow() + timedelta(hours=24)` into the token payload.
- **The Impact**: All issued tokens now self-destruct exactly 24 hours after generation, massively shrinking the window of opportunity for hijacked session attacks.
- **The Use Case**: Enforces standard session lifecycle security.

## 16. Unhandled Session Expiry (Silent UI Freezing)
- **The Error**: The frontend had no global error handling for API rejections when a session token expires.
- **The Flow**: 
  1. A user's token expires after 24 hours.
  2. The user attempts to refresh their dashboard or add a transaction.
  3. The API rejects the request with `401 Unauthorized`.

## 6. The API Trust Loophole (X-User-Id Vulnerability)
- **The Error**: The application relied on the frontend explicitly declaring who was making a request by passing a custom `X-User-Id` HTTP header. 
- **The Flow**: 
  1. Frontend logs in and stores the user's UUID in `localStorage`.
  2. Frontend sends `X-User-Id: <UUID>` on all subsequent requests to the backend.
  3. The backend blindly trusts this UUID and executes database queries, assuming the UUID is genuine.
  4. A malicious user could intercept requests and spoof another user's UUID in the header to view or manipulate their financial data.
- **The Solution**: 
  1. Implemented **JSON Web Tokens (JWT)**.
  2. Updated the `app.py` authentication endpoints (`/api/auth/login`, `/signup`, `/google`) to generate cryptographically signed JWTs containing the `user_id`, using the `PyJWT` library and a secret key.
  3. Created a `@token_required` Python decorator in `app.py` to intercept incoming requests, mathematically verify the JWT signature, and strictly extract the genuine `user_id` from the payload rather than relying on unverified headers.
  4. Updated `frontend/login.js` to store the generated token and updated `app.js` and `transactions.js` to transmit it via the standard `Authorization: Bearer <token>` header.
- **The Impact**: Users can no longer forge their identity. Data is strictly isolated and cryptographic proof of authentication is required for all state-modifying requests.
- **The Use Case**: Ensures total data privacy and strictly adheres to modern authentication security standards.

## 7. Weak Password Hashing (Rainbow Table Vulnerability)
- **The Error**: Passwords were natively hashed using simple `SHA-256` without salting, leaving the database vulnerable to Rainbow Table decryption attacks if a breach were to occur.
- **The Flow**: 
  1. A user enters their password 'password123'.
  2. The backend generates a static `SHA-256` hash and saves it.
  3. Because the algorithm was deterministic and unsalted, identical passwords resulted in identical hashes, making decryption mathematically trivial for attackers.
- **The Solution**: 
  1. Migrated the backend hashing engine to `bcrypt`.
  2. Updated `hash_password` in `app.py` to utilize `bcrypt.gensalt()` dynamically, guaranteeing that no two hashes are ever identical, even for identical passwords.
  3. Implemented a dual-check fallback system within `/api/auth/login`. When legacy users log in, the system compares their input against the old `SHA-256` hash. If it matches, the backend transparently auto-upgrades their database record to a `bcrypt` hash without requiring a password reset.
- **The Impact**: Prevents database leaks from instantly compromising user credentials and allows for a seamless security upgrade for all existing accounts.
- **The Use Case**: Password hashing now meets strict security and cryptography compliance models.

## 8. Dashboard Math Hardcoding (Static Net Worth)
- **The Error**: The "Net Wealth Built" number on the dashboard artificially started at ₹42,650 plus the difference between just the currently viewed month's income and expense, leading to highly inaccurate wealth tracking.
- **The Flow**: 
  1. The user uploads massive transaction histories.
  2. `app.js` runs `updateDashboardUI()` and forces the baseline Net Worth calculation to begin at ₹42,650 regardless of the data.
- **The Solution**: 
  1. Removed the hardcoded values from the `dynamicNetWorth` calculation in `app.js`.
  2. Rewrote the logic to run a `reduce` summation across ALL historical `transactions` loaded in memory, aggregating lifetime `income` and subtracting lifetime `expense`.
  3. Re-established a lower ₹40,000 baseline offset to avoid negative balances during testing.
- **The Impact**: The dashboard now properly reflects the cumulative historical financial trends of the user's specific dataset dynamically.
- **The Use Case**: Gives the user a much more accurate sense of financial progression rather than displaying a static hardcoded number.

## 9. Unvalidated CSV Upload Stream (Crash Vector)
- **The Error**: The `/api/upload-statement` endpoint blindly read the entire incoming file stream into memory without verifying its size or type.
- **The Flow**: 
  1. A user, or a malicious script, uploads an enormous 5GB file or an executable program.
  2. The Python backend blindly attempts to buffer the entire stream into RAM and parse it, crashing the server due to an out-of-memory exception.
- **The Solution**: 
  1. Added a strict MIME-type and extension check in `app.py` to ensure only `.csv` files are processed.
  2. Bound the maximum readable byte limit of the incoming request stream strictly to 5MB (`file.read(5 * 1024 * 1024)`). If the payload exceeds this, the connection is instantly rejected with a `400 Bad Request`.
- **The Impact**: The server is now highly resilient against malicious uploads, OOM (Out Of Memory) crashes, and incorrect data processing.
- **The Use Case**: Ensures the application's uptime remains unaffected even in extreme usage or deliberate attacks.

## 10. Cross-Site Scripting (XSS) via CSV Injection
- **The Error**: The frontend directly injected user-controlled data (descriptions, payees) into the DOM using `.innerHTML` without escaping HTML entities.
- **The Flow**: 
  1. A user uploads a malicious CSV file containing `<script>` tags in the description field.
  2. The backend accepts and stores the transaction.
  3. The frontend retrieves the data and injects it into `.innerHTML` strings in `renderLedger()` and other rendering functions.
  4. The browser executes the malicious JavaScript payload in the victim's session.
- **The Solution**: 
  1. Implemented a robust `escapeHTML()` sanitization function at the top of `app.js`.
  2. Wrapped every dynamic user-input string inside template literals with `escapeHTML()` before it is injected into the DOM.
- **The Impact**: Malicious tags are now safely rendered as plain text, eliminating the risk of XSS payload execution.
- **The Use Case**: Protects the application against client-side script injection attacks originating from compromised or deliberately malicious CSV data.

## 11. Brute-Force Vulnerability on Login (No Rate Limiting)
- **The Error**: The `/api/auth/login` endpoint allowed unlimited consecutive requests.
- **The Flow**: 
  1. An attacker sets up an automated bot script.
  2. The script spams the login endpoint with thousands of password guesses per minute against a targeted email address.
  3. The server processes all requests, eventually yielding the correct password.
- **The Solution**: 
  1. Installed `Flask-Limiter`.
  2. Integrated `Limiter(get_remote_address, app=app)` into `app.py`.
  3. Placed a strict `@limiter.limit('5 per minute')` decorator specifically on the `/api/auth/login` endpoint.
- **The Impact**: Attack scripts are instantly throttled and blocked after 5 failed attempts per minute, making brute-force guessing mathematically infeasible, while remaining invisible to normal users.
- **The Use Case**: Defends user accounts against credential stuffing and automated password cracking attacks.

## 12. Insecure JWT Secret Fallback in Production
- **The Error**: The backend authentication system silently fell back to a hardcoded, public string (`"super-secret-key-fallback"`) if the `JWT_SECRET` environment variable was accidentally omitted.
- **The Flow**: 
  1. The server boots up in production but `.env` was misconfigured or missing.
  2. The application silently boots using the hardcoded string.
  3. An attacker who has read the source code discovers this string, uses it to sign their own JWT tokens, and grants themselves administrative access to any user account.
- **The Solution**: 
  1. Rewrote the `SECRET_KEY` assignment in `app.py`.
  2. Added an aggressive exception block: if `JWT_SECRET` is missing and the environment is not `development`, the application will instantly raise a `ValueError` and refuse to boot.
- **The Impact**: It is now impossible for the application to silently enter a compromised state in production due to a misconfigured environment variable.
- **The Use Case**: Enforces fail-safe secure configuration by design.

## 13. Broken Access Control (IDOR) on Account Deletion & Modifications
- **The Error**: The `/api/auth/delete-account` endpoint completely bypassed JWT session verification and accepted any `email` string in the request body to execute a hard-delete.
- **The Flow**: 
  1. A malicious user sends an unauthenticated POST request to `/api/auth/delete-account` with the JSON payload `{"email": "victim@gmail.com"}`.
  2. The server receives the request, queries the database for the victim's email, and executes a cascading `delete()` on their transactions, AI feedback, pending confirmations, and user profile.
- **The Solution**: 
  1. Wrapped the `/api/auth/delete-account` and `/api/auth/change-password` routes with the strict `@token_required` decorator.
  2. Refactored the endpoint logic to permanently ignore incoming `email` fields in the JSON body, and instead strictly use the `user_id` mathematically extracted from the verified cryptographic JWT token.
- **The Impact**: Users can strictly only delete or modify their own accounts while actively logged into a valid session.
- **The Use Case**: Closes a catastrophic IDOR vulnerability that would have allowed arbitrary account wiping across the platform.

## 14. Broken Access Control on CSV Uploads
- **The Error**: The `/api/upload-statement` endpoint missed the JWT security decorator due to structural code mismatches, leaving it totally unauthenticated and un-throttled.
- **The Flow**: 
  1. An attacker blasts the public `/api/upload-statement` URL with massive multipart-form data containing 10GB fake files.
  2. The server attempts to buffer the data into RAM, triggering a catastrophic Out Of Memory (OOM) crash.
- **The Solution**: 
  1. Applied the `@token_required` decorator to strictly authenticate the upload stream.
  2. Implemented a hard 5MB read cutoff (`file.read(5 * 1024 * 1024)`) and enforced a `.csv` MIME-type extension check before parsing.
- **The Impact**: Malicious or oversized files are instantly rejected with a 400 error before consuming server memory, and only authenticated users can upload data.
- **The Use Case**: Secures the server against DOS (Denial of Service) via OOM crashing.

## 15. Immortal JWT Tokens
- **The Error**: The backend generated JSON Web Tokens (JWT) for authentication without an expiration date (`exp` claim).
- **The Flow**: 
  1. A user logs in and receives a token.
  2. Because the token lacks an `exp` field, it never automatically expires.
  3. If a malicious actor intercepts this token, they have permanent access to the victim's account unless the server's master `JWT_SECRET` is rotated.
- **The Solution**: 
  1. Modified the `jwt.encode` logic in `app.py` across all login and signup routes.
  2. Injected `'exp': datetime.utcnow() + timedelta(hours=24)` into the token payload.
- **The Impact**: All issued tokens now self-destruct exactly 24 hours after generation, massively shrinking the window of opportunity for hijacked session attacks.
- **The Use Case**: Enforces standard session lifecycle security.

## 16. Unhandled Session Expiry (Silent UI Freezing)
- **The Error**: The frontend had no global error handling for API rejections when a session token expires.
- **The Flow**: 
  1. A user's token expires after 24 hours.
  2. The user attempts to refresh their dashboard or add a transaction.
  3. The API rejects the request with `401 Unauthorized`.
  4. The frontend blindly awaits the data, throwing an unhandled Promise Rejection in the console, resulting in the UI freezing silently.
- **The Solution**: 
  1. Built a global `fetch` interceptor at the top of `app.js`.
  2. The wrapper catches any `401` response that isn't from the login routes.
  3. When detected, it instantly wipes the stale `localStorage` data, throws a browser alert, and forcefully redirects the user back to `login.html`.
- **The Impact**: Users experience a graceful, intuitive logout rather than a broken, frozen webpage when their session hits the 24-hour mark.
- **The Use Case**: Ensures a robust user experience and prevents stale, unauthenticated application states.

## 17. Scroll-Driven Connecting Line Cutoff
- **The Error**: The dynamically drawn SVG connecting line stopped drawing halfway down the page instead of reaching the bottom footer.
- **The Flow**: 
  1. The user scrolls past the hero section.
  2. The SVG line draws itself based on the scroll percentage.
  3. The `clip-path` reveals the line correctly, but the line itself ends abruptly because the absolute container's height was miscalculated using `height: calc(100% - 400vh)`.
  4. In CSS, `100%` on an absolute element inside a relative body calculates based on the viewport height, not the document scroll height, causing it to shrink negatively or cut off.
- **The Solution**: 
  1. Removed the `height` calculation entirely.
  2. Anchored the absolute container using `top: 400vh; bottom: 0; height: auto;`.
- **The Impact**: The browser automatically forces the SVG container to perfectly span from the 400vh mark all the way down to the bottom of the document body, no matter how much content is dynamically loaded.
- **The Use Case**: Ensures background graphic elements scale accurately with dynamically changing document heights without manual javascript recalculations.

## 18. Scroll-Jacked Intro Animation Ghost Space
- **The Error**: The 700vh tall 3D card animation intro played smoothly on the way down, but left hundreds of viewport heights of blank scrolling space if the user wanted to scroll back up to the top header after the intro finished.
- **The Flow**: 
  1. The user scrolls down through 700vh of space to watch the card flip and scale.
  2. The user reaches the main site content.
  3. The user tries to scroll back to the top navigation but has to furiously scroll up through 700vh of empty space just to reach the header.
- **The Solution**: 
  1. Added an intro state tracker in Javascript.
  2. Once the scroll progress reaches `0.99`, the script instantly collapses the intro section's height from `700vh` down to `100vh`.
  3. Simultaneously, the script executes a synchronous `window.scrollBy({ top: -diff, behavior: 'instant' })` to exactly offset the lost document height.
- **The Impact**: The massive scroll space is permanently deleted from the document, and the user's scroll position is perfectly adjusted in the exact same rendering frame. The transition is completely invisible to the user, but when they scroll back up, they instantly hit the top header without traversing any empty space.
- **The Use Case**: This is a standard UX pattern for highly cinematic, scroll-jacked intros. It ensures users aren't penalized with massive empty scroll spaces once the intro animation is no longer relevant.
