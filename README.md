# Review Room

A local Flask app for focused AI code reviews. It sends submitted code to the configured Gemini model; your API key stays on the server and is never stored in the browser.

## Run locally

1. Create and activate a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install dependencies and create your local environment file:

   ```powershell
   pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

3. Set `GEMINI_API_KEY` in `.env`, then start the app:

   ```powershell
   flask --app app run --debug
   ```

4. Open https://enchilada-tumbling-curdle.ngrok-free.dev

Set `GEMINI_MODEL` in `.env` to use a different Gemini model. Do not commit `.env` or expose this development server to untrusted networks.

## Deploy on Netlify

The repository includes a static Netlify entry point and a serverless function for code reviews. Connect the GitHub repository to Netlify; `netlify.toml` configures the publish directory and function route. In the Netlify site settings, add `GEMINI_API_KEY` as an environment variable and redeploy. `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`.
