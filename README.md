# Hana's Garden

Potted plants from my family's home garden in Kampung Undang, Terengganu. Have a look at what's growing, pick a few, and reserve them with one WhatsApp message. Then come by and collect them.

**[Visit the shop](https://lamanhana.netlify.app)**

![The Hana's Garden home page, with three bromeliad photos in arch frames and a green band reading "Ambil sendiri di Kampung Undang, Terengganu"](docs/shop.jpg)

## For customers

Hana's Garden is our family's plant garden in Kampung Undang. See which plants are available, add them to the basket, and send one inquiry straight to Hana on WhatsApp. Hana confirms stock and price, then you come and collect them yourself.

- **Self pickup:** Kampung Undang, Terengganu
- **Hours:** every day, 9am to 5pm
- For neighbours in the village, friends, and anyone around Terengganu who can drop by

## About the garden

Hana's Garden is my mom's garden. She grows plants at home, like the bromeliads in the photos above, and sells them to neighbours, friends and family around Terengganu. Pickup only, so there's no delivery or shipping.

I built this site for her so people can see what she has before they ask, and she can keep track of every request in one place.

## How ordering works

1. **Browse:** every plant has a photo, an estimated price, and whether it's in stock.
2. **Fill a basket:** pick as many plants as you like and set how many of each.
3. **Choose a pickup time:** any of the next 7 days, morning or afternoon.
4. **Send on WhatsApp:** WhatsApp opens with your list already written. Press send, and Hana replies to confirm stock and the final price.
5. **Collect:** pick the plants up in Kampung Undang.

There's no app to install, no account to make, and no online payment. All you need is WhatsApp.

## What it makes easier

**For customers**

- You can see what's available without messaging first to ask "is it still available?"
- Prices are shown up front. They're estimates, and Hana confirms the final price.
- One message carries the whole list, instead of sending photos back and forth.

**For my mom**

- Every request is saved to a Google Sheet, so none get lost in a busy WhatsApp chat.
- From her phone, she can mark a plant sold out, change a price, or add a new plant with a photo, behind a 6-digit passcode.
- It costs nothing to run, because it uses the free plans of Netlify and Google.

## Under the hood

A React and TypeScript site built with Vite and hosted on Netlify. Google Sheets holds the plants and requests, Google Drive holds new photos, and a small Google Apps Script connects them, so there's no server to pay for or look after.

The admin passcode, WhatsApp number and customer details are never stored in this repository. Tests, including attacks an outsider might try, run on every push.

To run it yourself or connect your own Google Sheet, see **[docs/SETUP.md](docs/SETUP.md)**.
