# Voice Expense: setup

## 1. Run it on your Mac

```bash
npm install
npm run dev
```

Open http://localhost:3000 and create an account. Data is kept in `local.db` in this folder.

## 2. Put it online

The shortcut on your phone needs a public address to send expenses to.

1. **Database (Turso, free tier).** Create an account at turso.tech, create a database, and copy its
   URL (`libsql://...`) and an auth token. The tables are created automatically on first use.
2. **Hosting (Vercel, free tier).** Push this folder to a GitHub repository, import it in Vercel, and
   add these environment variables before deploying:

   | Name | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | the `libsql://...` URL |
   | `TURSO_AUTH_TOKEN` | the Turso token |
   | `SIGNUP_CODE` | any word you choose; friends need it to create an account |
   | `SHORTCUT_URL` | the iCloud link from step 3 (add it after you have it, then redeploy) |

3. Open the Vercel address on your iPhone in Safari, then Share → **Add to Home Screen**.

## 3. Build the shortcut once

In the Shortcuts app tap **+** and add these four actions in order:

1. **Text**. Leave it empty for now. This will hold the personal code.
2. **Dictate Text**. Language: English (India). Stop Listening: After Pause.
3. **Get Contents of URL**
   - URL: `https://YOUR-APP.vercel.app/api/log`
   - Method: POST
   - Request Body: JSON, with two Text fields:
     - `code` → pick the **Text** variable from action 1
     - `text` → pick the **Dictated Text** variable
4. **Show Notification** (or **Speak Text**) with **Contents of URL**.

Name it "Log expense".

### Make it ask each person for their own code

1. Open the shortcut, tap the **ⓘ** button, then the **Setup** tab.
2. Tap **Add Question** and choose the **Text** action.
3. Question: `Paste your personal code from the app (Settings → Copy code)`. Leave the default answer empty.

### Share it

1. Make sure the **Text** action is empty, so your own code is not shared.
2. Share → **Copy iCloud Link**. Send that link over Messages or WhatsApp, and put it in `SHORTCUT_URL`.
3. For your own phone, open the same link, add the shortcut and paste your code when asked.

Each friend then does this:

1. Open the app address, create an account with the invite word.
2. Settings → **Copy code** → **Get the shortcut** → **Add Shortcut** → paste the code.
3. In Shortcuts, press and hold the shortcut → **Add to Home Screen**.

If a friend sees "can't be opened because of security settings", they need to run any shortcut once,
then turn on Settings → Shortcuts → Private Sharing (older iOS versions only).

## What you can say

| You say | What is saved |
|---|---|
| 50 rupees for chai | ₹50, Chai, Food & Drinks, today |
| 50 for chai and 120 for lunch | two expenses |
| yesterday 300 for petrol by UPI | dated yesterday, paid by UPI |
| 1.5k for shoes on 5th | ₹1,500, dated the 5th |
| undo | removes your last entry |

If no amount is heard, the sentence is still saved and the app asks you to add the amount.

## Categories

The word list is in `lib/keywords.ts` (about 1,090 words and phrases in 13 categories). Add a word to
any list to teach everyone's app. When a person changes an expense's category in the app, that item
is remembered for their account only.

## Things to know

- All dates use Indian time.
- There is no "forgot password" email. If a friend forgets their password, their account has to be
  reset in the database.
- A personal code works like a password for adding expenses. Anyone who leaks theirs can make a new
  one in Settings.
