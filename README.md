# Sukoon PG Network app

Android app for managing the Sukoon PG Network across Delhi NCR:

- PG directory by locality, with rent, deposit, beds, terms, verification and the commission agreed with each owner
- Enquiry CRM with follow-ups, visits, bookings and commission received or pending
- "Send 3 best PGs" to a student on WhatsApp
- Dashboard by locality, Excel (CSV) export and full backup

Your data is stored in your own Firebase project, keeps working offline, and syncs when you're back online.

## Install on your phone

1. Open **Releases → Sukoon PG app (latest)** in this repo on your Android phone.
2. Tap **SukoonPG.apk** under Assets.
3. If Android asks, allow installing apps from your browser, then tap **Install**.

Every change pushed to `main` builds a new APK automatically (see the **Actions** tab). Installing a new build updates the app and keeps your data.

## One-time Firebase setup

1. In the Firebase console, open your project.
2. **Authentication → Sign-in method →** turn on **Email/Password**.
3. **Firestore Database → Rules →** paste the contents of `firestore.rules` and tap **Publish**.
4. Put your web app settings in `src/firebase-config.js`.

## Move data from the old web version

Use the `sukoon-backup` JSON file you were sent. In this app, open **Dashboard → Import backup** and pick that file.
