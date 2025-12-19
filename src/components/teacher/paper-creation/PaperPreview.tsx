"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Save, Loader2, CheckCircle, Printer, X } from "lucide-react";
import { PaperFormData } from "../CreatePaperFlow";
import { Button } from "../../ui/button";
import { apiFetch } from "../../../lib/api";
import { notify } from "../../ui/toast";
import { MathText } from "../../ui/MathText";
// Avoid SSR issues: dynamically import browser-only libs when needed
// import html2pdf and file-saver inside handlers

interface PaperPreviewProps {
  formData: PaperFormData;
}

interface SavedPaperResponse {
  _id: string;
}

interface WindowWithMathJax extends Window {
  MathJax?: {
    typesetPromise?: () => Promise<void>;
  };
}

export default function PaperPreview({ formData }: PaperPreviewProps) {
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [savedPaperId, setSavedPaperId] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Enable MathJax rendering if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as WindowWithMathJax;
      if (win.MathJax?.typesetPromise) {
        win.MathJax.typesetPromise();
      }
    }
  }, [formData]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Wait for math rendering and fonts before snapshotting (PDF/Print)
  const waitForMathLayout = async () => {
    const win =
      typeof window !== "undefined" ? (window as WindowWithMathJax) : undefined;
    try {
      // If MathJax is present anywhere, ensure a fresh typeset
      if (win?.MathJax?.typesetPromise) {
        await win.MathJax.typesetPromise!();
      }
    } catch {
      // Non-fatal – proceed even if MathJax isn't available
    }

    // Wait for webfonts to be ready (important for KaTeX glyph metrics)
    try {
      type FontFaceSetLike = { ready?: Promise<void> };
      const fontSet = (document as unknown as { fonts?: FontFaceSetLike })
        .fonts;
      if (fontSet?.ready) {
        await fontSet.ready;
      }
    } catch {}

    // Two animation frames to flush layout and paints
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r()))
    );
  };

  const calculateTotalMarks = () => {
    return formData.sections.reduce((total, section) => {
      return (
        total + section.selectedQuestions.length * section.marksPerQuestion
      );
    }, 0);
  };

  const handleSavePaper = async () => {
    setSaving(true);
    try {
      const paperData = {
        examTitle: formData.examTitle,
        className: formData.className,
        subject: formData.subject,
        board: formData.board,
        date: formData.date,
        duration: formData.duration,
        instituteName: formData.instituteName,
        totalMarks: calculateTotalMarks(),
        sections: formData.sections.map((section) => ({
          title: section.title,
          marksPerQuestion: section.marksPerQuestion,
          instructions: section.instructions,
          questions: section.selectedQuestions.map((q) => ({
            _id: q._id,
            text: q.text,
            type: q.type,
            options: q.options,
            explanation: q.explanation,
          })),
        })),
        meta: {
          maxMarks: calculateTotalMarks(),
        },
      };

      const response = (await apiFetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paperData),
      })) as SavedPaperResponse;

      if (response?._id) {
        setSavedPaperId(response._id);
        notify.success("Question paper saved successfully!");
      } else {
        notify.error("Failed to save question paper");
      }
    } catch (error) {
      console.error("Error saving paper:", error);
      notify.error("Failed to save question paper");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    setExporting(format);

    // Use setTimeout to make the operation non-blocking
    setTimeout(async () => {
      try {
        const element = document.getElementById("paper-preview");
        if (!element) {
          throw new Error("Preview element not found");
        }

        const fileName = `${formData.examTitle.replace(/[^a-z0-9]/gi, "_")}_${
          formData.className
        }_${formData.subject}`;

        if (format === "pdf") {
          try {
            // Ensure math layout is final before sending HTML to server
            await waitForMathLayout();

            // Compose full HTML document including head so server Puppeteer can render correctly
            const headHtml = document.head.innerHTML;
            const base = `<base href="${location.origin}">`;
            const fullHtml = `<!doctype html><html><head>${base}${headHtml}</head><body style="margin:0;background:#ffffff">${element.outerHTML}</body></html>`;

            // POST to server API which will generate a PDF using Puppeteer
            const resp = await fetch("/api/pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                html: fullHtml,
                filename: `${fileName}.pdf`,
              }),
            });

            if (!resp.ok) {
              const text = await resp.text();
              throw new Error(
                `Server PDF generation failed: ${resp.status} ${text}`
              );
            }

            const arrayBuffer = await resp.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${fileName}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            notify.success("PDF downloaded successfully!");
          } catch (pdfError) {
            console.error("PDF generation error:", pdfError);
            throw pdfError;
          }
        } else if (format === "docx") {
          // Helper function to convert LaTeX to Unicode math symbols
          const convertLatexToUnicode = (text: string): string => {
            if (!text) return text;

            let result = text;

            // Remove dollar signs first (both single $ and double $$)
            result = result.replace(/\$\$/g, "").replace(/\$/g, "");

            // Handle calculus specific notations first (use HTML where Word supports it)
            // Integrals with limits: \int_{a}^{b}
            result = result.replace(
              /\\int\s*_\{([^}]+)\}\s*\^\{([^}]+)\}/g,
              "∫<sub>$1</sub><sup>$2</sup>"
            );
            // Summation with limits
            result = result.replace(
              /\\sum\s*_\{([^}]+)\}\s*\^\{([^}]+)\}/g,
              "∑<sub>$1</sub><sup>$2</sup>"
            );
            // Product with limits
            result = result.replace(
              /\\prod\s*_\{([^}]+)\}\s*\^\{([^}]+)\}/g,
              "∏<sub>$1</sub><sup>$2</sup>"
            );
            // Limit with subscript
            result = result.replace(
              /\\lim\s*_\{([^}]+)\}/g,
              "lim<sub>$1</sub>"
            );
            // Derivative forms
            result = result.replace(/\\frac\{d\}\{d([a-zA-Z])\}/g, "d/d$1");
            result = result.replace(
              /\\frac\{\partial\}\{\partial\s*([a-zA-Z])\}/g,
              "∂/∂$1"
            );

            // Handle fractions
            result = result.replace(
              /\\frac\{([^}]+)\}\{([^}]+)\}/g,
              "($1)/($2)"
            );

            // Handle square roots
            result = result.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");
            result = result.replace(/\\sqrt/g, "√");

            // Trigonometric functions
            result = result.replace(/\\sin/g, "sin");
            result = result.replace(/\\cos/g, "cos");
            result = result.replace(/\\tan/g, "tan");
            result = result.replace(/\\cot/g, "cot");
            result = result.replace(/\\sec/g, "sec");
            result = result.replace(/\\csc/g, "csc");

            // Logarithms
            result = result.replace(/\\log/g, "log");
            result = result.replace(/\\ln/g, "ln");

            // Limits and calculus (inline)
            result = result.replace(/\\lim/g, "lim");
            result = result.replace(/\\to/g, "→");
            result = result.replace(/\\rightarrow/g, "→");
            result = result.replace(/\\leftarrow/g, "←");
            result = result.replace(/\\Rightarrow/g, "⇒");
            result = result.replace(/\\Leftarrow/g, "⇐");

            // Greek letters (lowercase)
            result = result.replace(/\\alpha/g, "α");
            result = result.replace(/\\beta/g, "β");
            result = result.replace(/\\gamma/g, "γ");
            result = result.replace(/\\delta/g, "δ");
            result = result.replace(/\\epsilon/g, "ε");
            result = result.replace(/\\zeta/g, "ζ");
            result = result.replace(/\\eta/g, "η");
            result = result.replace(/\\theta/g, "θ");
            result = result.replace(/\\iota/g, "ι");
            result = result.replace(/\\kappa/g, "κ");
            result = result.replace(/\\lambda/g, "λ");
            result = result.replace(/\\mu/g, "μ");
            result = result.replace(/\\nu/g, "ν");
            result = result.replace(/\\xi/g, "ξ");
            result = result.replace(/\\pi/g, "π");
            result = result.replace(/\\rho/g, "ρ");
            result = result.replace(/\\sigma/g, "σ");
            result = result.replace(/\\tau/g, "τ");
            result = result.replace(/\\upsilon/g, "υ");
            result = result.replace(/\\phi/g, "φ");
            result = result.replace(/\\chi/g, "χ");
            result = result.replace(/\\psi/g, "ψ");
            result = result.replace(/\\omega/g, "ω");

            // Greek letters (uppercase)
            result = result.replace(/\\Gamma/g, "Γ");
            result = result.replace(/\\Delta/g, "Δ");
            result = result.replace(/\\Theta/g, "Θ");
            result = result.replace(/\\Lambda/g, "Λ");
            result = result.replace(/\\Xi/g, "Ξ");
            result = result.replace(/\\Pi/g, "Π");
            result = result.replace(/\\Sigma/g, "Σ");
            result = result.replace(/\\Phi/g, "Φ");
            result = result.replace(/\\Psi/g, "Ψ");
            result = result.replace(/\\Omega/g, "Ω");

            // Math operators
            result = result.replace(/\\times/g, "×");
            result = result.replace(/\\cdot/g, "·");
            result = result.replace(/\\div/g, "÷");
            result = result.replace(/\\pm/g, "±");
            result = result.replace(/\\mp/g, "∓");

            // Comparison operators
            result = result.replace(/\\leq/g, "≤");
            result = result.replace(/\\geq/g, "≥");
            result = result.replace(/\\neq/g, "≠");
            result = result.replace(/\\approx/g, "≈");
            result = result.replace(/\\equiv/g, "≡");
            result = result.replace(/\\sim/g, "∼");
            result = result.replace(/\\simeq/g, "≃");
            result = result.replace(/\\cong/g, "≅");
            result = result.replace(/\\propto/g, "∝");

            // Set theory
            result = result.replace(/\\in/g, "∈");
            result = result.replace(/\\notin/g, "∉");
            result = result.replace(/\\subset/g, "⊂");
            result = result.replace(/\\supset/g, "⊃");
            result = result.replace(/\\subseteq/g, "⊆");
            result = result.replace(/\\supseteq/g, "⊇");
            result = result.replace(/\\cup/g, "∪");
            result = result.replace(/\\cap/g, "∩");
            result = result.replace(/\\emptyset/g, "∅");
            result = result.replace(/\\varnothing/g, "∅");

            // Special symbols
            result = result.replace(/\\infty/g, "∞");
            result = result.replace(/\\partial/g, "∂");
            result = result.replace(/\\nabla/g, "∇");
            result = result.replace(/\\forall/g, "∀");
            result = result.replace(/\\exists/g, "∃");
            result = result.replace(/\\neg/g, "¬");
            result = result.replace(/\\wedge/g, "∧");
            result = result.replace(/\\vee/g, "∨");
            result = result.replace(/\\angle/g, "∠");
            result = result.replace(/\\degree/g, "°");
            result = result.replace(/\\circ/g, "°");

            // Calculus
            result = result.replace(/\\int/g, "∫");
            result = result.replace(/\\iint/g, "∬");
            result = result.replace(/\\iiint/g, "∭");
            result = result.replace(/\\oint/g, "∮");
            result = result.replace(/\\sum/g, "∑");
            result = result.replace(/\\prod/g, "∏");

            // Sup/Sub with braces to HTML (generic, do before brace cleanup)
            result = result.replace(/\^\{([^}]+)\}/g, "<sup>$1</sup>");
            result = result.replace(/_\{([^}]+)\}/g, "<sub>$1</sub>");

            // Handle superscripts with braces: x^{2} or x^{10}
            result = result.replace(/\^?\{(\d+)\}/g, (match, num) => {
              const superscriptMap: { [key: string]: string } = {
                "0": "⁰",
                "1": "¹",
                "2": "²",
                "3": "³",
                "4": "⁴",
                "5": "⁵",
                "6": "⁶",
                "7": "⁷",
                "8": "⁸",
                "9": "⁹",
              };
              return num
                .split("")
                .map((d: string) => superscriptMap[d] || d)
                .join("");
            });

            // Handle simple superscripts: x^2, x^3, etc.
            result = result.replace(/\^2/g, "²");
            result = result.replace(/\^3/g, "³");
            result = result.replace(/\^1/g, "¹");
            result = result.replace(/\^0/g, "⁰");
            result = result.replace(/\^4/g, "⁴");
            result = result.replace(/\^5/g, "⁵");
            result = result.replace(/\^6/g, "⁶");
            result = result.replace(/\^7/g, "⁷");
            result = result.replace(/\^8/g, "⁸");
            result = result.replace(/\^9/g, "⁹");
            result = result.replace(/\^-/g, "⁻");

            // Handle subscripts
            result = result.replace(/_(\d)/g, (_, n) => {
              const subscriptMap: { [key: string]: string } = {
                "0": "₀",
                "1": "₁",
                "2": "₂",
                "3": "₃",
                "4": "₄",
                "5": "₅",
                "6": "₆",
                "7": "₇",
                "8": "₈",
                "9": "₉",
              };
              return subscriptMap[n] || n;
            });

            // Text commands
            result = result.replace(/\\text\{([^}]+)\}/g, "$1");
            result = result.replace(/\\mathrm\{([^}]+)\}/g, "$1");
            result = result.replace(/\\mathbf\{([^}]+)\}/g, "$1");
            result = result.replace(/\\mathit\{([^}]+)\}/g, "$1");

            // Spaces
            result = result.replace(/\\quad/g, " \u2009\u2009");
            result = result.replace(/\\qquad/g, " \u2009\u2009\u2009\u2009");
            result = result.replace(/\\,/g, " \u2009");
            result = result.replace(/\\;/g, " \u2009");
            result = result.replace(/\\:/g, " \u2009");
            result = result.replace(/\\ /g, " ");

            // Handle parentheses sizing
            result = result.replace(/\\left\(/g, "(");
            result = result.replace(/\\right\)/g, ")");
            result = result.replace(/\\left\[/g, "[");
            result = result.replace(/\\right\]/g, "]");
            result = result.replace(/\\left\{/g, "{");
            result = result.replace(/\\right\}/g, "}");
            result = result.replace(/\\left\|/g, "|");
            result = result.replace(/\\right\|/g, "|");

            // Clean up remaining braces and backslashes
            result = result.replace(/\\(?=[a-zA-Z])/g, "");
            // keep braces when they are inside HTML tags already added
            result = result.replace(/\{/g, "(");
            result = result.replace(/\}/g, ")");

            return result;
          };

          // Build complete HTML content with proper formatting
          const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="UTF-8">
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <style>
    @page {
      size: A4;
      margin: 0.75in 0.75in 0.75in 0.75in;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 30pt;
      border: 1pt solid #333;
      min-height: 100vh;
    }
    .header-box {
      border: 2pt double #333;
      padding: 20pt;
      text-align: center;
      margin-bottom: 20pt;
    }
    h1 {
      font-size: 20pt;
      font-weight: bold;
      text-align: center;
      margin: 0 0 10pt 0;
      text-transform: uppercase;
    }
    h2 {
      font-size: 16pt;
      font-weight: bold;
      text-align: center;
      margin: 10pt 0;
      text-transform: uppercase;
      color: #047857;
      border-top: 1.5pt solid #333;
      border-bottom: 1.5pt solid #333;
      padding: 10pt 0;
    }
    h3 {
      font-size: 14pt;
      font-weight: bold;
      text-align: center;
      margin: 15pt 0 10pt 0;
      text-transform: uppercase;
      border-bottom: 1.5pt solid #333;
      padding-bottom: 10pt;
    }
    .info-grid {
      display: table;
      width: 100%;
      margin: 10pt 0;
      font-size: 11pt;
    }
    .info-row {
      display: table-row;
    }
    .info-cell {
      display: table-cell;
      padding: 4pt 8pt;
      width: 33.33%;
    }
    .info-cell strong {
      font-weight: bold;
    }
    .instructions-box {
      border: 2pt solid #000;
      border-radius: 8pt;
      padding: 12pt;
      margin: 15pt 0;
      background-color: #f9fafb;
    }
    .instructions-box h3 {
      border: none;
      margin-top: 0;
    }
    .instructions-box ul {
      margin: 0;
      padding-left: 25pt;
    }
    .instructions-box li {
      margin-bottom: 8pt;
      line-height: 1.5;
    
    }
    .section {
      margin: 20pt 0;
      page-break-inside: avoid;
    }
    .section-title {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      margin: 15pt 0 10pt 0;
      text-transform: uppercase;
      border-bottom: 2pt solid #000;
      padding-bottom: 8pt;
    }
    .section-instructions {
      text-align: center;
      font-style: semibold;
      font-size: 11pt;
      margin-bottom: 12pt;
      color: #4b5563;
    }
    /* Question layout: Word-friendly table to avoid collapsed lines */
    table.qtable { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt 0; }
    table.qtable tr { page-break-inside: avoid; }
    td.qnum { width: 42pt; font-weight: bold; vertical-align: top; }
    td.qtext { vertical-align: top; }
    td.qmarks { width: 84pt; text-align: right; vertical-align: top; color: #4b5563; font-style: italic; font-size: 10pt; white-space: nowrap; }
    .options {
      margin: 6pt 0 10pt 40pt;
    }
    .option {
      margin: 4pt 0;
      line-height: 1.4;
    }
    .option-label {
      font-weight: bold;
      margin-right: 6pt;
    }
    .marks {
      margin-top: 8pt;
      font-size: 10pt;
      font-style: italic;
      color: #4b5563;
    }
    .footer {
      text-align: center;
      margin-top: 30pt;
      padding-top: 15pt;
      border-top: 2pt solid #000;
      font-size: 11pt;
    }
    .footer p {
      margin: 5pt 0;
    }
  </style>
</head>
<body>
  <div class="header-box">
    ${formData.instituteName ? `<h1>${formData.instituteName}</h1>` : ""}
    <h2>${formData.examTitle}</h2>
    <div class="info-grid">
      <div class="info-row">
        <div class="info-cell"><strong>Class:</strong> ${
          formData.className
        }</div>
        <div class="info-cell"><strong>Subject:</strong> ${
          formData.subject
        }</div>
        <div class="info-cell"><strong>Board:</strong> ${formData.board}</div>
      </div>
      <div class="info-row">
        <div class="info-cell"><strong>Date:</strong> ${
          formData.date || "___________"
        }</div>
        <div class="info-cell"><strong>Duration:</strong> ${
          formData.duration || "3 Hours"
        }</div>
        <div class="info-cell"><strong>Max. Marks:</strong> ${calculateTotalMarks()}</div>
      </div>
    </div>
  </div>

  <div class="instructions-box">
    <h3>General Instructions</h3>
    <ul>
      <li>Read all instructions carefully before attempting the paper.</li>
      <li>Attempt all questions as per the instructions given in each section.</li>
      <li>All questions are compulsory unless stated otherwise.</li>
      <li>Marks are indicated against each question. Write your answers neatly and legibly.</li>
    </ul>
  </div>

  ${formData.sections
    .map((section, sectionIndex) => {
      if (section.selectedQuestions.length === 0) return "";

      let questionNumber = 1;
      for (let i = 0; i < sectionIndex; i++) {
        questionNumber += formData.sections[i].selectedQuestions.length;
      }

      return `
    <div class="section">
      <div class="section-title">${section.title}</div>
      ${
        section.instructions
          ? `<div class="section-instructions">${convertLatexToUnicode(
              section.instructions
            )}</div>`
          : ""
      }
      
      <table class="qtable">
        ${section.selectedQuestions
          .map(
            (question, qIndex) => `
            <tr>
              <td class="qnum">Q${questionNumber + qIndex}.</td>
              <td class="qtext">${convertLatexToUnicode(question.text)}</td>
              <td class="qmarks">[${section.marksPerQuestion} ${
              section.marksPerQuestion === 1 ? "Mark" : "Marks"
            }]</td>
            </tr>
            ${
              question.type === "mcq" && question.options
                ? `
                <tr>
                  <td></td>
                  <td colspan="2">
                    <div class="options">
                      ${question.options
                        .map(
                          (option: { text: string }, optIndex: number) => `
                            <div class="option">
                              <span class="option-label">(${String.fromCharCode(
                                97 + optIndex
                              )})</span>
                              ${convertLatexToUnicode(option.text)}
                            </div>
                          `
                        )
                        .join("")}
                    </div>
                  </td>
                </tr>
                `
                : ""
            }
            ${
              (question as unknown as { diagramUrl?: string }).diagramUrl
                ? `
                <tr>
                  <td></td>
                  <td colspan="2">
                    <div style="margin: 12pt 0 12pt 40pt;">
                      <img src="${(question as unknown as { diagramUrl: string }).diagramUrl}" alt="Diagram" style="max-width: 400px; max-height: 300px; object-fit: contain;" />
                    </div>
                  </td>
                </tr>
                `
                : ""
            }
          `
          )
          .join("")}
      </table>
    </div>
    `;
    })
    .join("")}

  <div class="footer">
    <p><strong>*** End of Question Paper ***</strong></p>
    <p><em>Best of Luck!</em></p>
  </div>
</body>
</html>`;

          // Create a blob with proper Word MIME type
          const blob = new Blob([htmlContent], {
            type: "application/msword",
          });

          // Save the file (dynamic import to avoid SSR issues)
          const { saveAs } = await import("file-saver");
          saveAs(blob, `${fileName}.doc`);
          notify.success("Word document downloaded successfully!");
        }
      } catch (error) {
        console.error("Error exporting paper:", error);
        notify.error(
          `Failed to export to ${format.toUpperCase()}. ${
            error instanceof Error ? error.message : "Please try again."
          }`
        );
      } finally {
        // Always reset state to allow multiple downloads
        setExporting(null);
      }
    }, 50); // Small delay to keep UI responsive
  };

  // Print only the preview area using the same styles as the page
  const handlePrint = async () => {
    const el = document.getElementById("paper-preview");
    if (!el) return notify.error("Preview element not found");

    // Ensure all content is rendered before printing
    try {
      // Wait for MathJax if present
      const win = window as unknown as {
        MathJax?: { typesetPromise?: () => Promise<void> };
      };
      if (win?.MathJax?.typesetPromise) {
        await win.MathJax.typesetPromise();
      }
    } catch {
      console.log("MathJax not ready, continuing with print");
    }

    // Add print class and trigger print
    document.body.classList.add("print-only-preview");

    // Small delay to ensure styles are applied
    setTimeout(() => {
      window.print();

      // Remove print class after print dialog closes
      setTimeout(() => {
        document.body.classList.remove("print-only-preview");
      }, 100);
    }, 100);
  };

  return (
    <div className="space-y-6 relative">
      <style jsx global>{`
        /* Improve inline equation spacing/legibility in preview (KaTeX) */
        #paper-preview .katex {
          font-size: 1.02em;
        }
        #paper-preview .katex-display {
          margin: 0.5rem 0;
        }
        /* Thicker, stable fraction bars and radicals for better PDF capture */
        #paper-preview .katex .frac-line,
        #paper-preview .katex .mfrac .frac-line {
          border-bottom-width: 1.6px !important;
          border-top: 0 !important;
          transform: none !important;
          backface-visibility: hidden;
        }
        /* Square-root vinculum: keep as a solid rule without transforms */
        #paper-preview .katex .sqrt .vinculum {
          border-top-width: 1.6px !important;
          transform: none !important;
          backface-visibility: hidden;
        }
        #paper-preview .katex .sqrt .sqrt-sign {
          top: 0 !important; /* neutralize vertical offsets that html2canvas may exaggerate */
          line-height: 1 !important;
        }
        #paper-preview .katex .overline .overline-line,
        #paper-preview .katex .underline .underline-line {
          border-top-width: 1.6px !important;
          transform: none !important;
        }
        #paper-preview {
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }
        /* Slightly stronger rules during export snapshot for crisper rasterization */
        body.export-snapshot #paper-preview .katex .frac-line,
        body.export-snapshot #paper-preview .katex .mfrac .frac-line {
          border-bottom-width: 2px !important;
        }
        body.export-snapshot #paper-preview .katex .sqrt .vinculum {
          border-top-width: 2px !important;
        }
        @media print {
          /* Hide everything except the paper preview */
          .no-print {
            display: none !important;
          }
          body.print-only-preview * {
            visibility: hidden !important;
          }
          /* Make preview and its children visible */
          body.print-only-preview #paper-preview,
          body.print-only-preview #paper-preview * {
            visibility: visible !important;
          }
          /* Override hidden class on parent containers */
          body.print-only-preview .hidden {
            display: block !important;
          }
          /* Position and style the preview for printing */
          body.print-only-preview #paper-preview {
            position: absolute !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 110% !important;
            top: -620% !important;
            left: 0 !important;

            max-width: 120% !important;
            background: #fff !important;
            box-shadow: none !important;
            border: 0px solid #333 !important;
            border-radius: 0 !important;
          }
          /* Remove ALL padding and spacing from paper-preview and parent containers */
          body.print-only-preview #paper-preview {
            padding: 0 !important;
          }
          body.print-only-preview #paper-preview > * {
            padding-top: 0 !important;
          }
          body.print-only-preview #paper-preview > *:first-child {
            padding-top: 0 !important;
            margin-top: 0 !important;
          }
          /* Also remove padding from parent wrapper divs */
          body.print-only-preview .max-w-\[210mm\] {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          /* Minimal spacing between main sections - tight layout */
          body.print-only-preview #paper-preview > * {
            margin-top: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
          body.print-only-preview #paper-preview > *:first-child {
            margin-top: 0 !important;
          }
          /* Instructions - minimal bottom margin (one line gap) */
          body.print-only-preview #paper-preview .border-2.border-gray-300 {
            margin-bottom: 0.5rem !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important; /* DO NOT break after instructions */
          }
          /* Page break controls - prevent breaks inside elements */
          body.print-only-preview #paper-preview h1,
          body.print-only-preview #paper-preview h2,
          body.print-only-preview #paper-preview h3,
          body.print-only-preview #paper-preview h4,
          body.print-only-preview #paper-preview .border-4 {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Section headers - avoid orphaning */
          body.print-only-preview #paper-preview .border-b-2 {
            page-break-after: avoid !important;
          }
          /* Individual question - try to keep together */
          body.print-only-preview #paper-preview .space-y-4 > div {
            page-break-inside: avoid !important;
          }
          /* Diagram images - ensure visible and sized correctly */
          body.print-only-preview #paper-preview img {
            max-width: 100% !important;
            max-height: 300px !important;
            display: block !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Ensure crisp rules in printed output */
          body.print-only-preview #paper-preview .katex .frac-line,
          body.print-only-preview #paper-preview .katex .mfrac .frac-line {
            border-bottom-width: 2px !important;
          }
          body.print-only-preview #paper-preview .katex .sqrt .vinculum {
            border-top-width: 2px !important;
          }
          /* A4 page setup with NO headers/footers */
          @page {
            size: A4;
            margin: 15mm 12mm;
          }
          /* Remove browser default headers and footers */
          @page {
            margin-top: 15mm;
            margin-bottom: 15mm;
            margin-left: 12mm;
            margin-right: 12mm;
          }
          /* Remove extra padding from the container */
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      {/* Loading Overlay */}
      {exporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-2xl flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-800">
                {exporting === "pdf"
                  ? "Generating PDF..."
                  : "Generating Word Document..."}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Please wait, this may take a few moments
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Preview & Export
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review your question paper and export in your preferred format
        </p>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 md:gap-4 no-print flex-wrap">
        <Button
          onClick={handleSavePaper}
          disabled={saving || !!savedPaperId}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-xs md:text-sm px-3 md:px-4 py-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : savedPaperId ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {savedPaperId ? "Saved" : saving ? "Saving..." : "Save Paper"}
          </span>
        </Button>

        <Button
          onClick={() => handleExport("pdf")}
          disabled={exporting !== null}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-xs md:text-sm px-3 md:px-4 py-2"
        >
          {exporting === "pdf" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Export PDF</span>
        </Button>

        <Button
          onClick={() => handleExport("docx")}
          disabled={exporting !== null}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-xs md:text-sm px-3 md:px-4 py-2"
        >
          {exporting === "docx" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Export Word</span>
        </Button>

        <Button
          onClick={handlePrint}
          variant="outline"
          className="hidden md:flex items-center space-x-2"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </Button>

        {isMobile && (
          <Button
            onClick={() => setShowMobilePreview(true)}
            variant="outline"
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <span>📱 Preview</span>
          </Button>
        )}
      </div>

      {/* Paper Preview - A4 Paper Style - Hidden on Mobile */}
      <div className="hidden md:block bg-gray-100 md:p-8 rounded-lg no-print">
        <div className="max-w-[210mm] mx-auto bg-white shadow-2xl border-2 border-gray-300 rounded-lg overflow-auto">
          <div
            className="p-8 sm:p-12 space-y-8"
            id="paper-preview"
            style={{ backgroundColor: "#ffffff", color: "#1f2937" }}
          >
            {/* Header Section */}
            <div className="border-4 border-double border-gray-400 p-6 text-center">
              {formData.instituteName && (
                <h1 className="text-3xl font-bold text-gray-900 mb-3 uppercase tracking-wide">
                  {formData.instituteName}
                </h1>
              )}
              <div className="border-t-2 border-b-2 border-gray-300 py-3 my-4">
                <h2
                  className="text-2xl font-bold uppercase"
                  style={{ color: "#047857" }}
                >
                  {formData.examTitle}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-700 mt-4">
                <div className="text-left">
                  <strong>Class:</strong> {formData.className}
                </div>
                <div className="text-center">
                  <strong>Subject:</strong> {formData.subject}
                </div>
                <div className="text-right">
                  <strong>Board:</strong> {formData.board}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-700 mt-3 pt-3 border-t border-gray-200">
                <div className="text-left">
                  <strong>Date:</strong> {formData.date || "___________"}
                </div>
                <div className="text-center">
                  <strong>Duration:</strong> {formData.duration || "3 Hours"}
                </div>
                <div className="text-right">
                  <strong>Max. Marks:</strong> {calculateTotalMarks()}
                </div>
              </div>
            </div>

            {/* General Instructions */}
            <div className="border-2 border-gray-300 rounded-lg p-5 bg-gray-50">
              <h3 className="font-bold text-gray-900 mb-3 text-center text-lg uppercase tracking-wide">
                General Instructions
              </h3>
              <ul className="list-decimal list-inside text-sm text-gray-800 space-y-2 leading-relaxed">
                <li>
                  Read all instructions carefully before attempting the paper.
                </li>
                <li>
                  Attempt all questions as per the instructions given in each
                  section.
                </li>
                <li>All questions are compulsory unless stated otherwise.</li>
                <li>
                  Marks are indicated against each question. Write your answers
                  neatly and legibly.
                </li>
              </ul>
            </div>

            {/* Sections */}
            {formData.sections.map((section, sectionIndex) => {
              if (section.selectedQuestions.length === 0) return null;

              let questionNumber = 1;
              // Calculate starting question number for this section
              for (let i = 0; i < sectionIndex; i++) {
                questionNumber += formData.sections[i].selectedQuestions.length;
              }

              return (
                <div
                  key={sectionIndex}
                  className="space-y-4 page-break-inside-avoid"
                  style={{ marginTop: sectionIndex === 0 ? "1rem" : "2rem" }}
                >
                  {/* Section Header - Centered */}
                  <div className="border-b-2 border-gray-400 pb-3 mb-4">
                    <h3 className="text-xl font-bold text-gray-900 text-center uppercase tracking-wide">
                      {section.title}
                    </h3>
                    {section.instructions && (
                      <p className="text-sm text-gray-600 text-center italic mt-2">
                        {section.instructions}
                      </p>
                    )}
                  </div>

                  {/* Questions */}
                  <div className="space-y-6">
                    {section.selectedQuestions.map((question, qIndex) => (
                      <div
                        key={question._id}
                        className="pl-4 page-break-inside-avoid"
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-bold text-gray-800 text-lg flex-shrink-0 mt-1">
                            Q{questionNumber + qIndex}.
                          </span>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-gray-800 text-base leading-relaxed flex-1">
                                <MathText text={question.text} />
                              </div>
                              <div className="text-sm text-gray-600 font-medium flex-shrink-0 ml-4 whitespace-nowrap">
                                [{section.marksPerQuestion}{" "}
                                {section.marksPerQuestion === 1
                                  ? "Mark"
                                  : "Marks"}
                                ]
                              </div>
                            </div>

                            {/* MCQ Options */}
                            {question.type === "mcq" && question.options && (
                              <div className="mt-4 space-y-2">
                                {question.options.map(
                                  (
                                    option: { text: string },
                                    optIndex: number
                                  ) => (
                                    <div
                                      key={optIndex}
                                      className="text-gray-700 flex items-start gap-2"
                                    >
                                      <span className="font-semibold flex-shrink-0">
                                        ({String.fromCharCode(97 + optIndex)})
                                      </span>
                                      <span className="flex-1">
                                        <MathText text={option.text} />
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {/* Question Diagram */}
                            {(question as unknown as { diagramUrl?: string }).diagramUrl && (
                              <div className="mt-3 ml-4">
                                <img
                                  src={(question as unknown as { diagramUrl: string }).diagramUrl}
                                  alt="Diagram"
                                  className="max-w-xs h-auto max-h-40 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            {/* Marks moved inline with the question text above */}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            <div className="text-center pt-6 border-t-2 border-gray-300 text-sm text-gray-700">
              <p className="font-semibold">*** End of Question Paper ***</p>
              <p className="mt-2 italic">Best of Luck!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-white border border-green-200 dark:border-green-800 rounded-lg no-print"
      >
        <p className="text-sm text-black">
          <strong>✓ Ready to Export:</strong> Your question paper is ready! Save
          it for future use or export to PDF/Word format with proper formatting
          and equation rendering.
        </p>
      </motion.div>

      {/* Mobile Preview Modal */}
      {showMobilePreview && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col">
          {/* Modal Header */}
          <div className="bg-white shadow-lg p-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Paper Preview</h3>
            <button
              onClick={() => setShowMobilePreview(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close preview"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Scrollable Paper Content */}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-3">
            <div
              className="bg-white shadow-xl mx-auto"
              style={{ maxWidth: "100%" }}
            >
              <div
                className="p-4 space-y-4 text-sm"
                style={{ backgroundColor: "#ffffff", color: "#1f2937" }}
              >
                {/* Header Section - Mobile Optimized */}
                <div className="border-2 border-gray-400 p-3 text-center">
                  {formData.instituteName && (
                    <h1 className="text-lg font-bold text-gray-900 mb-2 uppercase">
                      {formData.instituteName}
                    </h1>
                  )}
                  <div className="border-t border-b border-gray-300 py-2 my-2">
                    <h2 className="text-base font-bold uppercase text-emerald-700">
                      {formData.examTitle}
                    </h2>
                  </div>

                  {/* Info Grid - Mobile Stack */}
                  <div className="space-y-1 text-xs text-gray-700 mt-3">
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span>
                        <strong>Class:</strong> {formData.className}
                      </span>
                      <span>
                        <strong>Subject:</strong> {formData.subject}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span>
                        <strong>Board:</strong> {formData.board}
                      </span>
                      <span>
                        <strong>Marks:</strong> {calculateTotalMarks()}
                      </span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>
                        <strong>Date:</strong> {formData.date || "___________"}
                      </span>
                      <span>
                        <strong>Time:</strong> {formData.duration || "3 Hours"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* General Instructions - Mobile */}
                <div className="border border-gray-300 rounded p-3 bg-gray-50">
                  <h3 className="font-bold text-gray-900 mb-2 text-center text-sm uppercase">
                    General Instructions
                  </h3>
                  <ul className="list-decimal list-inside text-xs text-gray-800 space-y-1 leading-relaxed">
                    <li>
                      Read all instructions carefully before attempting the
                      paper.
                    </li>
                    <li>
                      Attempt all questions as per the instructions given in
                      each section.
                    </li>
                    <li>
                      All questions are compulsory unless stated otherwise.
                    </li>
                    <li>
                      Marks are indicated against each question. Write your
                      answers neatly and legibly.
                    </li>
                  </ul>
                </div>

                {/* Sections - Mobile Optimized */}
                {formData.sections.map((section, sectionIndex) => {
                  if (section.selectedQuestions.length === 0) return null;

                  let questionNumber = 1;
                  for (let i = 0; i < sectionIndex; i++) {
                    questionNumber +=
                      formData.sections[i].selectedQuestions.length;
                  }

                  return (
                    <div key={sectionIndex} className="space-y-3 mt-4">
                      {/* Section Header */}
                      <div className="border-b-2 border-gray-400 pb-2">
                        <h3 className="text-sm font-bold text-gray-900 text-center uppercase">
                          {section.title}
                        </h3>
                        {section.instructions && (
                          <p className="text-xs text-gray-600 text-center italic mt-1">
                            {section.instructions}
                          </p>
                        )}
                      </div>

                      {/* Questions */}
                      <div className="space-y-4">
                        {section.selectedQuestions.map((question, qIndex) => (
                          <div
                            key={question._id}
                            className="border-l-2 border-emerald-500 pl-3"
                          >
                            <div className="flex gap-2">
                              <span className="font-bold text-gray-800 text-sm flex-shrink-0">
                                Q{questionNumber + qIndex}.
                              </span>
                              <div className="flex-1">
                                <div className="flex flex-col gap-1">
                                  <div className="text-gray-800 text-sm leading-relaxed">
                                    <MathText text={question.text} />
                                  </div>
                                  <div className="text-xs text-gray-600 font-medium self-end">
                                    [{section.marksPerQuestion}{" "}
                                    {section.marksPerQuestion === 1
                                      ? "Mark"
                                      : "Marks"}
                                    ]
                                  </div>
                                </div>

                                {/* MCQ Options - Mobile */}
                                {question.type === "mcq" &&
                                  question.options && (
                                    <div className="mt-2 space-y-1.5 ml-1">
                                      {question.options.map(
                                        (
                                          option: { text: string },
                                          optIndex: number
                                        ) => (
                                          <div
                                            key={optIndex}
                                            className="text-gray-700 flex gap-2 text-xs"
                                          >
                                            <span className="font-semibold flex-shrink-0">
                                              (
                                              {String.fromCharCode(
                                                97 + optIndex
                                              )}
                                              )
                                            </span>
                                            <span className="flex-1">
                                              <MathText text={option.text} />
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Footer - Mobile */}
                <div className="text-center pt-4 border-t-2 border-gray-300 text-xs text-gray-700 mt-6">
                  <p className="font-semibold">*** End of Question Paper ***</p>
                  <p className="mt-1 italic">Best of Luck!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="bg-white shadow-lg p-3 flex gap-2 overflow-x-auto">
            <Button
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 whitespace-nowrap"
            >
              {exporting === "pdf" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>PDF</span>
            </Button>

            <Button
              onClick={() => handleExport("docx")}
              disabled={exporting !== null}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 whitespace-nowrap"
            >
              {exporting === "docx" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Word</span>
            </Button>

            <Button
              onClick={handleSavePaper}
              disabled={saving || !!savedPaperId}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 whitespace-nowrap"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedPaperId ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {savedPaperId ? "Saved" : saving ? "Saving..." : "Save"}
              </span>
            </Button>

            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2 text-xs px-3 py-2 whitespace-nowrap border-gray-300"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
