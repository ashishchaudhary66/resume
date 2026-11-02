const resumeOptions = {
  react: { fileName: "React_DotNet_FullStack.tex", source: "https://raw.githubusercontent.com/ashishchaudhary66/resume/main/resumes/React_DotNet_FullStack.tex" },
  angular: { fileName: "Angular_DotNet_FullStack.tex", source: "https://raw.githubusercontent.com/ashishchaudhary66/resume/main/resumes/Angular_DotNet_FullStack.tex" },
  combined: { fileName: "React_Angular_DotNet_FullStack.tex", source: "https://raw.githubusercontent.com/ashishchaudhary66/resume/main/resumes/React_Angular_DotNet_FullStack.tex" }
};
const selector=document.querySelector("#resume-select");
const fileName=document.querySelector("#file-name");
const sourceLink=document.querySelector("#source-link");
const compileButton=document.querySelector("#compile-btn");
const statusText=document.querySelector("#status");
const previewSection=document.querySelector("#preview-section");
const previewName=document.querySelector("#preview-name");
const pdfFrame=document.querySelector("#pdf-frame");
const openPdf=document.querySelector("#open-pdf");
const selectedResume=()=>resumeOptions[selector.value]||resumeOptions.react;
function updateSelectedResume(){
  const resume=selectedResume();
  fileName.textContent=resume.fileName;
  sourceLink.href=resume.source;
  previewSection.classList.add("hidden");
  pdfFrame.removeAttribute("src");
  openPdf.href="#";
  statusText.textContent="The selected .tex file will be compiled using pdfLaTeX.";
}
selector.addEventListener("change",updateSelectedResume);
compileButton.addEventListener("click",()=>{
  const resume=selectedResume();
  const url=new URL("https://api.pressa.dev/compile");
  url.searchParams.set("url",resume.source);
  url.searchParams.set("command","pdflatex");
  compileButton.disabled=true;
  compileButton.textContent="Preparing PDF…";
  statusText.textContent="Compiling "+resume.fileName+". This may take a few seconds.";
  pdfFrame.src=url.toString();
  openPdf.href=url.toString();
  previewName.textContent=resume.fileName.replace(/\.tex$/i,".pdf");
  previewSection.classList.remove("hidden");
  previewSection.scrollIntoView({behavior:"smooth",block:"start"});
  window.setTimeout(()=>{
    compileButton.disabled=false;
    compileButton.innerHTML='<span class="btn-icon">↗</span> Compile selected resume';
    statusText.textContent="The compilation request has been sent. If the preview does not load, use Open PDF or check the compiler response.";
  },1800);
});
updateSelectedResume();