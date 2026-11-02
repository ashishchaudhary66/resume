# Ashish Kumar Chaudhary — Resume Collection

This repository contains three ATS-friendly LaTeX resume variants and **Resume Lab**, a React-based browser workspace for editing and compiling them.

## Resume versions

| File | Target roles | Emphasis |
|---|---|---|
| [Angular + .NET Full Stack](resumes/Angular_DotNet_FullStack.tex) | .NET / Angular Full Stack Developer | Angular, TypeScript, Signals, RxJS, ASP.NET Core, C#, SQL Server, Azure |
| [React + .NET Full Stack](resumes/React_DotNet_FullStack.tex) | React + .NET Full Stack Developer | React, Hooks, Redux Toolkit, TypeScript, ASP.NET Core, C#, SQL Server |
| [React + Angular + .NET Full Stack](resumes/React_Angular_DotNet_FullStack.tex) | General Full Stack Developer | Balanced React, Angular, ASP.NET Core, databases, and Azure |

## Resume Lab — React LaTeX workspace

The React application is in [react-app](react-app/). It provides a three-file project explorer, a CodeMirror LaTeX editor, browser-local drafts, reset/download controls, compiler selection, PDF preview, and compiler logs.

### Run locally

Requires Node.js 22.12 or newer.

    cd react-app
    npm install
    npm run dev

Open the Vite URL printed in the terminal. The app copies the three repository resume sources into its public templates folder before starting.

### Publish the frontend with GitHub Pages

The workflow at `.github/workflows/deploy-resume-app.yml` builds `react-app` and deploys `react-app/dist`.

App URL:

https://ashishchaudhary66.github.io/resume/

GitHub Pages must use **GitHub Actions** as its build source in repository Settings → Pages.

## Compiler proxy — required for browser compilation

Pressa's compile API does not currently return the CORS headers required by a browser hosted on GitHub Pages. The browser therefore cannot call Pressa directly. Resume Lab uses a small Cloudflare Worker as a server-side proxy. The Worker answers the browser's `OPTIONS` preflight with the correct CORS headers, then makes the Pressa request server-to-server.

### Deploy the proxy

1. Create or sign in to a Cloudflare account and enable Workers.
2. In GitHub, open this repository's **Settings → Secrets and variables → Actions**.
3. Add `CLOUDFLARE_API_TOKEN` (an API token with permission to edit Workers Scripts for the account) and `CLOUDFLARE_ACCOUNT_ID`.
4. Push a change under `worker/` or manually run **Deploy Resume Lab compiler proxy** from the Actions tab. The workflow deploys `worker/src/index.js` using `worker/wrangler.jsonc`.
5. In Cloudflare, confirm that the Worker `resume-lab-compiler` has a `workers.dev` URL enabled. It will look like `https://resume-lab-compiler.<your-workers-subdomain>.workers.dev`.
6. Open Resume Lab, click **Set proxy URL**, and paste the Worker URL. The setting is saved in localStorage for that browser.

The Worker allows the GitHub Pages origin `https://ashishchaudhary66.github.io` and Vite's default local development origins. It accepts only `POST /compile`, validates the compiler name, and enforces a 30 KB source limit to match Pressa's anonymous tier.

### Pressa authentication and limits

Pressa's current compile API supports anonymous compilation without an API key (three successful compilations per day). If you obtain a Pressa key, configure it as a **Worker secret** named `PRESSA_API_KEY` in Cloudflare. It is never sent to or stored by the browser. See the [Pressa API docs](https://pressa.dev/docs/api).

### Storage and security notes

- Drafts and the compiler proxy URL are stored in localStorage on the current browser/device. They are not synced between devices.
- The React frontend is static. It does not yet provide accounts, cloud projects, project sharing, collaboration, or server-side draft storage.
- The LaTeX source is sent to Pressa for compilation. Do not enter confidential documents or secrets.
- Pressa returns a temporary signed PDF URL. The PDF can be opened in a new tab if the embedded preview is unavailable.

## Notes

- Keep dates, contact details, metrics, and technology claims aligned with verified employment history.
- Confirm the final page count and layout after compiling each resume variant.
