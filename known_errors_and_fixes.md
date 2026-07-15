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
