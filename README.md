# Ashish Kumar Chaudhary — Resume Collection

This repository contains three ATS-friendly LaTeX resume variants and a web app to compile a selected variant into PDF.

## Resume versions

| File | Target roles | Emphasis |
|---|---|---|
| [Angular + .NET Full Stack](resumes/Angular_DotNet_FullStack.tex) | .NET / Angular Full Stack Developer | Angular, TypeScript, Signals, RxJS, ASP.NET Core, C#, SQL Server, Azure |
| [React + .NET Full Stack](resumes/React_DotNet_FullStack.tex) | React + .NET Full Stack Developer | React, Hooks, Redux Toolkit, TypeScript, ASP.NET Core, C#, SQL Server |
| [React + Angular + .NET Full Stack](resumes/React_Angular_DotNet_FullStack.tex) | General Full Stack Developer | Balanced React, Angular, ASP.NET Core, databases, and Azure |

## LaTeX to PDF web app

The static web app is in the [app](app/) folder. It lets you select one of the three resume sources, send it to the Pressa hosted LaTeX compiler, preview the generated PDF, and open the PDF in a new tab.

### Run locally

Open app/index.html in a browser, or serve the repository root with any static file server and visit /app/.

### Publish with GitHub Pages

The workflow at .github/workflows/deploy-resume-app.yml deploys the contents of app/ to GitHub Pages when changes are pushed to main.

After the first successful workflow run and enabling GitHub Pages with GitHub Actions as the build source in repository Settings → Pages, the app will be available at:

https://ashishchaudhary66.github.io/resume/

### Compilation notes

- The app loads the selected .tex file from this public GitHub repository and uses Pressa's online compiler (api.pressa.dev) with pdfLaTeX.
- The compiler returns the PDF directly; the app embeds that response in a preview and provides an open-in-new-tab link.
- This is a third-party service with usage limits. The LaTeX source is public and is sent to the compiler, so do not use this app for confidential source files.
- Generated PDFs are created on demand and are not committed to GitHub.
- You can also compile locally with a TeX Live installation or upload a .tex file to Overleaf.

## Notes

- Keep dates, contact details, metrics, and technology claims aligned with your verified employment history.
- The source files use a compact A4 layout intended to fit on one page. Confirm the final page count after compiling with your LaTeX distribution.
- Update the relevant variant rather than sending the same resume to every role.
