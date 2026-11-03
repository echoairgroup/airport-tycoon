# Install Arcade 0.2.1 into the GitHub repository

1. Clone `https://github.com/echoairgroup/airport-tycoon` (or open your existing local clone).
2. Extract this ZIP **directly into the repository root**, preserving the included folder structure. Allow files to be replaced.
3. Open PowerShell in the repository root and run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\Publish-To-GitHub.ps1
   ```

The script checks that the current folder is a Git clone of `echoairgroup/airport-tycoon`, that you are on `main`, then commits and pushes the update. GitHub authentication must already be configured on your PC (for example through Git Credential Manager).

To test locally, run `npm install`, `npm test`, and `npm run dev`.
