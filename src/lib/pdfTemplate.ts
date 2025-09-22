export interface PdfOptionQuestion {
  text: string;
}

export interface PdfQuestion {
  text: string;
  type: string;
  options?: PdfOptionQuestion[];
  assertion?: string;
  reason?: string;
  integerAnswer?: number;
  // Optional diagram support
  diagramUrl?: string; // persisted URL (can be relative like /uploads/...)
  diagramAlt?: string;
  diagramDataUrl?: string; // in-memory preview (data:image/...)
}

export interface PdfSection {
  title: string;
  instructions?: string;
  questions: PdfQuestion[];
}

export interface PdfPaper {
  examTitle: string;
  subject?: string;
  generalInstructions?: string[];
  sections: PdfSection[];
}

const escapeHtml = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Optionally pass a baseHref (e.g., https://yourdomain.com) to resolve
// relative asset URLs like /uploads/... when Puppeteer renders the page.
export function renderPaperHtml(
  paper: PdfPaper,
  opts?: { baseHref?: string; assetBase?: string }
): string {
  const baseHref = opts?.baseHref;
  const assetBase = opts?.assetBase?.replace(/\/?$/, "");
  const escapeAttr = (s: unknown) => String(s ?? "").replace(/"/g, "&quot;");
  const srcFor = (src?: string) => {
    if (!src) return "";
    if (/^(data:|https?:)/i.test(src)) return src;
    if (assetBase && src.startsWith("/")) return `${assetBase}${src}`;
    return src;
  };
  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(paper.examTitle || "Exam")}</title>
    ${baseHref ? `<base href="${escapeAttr(baseHref)}/">` : ""}
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');
      
      html, body { 
        margin: 0; 
        padding: 0;
        font-size: 13px;
        line-height: 1.5;
      }
      
      body { 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
        color: #333; 
        background-color: #fff;
      }
      
      .container { 
        max-width: 800px; 
        margin: 0 auto; 
        padding: 15mm 12mm; 
      }

      /* Elegant header */
      .first-page-heading { 
        text-align: center; 
        font-size: 28px; 
        margin: 0 0 10mm; 
        color: #0b8a3e; 
        font-weight: 700; 
        font-family: 'Playfair Display', Georgia, serif;
        letter-spacing: 0.5px;
      }

      /* Subtle watermark */
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        color: rgba(0,0,0,0.03);
        font-size: 80px;
        font-weight: 800;
        white-space: nowrap;
        z-index: 1;
        pointer-events: none;
        font-family: 'Inter', sans-serif;
      }

      h1 { 
        text-align: center; 
        font-size: 20px; 
        margin: 0 0 5mm;
        font-weight: 600;
      }
      
      .subject { 
        text-align: center; 
        margin: 0 0 8mm; 
        font-weight: 500;
        color: #555;
      }

      ol.instructions { 
        font-size: 12px; 
        margin: 0 0 10mm 20px; 
        padding: 0;
        color: #555;
      }
      
      ol.instructions li { 
        margin: 3px 0; 
      }

      h2 { 
        font-size: 15px; 
        margin: 15px 0 10px;
        font-weight: 600;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
      }

      .question { 
        border-bottom: 1px solid #f2f2f2; 
        padding: 0 0 12px; 
        margin: 18px 0;
      }
      
      .q-text { 
        margin-bottom: 8px; 
        white-space: pre-wrap;
        font-weight: 500;
      }
      
      .meta { 
        font-size: 12px; 
        white-space: pre-wrap;
        margin: 10px 0;
        background-color: #f9f9f9;
        padding: 8px;
        border-radius: 4px;
      }
      
      .options { 
        margin-left: 20px; 
        font-size: 12px;
        padding-left: 15px;
      }
      
      .options li { 
        margin: 6px 0;
      }
      
      .diagram { 
        display: block; 
        max-width: 100%; 
        height: auto; 
        margin: 10px auto; 
        border: 1px solid #eee; 
        padding: 4px; 
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }

      .meta strong {
        color: #555;
      }
      
    </style>
  </head>
  <body>
  <div class="watermark">ABHIGYAN GURUKUL</div>
    <div class="container">
      <div class="first-page-heading">Abhigyan Gurukul</div>
      ${paper.examTitle ? `<h1>${escapeHtml(paper.examTitle)}</h1>` : ""}
      ${paper.subject ? `<div class="subject">Subject: ${escapeHtml(paper.subject)}</div>` : ""}
      ${Array.isArray(paper.generalInstructions) && paper.generalInstructions.length
        ? `<ol class="instructions">${paper.generalInstructions
            .map((i) => `<li>${escapeHtml(i)}</li>`) 
            .join("")}</ol>`
        : ""}
      ${Array.isArray(paper.sections)
        ? paper.sections
            .map(
              (sec) => `
        <section>
          <h2>${escapeHtml(sec.title)}${sec.instructions ? ` - ${escapeHtml(sec.instructions)}` : ""}</h2>
          ${Array.isArray(sec.questions)
            ? sec.questions
                .map(
                  (q, idx) => `
            <div class="question">
              <div class="q-text"><strong>${idx + 1}.</strong> ${escapeHtml(q.text)}</div>
              ${(() => { const s = srcFor(q.diagramDataUrl || q.diagramUrl); return s ? `<img class="diagram" src="${escapeAttr(s)}" alt="${escapeHtml(q.diagramAlt || 'Diagram')}" />` : ""; })()}
              ${q.type === "mcq" && Array.isArray(q.options)
                ? `<ol class="options" style="list-style-type: upper-alpha;">${q.options
                    .map((o) => `<li>${escapeHtml(o.text)}</li>`) 
                    .join("")}</ol>`
                : ""}
              ${q.type === "assertionreason"
                ? `<div class="meta"><strong>Assertion:</strong> ${escapeHtml(q.assertion)}<br/><strong>Reason:</strong> ${escapeHtml(q.reason)}</div>`
                : ""}
            </div>`
                )
                .join("")
            : ""}
        </section>`
            )
            .join("")
        : ""}
    </div>
  </body>
  </html>`;
}
