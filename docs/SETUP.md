# Setting up Hana's Garden

How to run the site, connect it to Google, and look after it. For what the site is and who it's for, see the [README](../README.md).

## Run it locally

```bash
npm install
npm run dev
```

Also available: `npm test` and `npm run build`.

Until the backend is connected, the site runs in **demo mode** with the 14 starter plants. Changes stay in your own browser, and the admin passcode is `123456`.

## Going live

### 1. Set the shop details

Edit [`src/config.ts`](../src/config.ts). Everything in it is public, so the admin passcode and WhatsApp number never go there.

| Setting | What to put |
| --- | --- |
| `shopName`, `ownerName`, `pickupArea`, `pickupHours`, `pickupWindows` | Already filled in, change them if needed |

### 2. Set up the Google backend

1. Create a Google Sheet. The `Inventory` and `Inquiries` tabs are created on first use.
2. Create a Google Drive folder for plant photos and copy its ID from the folder's URL.
3. In the sheet, open **Extensions > Apps Script** and replace the contents with [`backend/Code.gs`](../backend/Code.gs).
4. Open **Project Settings > Script properties** and add:

   | Property | Value |
   | --- | --- |
   | `ADMIN_PIN` | Your admin passcode. It must be exactly 6 digits to work with the keypad. Avoid birthdays and `123456` |
   | `WHATSAPP_NUMBER` | The number customers message, like `60123456789` or `0123456789` |
   | `DRIVE_FOLDER_ID` | The folder ID from step 2 |
   | `NOTIFY_EMAIL` | Optional. Also emails each new inquiry here |

5. Click **Deploy > New deployment > Web app**, with *Execute as: Me* and *Who has access: Anyone*. Approve the permissions Google asks for.
6. In Netlify, add the `/exec` URL as the environment variable `VITE_APPS_SCRIPT_URL`, then redeploy.
7. Log in to admin on the site and press **Masukkan 14 pokok** to add the starter plants. Their names, prices and stock are placeholders, so correct them there.

If you change `Code.gs` later, use **Deploy > Manage deployments > Edit > New version**, otherwise the old code keeps running.

### 3. Publish

The site is hosted on Netlify, connected to this repository. [`netlify.toml`](../netlify.toml) sets the build and the security headers, so every push to `main` is built and deployed. GitHub Actions runs the tests on each push too.

## Using the admin page

Open **Log masuk admin** in the footer, or add `#/admin` to the site address.

- **Inventori:** switch a plant between in stock and sold out, or add, edit and delete plants. Photos are shrunk in the browser before uploading.
- **Pertanyaan:** see every inquiry, move it through Baru, Disahkan and Selesai, and press **Balas** to reply on WhatsApp.
- After 5 wrong passcodes, admin locks for 15 minutes for everyone, including you. Anyone already logged in stays logged in. To unlock early, delete `pinLockedUntil` from Script properties.
- A login lasts up to 6 hours, or until **Log keluar**.

## Security

- **Private, never in this repository:** the admin passcode, WhatsApp number and Drive folder ID (Script properties), and customer details (the Google Sheet). Don't share the sheet.
- **Public on purpose:** this code, the plant list, and the Apps Script URL, which every visitor's browser has to call. None of them unlock anything.
- **The WhatsApp number** isn't in this code, but any visitor can find it, because their browser needs it to open the chat.
- `tests/security.test.ts` runs outsider attacks against `backend/Code.gs` on every push.

## Where things are

| Path | What it is |
| --- | --- |
| `src/shop/` | Catalog, plant page, basket, checkout, thank-you page |
| `src/admin/` | Keypad, inventory, plant form, inquiries |
| `src/lib/api.ts` | All backend calls, plus the demo-mode stand-in |
| `src/data/plants.ts` | The 14 starter plants |
| `public/images/` | The plant photos |
| `backend/Code.gs` | The Google Apps Script backend |
| `tests/` | Tests for the helpers and for `Code.gs`, run against fake Google services |
