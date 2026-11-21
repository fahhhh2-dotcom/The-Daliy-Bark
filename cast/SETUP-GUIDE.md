# Cast setup guide

Cast is a social network website that you host yourself. It uses **Firebase**, a free Google service, to:

- sign people in with their Google account
- save every post, profile, like, reply, follow, repost, poll vote and bookmark
- store uploaded photos and videos (optional, step 6)

Setup takes about 15 minutes. You'll need a Google account and a GitHub account.

---

## The files

| File | What it is |
|---|---|
| `index.html` | The website page |
| `app.js` | Everything Cast does |
| `editor.js` | Filters, photo editor, camera and video compression |
| `manifest.webmanifest`, `sw.js`, icons | Let people install Cast on their phone or computer |
| `style.css` | How it looks |
| `firebase-config.js` | **You edit this file:** your Firebase settings go here |
| `firestore.rules` | Security rules for your data. Paste them into Firebase |
| `storage.rules` | Security rules for photos and videos. Paste them into Firebase |

---

## Step 1: Create a Firebase project

1. Go to **https://console.firebase.google.com** and sign in with Google.
2. Click **Create a project** (or **Add project**) and name it `pulse` or anything you like.
3. You can turn Google Analytics off. Click **Create project**.

## Step 2: Add a web app and copy its settings

1. On the project home page, click the **`</>`** (Web) icon.
2. Name it `Cast website`. Leave "Firebase Hosting" unchecked. Click **Register app**.
3. Firebase shows a block of code with `const firebaseConfig = { ... }`.
4. Open **`firebase-config.js`** and replace the placeholder values with yours: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` and `appId`.

> These values are *meant* to be public. Your security rules (step 5) are what protect the data.

## Step 3: Turn on Google sign-in

1. In the left menu, go to **Build → Authentication** and click **Get started**.
2. Under **Sign-in method**, click **Google**, switch it **on**, choose your support email and click **Save**.
3. Open the **Settings** tab, then **Authorized domains**, and click **Add domain**. Add the address your site will live at, for example:
   - `yourname.github.io` for GitHub Pages
   - your own domain, if you have one (like `skycastweather.com`)

   (`localhost` is already there for testing on your own computer.)

## Step 4: Create the database

1. Go to **Build → Firestore Database** and click **Create database**.
2. Pick a location close to you (for example `nam5 (United States)`) and click **Next**.
3. Choose **Start in production mode** and click **Create**.

## Step 5: Paste in the security rules (important!)

1. In Firestore Database, open the **Rules** tab.
2. Delete everything there, paste in the whole contents of **`firestore.rules`**, and click **Publish**.

These rules let anyone *read* posts, but only signed-in people can post, and only as themselves. Without them, posting fails with a "Not allowed" message.

## Step 6 (optional): Turn on photo and video uploads

Without this step, Cast still works: photos are saved smaller, and videos are compressed automatically and saved as pieces inside the free database (up to about 60 seconds each). Turning on Storage raises the video limit to 20 MB and saves photos at full quality.

Firebase only lets projects on the **Blaze (pay-as-you-go)** plan use file storage. Blaze still includes a free amount of usage each month, so a small site with friends usually costs **$0**, but Google requires a card on file.

1. Click **Upgrade** at the bottom of the left menu and choose **Blaze**. Tip: set a **budget alert** (for example $1) so you get an email if usage ever adds up.
2. Go to **Build → Storage**, click **Get started**, pick a location and choose **production mode**.
3. Open the Storage **Rules** tab, paste in the whole contents of **`storage.rules`**, and click **Publish**.
4. In **`firebase-config.js`**, change `storageEnabled = false` to `storageEnabled = true`.

## Step 7: Put it online with GitHub Pages

1. On GitHub, create a new repository, for example `pulse`. You can also add a `pulse` folder to an existing repo, the way your other sites are set up.
2. Upload all the files (`index.html`, `app.js`, `style.css`, `firebase-config.js`). The `.rules` files and this guide are optional.
3. In the repo, go to **Settings → Pages**. Under "Branch," choose `main` and `/ (root)`, then click **Save**.
4. After a minute your site will be live at `https://yourname.github.io/pulse/`.
5. Make sure `yourname.github.io` is in Firebase's **Authorized domains** (step 3).

> Cast must be opened from a web address (GitHub Pages or a local server). Double-clicking `index.html` won't work, because Google sign-in needs a real address.

## Step 8: Make yourself the admin (so you can moderate)

1. Visit your site, sign in with Google and create your account.
2. In Firebase, go to **Authentication → Users** and copy your **User UID**.
3. Go to **Firestore Database → Data** and click **+ Start collection**. Name it `admins`.
4. For the **Document ID**, paste your User UID. Add any field (for example `role` = `owner`) and click **Save**.

You'll now see a delete button on every post and reply, so you can remove anything that breaks your rules.

---

## Sharing links

- A post's **share** button copies a direct link to that post, like `…/pulse/#p-abc123`.
- Profiles have links like `…/pulse/#u-calvinopistorio`.

## Free limits (Spark plan)

Firebase's free plan includes 50,000 reads, 20,000 writes and 1 GB of database storage per day, which is plenty for a group of friends. You can watch usage under **Firestore → Usage**.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Almost there — connect Firebase" screen | Paste your settings into `firebase-config.js` (step 2) |
| Sign-in popup says *unauthorized domain* | Add your site's address under Authentication → Settings → Authorized domains |
| "Not allowed — check your security rules" | Publish `firestore.rules` (step 5) and `storage.rules` (step 6) |
| Video too big | Without Storage, videos must be under 8 MB. Trim them, or finish step 6 for 20 MB |
| Nothing happens when you open the file directly | Open it from GitHub Pages instead (step 7) |
