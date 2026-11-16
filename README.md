# Voice Expense

A voice-first expense tracker. Tap an iOS shortcut, say "50 rupees for chai", and it is saved to your
account. The web app shows each month's spending, categories, budgets and trends.

See [SETUP.md](SETUP.md) for running, deploying and building the shortcut.

- `lib/parse.ts` turns a spoken sentence into expenses
- `lib/keywords.ts` is the Indian word list used for categories
- `app/api/log` is the endpoint the shortcut calls
- `app/` holds the screens
