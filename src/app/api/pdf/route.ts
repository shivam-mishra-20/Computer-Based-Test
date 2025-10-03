import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';
import { renderPaperHtml, PdfPaper } from '@/lib/pdfTemplate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds

export async function POST(req: NextRequest) {
  let content: string | undefined;
  try {
    const body = await req.json();
    const { html, paper } = body as { html?: string; paper?: PdfPaper };
    // Derive a base URL so that relative assets like /uploads/... resolve.
    const reqUrl = new URL(req.url);
    const baseHref = `${reqUrl.protocol}//${reqUrl.host}`;
    const assetBase =
      process.env.NEXT_PUBLIC_ASSET_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      baseHref;
    content = html || (paper ? renderPaperHtml(paper, { baseHref, assetBase }) : undefined);
    if (!content) {
      return NextResponse.json({ error: 'html or paper required' }, { status: 400 });
    }

    // Try serverless-friendly Chromium first (works on Vercel/Render),
    // fall back to full Puppeteer locally or if chromium path is unavailable.
    let browser: Awaited<ReturnType<typeof puppeteerCore.launch>> | undefined;
    try {
      const executablePath = await chromium.executablePath();
      if (executablePath) {
        browser = await puppeteerCore.launch({
          args: [
            ...chromium.args, 
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
          ],
          executablePath,
          headless: true,
        });
      }
    } catch (error) {
      console.warn('Chromium launch failed, trying local puppeteer:', error);
    }

    if (!browser) {
      const puppeteer = (await import('puppeteer')).default;
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ],
      });
    }

    const page = await browser.newPage();
    
    // Set viewport and content
    await page.setViewport({ width: 1200, height: 800 });
    await page.setContent(content, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      timeout: 30000,
    });

    await browser.close();

    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
    return new NextResponse(blob.stream(), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="paper.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: unknown) {
    console.error('PDF generation error', e);
    // Strict behavior: never return HTML fallback to avoid .html downloads
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
