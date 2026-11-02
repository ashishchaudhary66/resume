# Ashish Kumar Chaudhary — Resume Collection

This repository contains three ATS-friendly LaTeX resume variants and **Resume Lab**, a React-based browser workspace for editing and compiling them.

## Resume versions

| File | Target roles | Emphasis |
|---|---|---|
| [Angular + .NET Full Stack](resumes/Angular_DotNet_FullStack.tex) | .NET / Angular Full Stack Developer | Angular, TypeScript, Signals, RxJS, ASP.NET Core, C#, SQL Server, Azure |
| [React + .NET Full Stack](resumes/React_DotNet_FullStack.tex) | React + .NET Full Stack Developer | React, Hooks, Redux Toolkit, TypeScript, ASP.NET Core, C#, SQL Server |
| [React + Angular + .NET Full Stack](resumes/React_Angular_DotNet_FullStack.tex) | General Full Stack Developer | Balanced React, Angular, ASP.NET Core, databases, and Azure |

## Resume Lab — React LaTeX workspace

The React application is in [react-app](react-app/). It provides:

- Three selectable resume source files in a project/file sidebar.
- A LaTeX editor powered by CodeMirror with line numbers, syntax highlighting, and editor shortcuts.
- Browser-local draft saving, reset-to-repository-source, and TEX download.
- pdfLaTeX / XeLaTeX compiler selection and an in-app PDF preview with an open-in-new-tab fallback.
- Compiler error output when Pressa returns a LaTeX or service error.

### Run locally

Requires Node.js 22.12 or newer.

    cd react-app
    npm install
    npm run dev

Open the local URL printed by Vite (the base path is /resume/). The predev script copies the three repository TEX files into the app's public templates folder.

Create a production build with:

    npm run build

### Publish with GitHub Pages

The workflow at .github/workflows/deploy-resume-app.yml builds react-app and deploys react-app/dist when the React app, resume sources, or workflow changes are pushed to main.

The app URL is:

https://ashishchaudhary66.github.io/resume/

GitHub Pages must use **GitHub Actions** as its build and deployment source in repository Settings → Pages.

### Compiler and storage notes

- Compilation sends the current editor contents to Pressa's POST /api/v1/compile endpoint. Unsaved edits are therefore compiled too.
- Pressa is a third-party service. Its API has anonymous usage, source-size, page-count, and output-size limits. Check its current [API documentation](https://pressa.dev/docs/api) for details.
- Browser drafts are stored in localStorage on the current browser/device. They are not synced to GitHub or another device.
- If Pressa requires authentication for your account, use **Set API key** in the top bar. The key is kept only in sessionStorage for the current tab and sent as a Bearer token; it is not committed to this repository.
- The React app is static-hosted. It does not provide authentication, cloud projects, multi-user collaboration, or server-side storage yet.
- Do not enter confidential documents or secrets into this public app. LaTeX source is sent to the hosted compiler.
- PDF URLs returned by Pressa are temporary signed links.

## Notes

- Keep dates, contact details, metrics, and technology claims aligned with verified employment history.
- The source files use a compact A4 layout intended to fit on one page. Confirm the final page count after compiling.
- Update the relevant variant rather than sending the same resume to every role.
