# tim-timer
Tim's Timer TIME IS MONEY!

A lightweight static web app for planning your day: list tasks with time estimates, set a deadline, and it tells you when to start. Drag to reorder, start the timer to see what you should be working on and how much time is left, and mark tasks done to see how far ahead or behind schedule you are.

## Getting started

```
npm install
npm run dev
```

Then open the printed local URL (defaults to http://localhost:5173).

Other commands:

```
npm run build     # build the static site to dist/
npm run preview   # preview the production build locally
```

## Deploying to Render

This is a static Vite app, so Render can host it as a static site.

1. Create a new Web Service on Render.
2. Connect your GitHub repository containing this project.
3. Set the Build Command to:

```bash
npm install
npm run build
```

4. Set the Publish Directory to:

```bash
dist
```

5. Deploy.

Render will build the app and serve the generated static files from `dist/`.

Data (tasks, deadline, progress) is saved in the browser's localStorage — no backend required. On a phone, use "Add to Home Screen" to install it as an app.

Co-created by Majd Hatoum (Tim Jones) and Sami Bouhussein
