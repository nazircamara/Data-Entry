Electron wrapper for the existing Data Entry web app.

Quick start (Windows, PowerShell):

1. Install dependencies

```powershell
cd "c:/Users/nazir/Desktop/Data Entry"
npm install
```

2. Run the app (development)

```powershell
npm run start
```

3. Package the app (creates a distributable installer/build)

```powershell
npm run dist
```

Notes:
- The app loads `index.html` locally, so it runs fully offline.
- A placeholder icon is included at `assets/icon.png` as a data-URL. Replace it with a proper PNG/ICO for better results.
- For Windows installers, electron-builder prefers an `.ico` file. Put your `icon.ico` into `assets/` and update `build.win.icon` in `package.json` before running `npm run dist`.

Repository:

- GitHub: https://nazircamara.github.io/Data-Entry/

If you host this project on GitHub, set the correct URL above and other collaborators can clone and build the installer using the commands above.
