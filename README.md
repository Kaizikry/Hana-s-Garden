# Hana's Garden

A plant catalog for a home garden in Kampung Undang, Terengganu. Customers fill a basket and send one inquiry over WhatsApp for self-pickup. Each inquiry is also logged to a Google Sheet, and a passcode-protected admin page manages stock, photos and inquiries from a phone.

Built with React and Vite. Google Sheets stores the data, Google Drive stores new photos, and Google Apps Script connects them. There is no server to pay for.

## Run it locally

```bash
npm install
npm run dev
```

Also available: `npm test` and `npm run build`.

Until the backend is connected, the site runs in **demo mode** with the 14 starter plants. Changes stay in your own browser, and the admin passcode is `123456`.

## Going live

### 1. Set the shop details

Edit [`src/config.ts`](src/config.ts). Everything in it is public, so the admin passcode never goes there.

| Setting | What to put |
| --- | --- |
| `whatsappNumber` | Country code and digits only, like `60123456789` |
| `appsScriptUrl` | The Web App URL from step 2 |
| `shopName`, `ownerName`, `pickupArea`, `pickupHours`, `pickupWindows` | Already filled in, change them if needed |

### 2. Set up the Google backend

1. Create a Google Sheet. The `Inventory` and `Inquiries` tabs are created on first use.
2. Create a Google Drive folder for plant photos and copy its ID from the folder's URL.
3. In the sheet, open **Extensions > Apps Script** and replace the contents with [`backend/Code.gs`](backend/Code.gs).
4. Open **Project Settings > Script properties** and add:

   | Property | Value |
   | --- | --- |
   | `ADMIN_PIN` | Your admin passcode. It must be exactly 6 digits to work with the keypad |
   | `DRIVE_FOLDER_ID` | The folder ID from step 2 |
   | `NOTIFY_EMAIL` | Optional. Also emails each new inquiry here |

5. Click **Deploy > New deployment > Web app**, with *Execute as: Me* and *Who has access: Anyone*. Approve the permissions Google asks for.
6. Copy the `/exec` URL into `appsScriptUrl` in `src/config.ts`.
7. Log in to admin on the site and press **Masukkan 14 pokok** to add the starter plants. Their names, prices and stock are placeholders, so correct them there.

If you change `Code.gs` later, use **Deploy > Manage deployments > Edit > New version**, otherwise the old code keeps running.

### 3. Publish

In the repository, set **Settings > Pages > Source** to **GitHub Actions** once. After that, every push to `main` is tested, built and deployed.

## Using the admin page

Open **Log masuk admin** in the footer, or add `#/admin` to the site address.

- **Inventori:** switch a plant between in stock and sold out, or add, edit and delete plants. Photos are shrunk in the browser before uploading.
- **Pertanyaan:** see every inquiry, move it through Baru, Disahkan and Selesai, and press **Balas** to reply on WhatsApp.
- After 5 wrong passcodes, admin locks for 15 minutes. The lock applies to everyone, including you.

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
