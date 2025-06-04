# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Running on Replit

1. Fork this repository to Replit using GitHub import.
2. Set the `GEMINI_API_KEY` secret in the Replit Secrets Manager.
3. Replit will automatically install dependencies and start the dev server using the configuration from `.replit`.
4. Once running, open the web view to interact with the app.
