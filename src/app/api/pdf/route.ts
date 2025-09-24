import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';
import { renderPaperHtml, PdfPaper } from '@/lib/pdfTemplate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
  const { html, paper } = body as { html?: string; paper?: PdfPaper };
  // Derive a base URL so that relative assets like /uploads/... resolve.
  const reqUrl = new URL(req.url);
  const baseHref = `${reqUrl.protocol}//${reqUrl.host}`;
    const assetBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.PUBLIC_BASE_URL ||
      baseHref;
  const content = html || (paper ? renderPaperHtml(paper, { baseHref, assetBase }) : undefined);
    if (!content) {
      return NextResponse.json({ error: 'html or paper required' }, { status: 400 });
    }

    // Configure Chromium for Vercel
    let browser: Awaited<ReturnType<typeof puppeteerCore.launch>>;
    if (process.env.VERCEL) {
      const executablePath = await chromium.executablePath();
      browser = await puppeteerCore.launch({
        args: chromium.args,
        executablePath,
        headless: true,
      });
    } else {
      // Local dev fallback to full puppeteer
      const puppeteer = (await import('puppeteer')).default;
      browser = await puppeteer.launch({ headless: true });
    }
    const page = await browser.newPage();
    await page.setContent(content, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });

    await browser.close();

    // Convert Buffer/Uint8Array to ArrayBuffer for Web Response
    const uint8 = new Uint8Array(pdfBuffer);
    const blob = new Blob([uint8], { type: 'application/pdf' });
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="paper.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: unknown) {
    console.error('PDF generation error', e);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
