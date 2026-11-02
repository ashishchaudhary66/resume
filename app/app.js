const resumeOptions = {
  react: {
    fileName: "React_DotNet_FullStack.tex",
    source: "https://raw.githubusercontent.com/ashishchaudhary66/resume/main/resumes/React_DotNet_FullStack.tex"
  },
  angular: {
    fileName: "Angular_DotNet_FullStack.tex",
    source: "https://raw.githubusercontent.com/ashishchaudhary66/resume/main/resumes/Angular_DotNet_FullStack.tex"
  },
  combined: {
    fileName: "React_Angular_DotNet_FullStack.tex",
    source: "https://raw.githubusercontent.com/ashishchaudhary66/resume/main/resumes/React_Angular_DotNet_FullStack.tex"
  }
};

const selector = document.querySelector("#resume-select");
const fileName = document.querySelector("#file-name");
const sourceLink = document.querySelector("#source-link");
const compileButton = document.querySelector("#compile-btn");
const statusText = document.querySelector("#status");
const previewSection = document.querySelector("#preview-section");
const previewName = document.querySelector("#preview-name");
const openPdf = document.querySelector("#open-pdf");

const selectedResume = () => resumeOptions[selector.value] || resumeOptions.react;

function updateSelectedResume() {
  const resume = selectedResume();
  fileName.textContent = resume.fileName;
  sourceLink.href = resume.source;
  previewSection.classList.add("hidden");
  openPdf.href = "#";
  statusText.textContent = "The selected .tex file will be compiled using pdfLaTeX.";
}

selector.addEventListener("change", updateSelectedResume);

compileButton.addEventListener("click", () => {
  const resume = selectedResume();

  // Pressa's link endpoint returns application/pdf directly. Do not iframe it:
  // the service intentionally sends X-Frame-Options: sameorigin.
  const compileUrl = new URL("https://api.pressa.dev/compile");
  compileUrl.searchParams.set("url", resume.source);
  compileUrl.searchParams.set("command", "pdflatex");

  // Open synchronously inside the click handler to avoid popup blockers.
  const pdfWindow = window.open(compileUrl.toString(), "_blank", "noopener,noreferrer");

  previewName.textContent = resume.fileName.replace(/\.tex$/i, ".pdf");
  openPdf.href = compileUrl.toString();
  previewSection.classList.remove("hidden");

  if (pdfWindow) {
    statusText.textContent = "Compilation opened in a new tab. If LaTeX compilation fails, the compiler will show its error log there.";
  } else {
    statusText.textContent = "Your browser blocked the new tab. Use the Open PDF link below to continue.";
  }

  previewSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

updateSelectedResume();
