# Threads API Testing Guide

To test posting on Threads without spamming your personal account, use a dedicated test account registered as a **Threads Tester**.

## 1. Create a Dedicated Test Account
Create a new Threads account (e.g., `@postmill_test`). 
*   **Pro Tip:** Set this account to **Private** to verify success without public noise.

## 2. Add as a Threads Tester
1.  Go to the [Meta App Dashboard](https://developers.facebook.com/).
2.  Navigate to **App Roles** > **Roles**.
3.  Scroll to **Threads Testers** and click **Add People**.
4.  Enter the Threads username and submit.

## 3. Accept the Invitation (Required)
1.  Log into the **test account** on Threads.
2.  Go to **Settings** > **Account** > **Website permissions** > **Invites**.
3.  Accept the invitation.

## 4. Generate & Exchange Tokens
1.  **Get a short-lived token:** Use the [Graph API Explorer](https://developers.facebook.com/tools/explorer/) with `threads_content_publish`.
2.  **Make it long-lived:**
    ```bash
    THREADS_APP_SECRET=your_secret bun exchange_threads_token.ts
    ```
3.  **Update `.env`:** Save the long-lived token and the test account's `USER_ID`.
