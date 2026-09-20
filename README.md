<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e8ae0010-b87d-4661-a68e-fcad5d37938f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Verified marketplace flow

1. A new artisan submits contact details, a password, two craft photos and one work video.
2. The account stays `pending`; login and all Artisan Studio routes remain blocked.
3. The administrator reviews the evidence in Admin Dashboard and approves or rejects it.
4. Only approved artisans can log in and submit products.
5. Product photos go to Flask and catalog text is generated through the configured n8n webhook.
6. AI confidence of at least 80% plus the authenticity checks auto-approves the product; otherwise it enters Admin review.
7. The artisan can edit the AI-suggested selling price before submitting.

Set `REMOVE_BG_API_KEY` in `.env` for real background removal. Configure `N8N_CATALOG_WEBHOOK_URL` when n8n is not running at the default local address.

Run Flask on port 5000, n8n on 5678, and then `npm run dev`. Backend CORS accepts Vite on ports 3000, 3001 and 5173.
