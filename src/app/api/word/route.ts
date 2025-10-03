import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Question {
  text: string;
  options?: Array<{ text: string }>;
}

interface Section {
  title: string;
  instructions?: string;
  marksPerQuestion?: number;
  questions?: Question[];
}

interface Paper {
  examTitle: string;
  subject?: string;
  totalMarks?: number;
  meta?: { durationMins?: number };
  generalInstructions?: string[];
  sections?: Section[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paper } = body as { paper: Paper };
    
    if (!paper) {
      return NextResponse.json({ error: 'paper data required' }, { status: 400 });
    }

    const { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType, UnderlineType } = await import('docx');
    
    // Create document structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [];
    
    // Title
    children.push(
      new Paragraph({
        children: [new TextRun({ text: paper.examTitle, bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
    
    // Subject
    if (paper.subject) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Subject: ${paper.subject}`, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );
    }
    
    // Meta information
    const metaInfo: string[] = [];
    if (paper.totalMarks) {
      metaInfo.push(`Total Marks: ${paper.totalMarks}`);
    }
    if (paper.meta?.durationMins) {
      metaInfo.push(`Time: ${paper.meta.durationMins} mins`);
    }
    if (metaInfo.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: metaInfo.join(' | '), italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }
    
    // General Instructions
    if (Array.isArray(paper.generalInstructions) && paper.generalInstructions.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'General Instructions:', bold: true, underline: { type: UnderlineType.SINGLE } })],
          spacing: { after: 100 },
        })
      );
      
      paper.generalInstructions.forEach((instruction: string, index: number) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${index + 1}. ${instruction}` })],
            spacing: { after: 50 },
          })
        );
      });
      
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: { after: 200 },
        })
      );
    }
    
    // Sections and Questions
    paper.sections?.forEach((section: Section) => {
      // Section title
      const sectionTitle = section.title + (section.marksPerQuestion ? ` (Marks per Question: ${section.marksPerQuestion})` : '');
      children.push(
        new Paragraph({
          children: [new TextRun({ text: sectionTitle, bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      // Section instructions
      if (section.instructions) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: section.instructions, italics: true })],
            spacing: { after: 100 },
          })
        );
      }
      
      // Questions
      section.questions?.forEach((question: Question, questionIndex: number) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${questionIndex + 1}. ${question.text}`, bold: true })],
            spacing: { before: 100, after: 50 },
          })
        );
        
        // Multiple choice options
        if (question.options && Array.isArray(question.options)) {
          question.options.forEach((option: { text: string }, optionIndex: number) => {
            const optionLabel = String.fromCharCode(97 + optionIndex); // a, b, c, d
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `   ${optionLabel}) ${option.text}` })],
                spacing: { after: 25 },
              })
            );
          });
        }
      });
    });
    
    const docx = new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });
    
    const buffer = await Packer.toBuffer(docx);
    
    const blob = new Blob([new Uint8Array(buffer)], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    return new NextResponse(blob.stream(), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${(paper.examTitle || 'paper').replace(/[^a-z0-9-_]+/gi, '_')}.docx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: unknown) {
    console.error('Word generation error', e);
    return NextResponse.json({ error: 'Failed to generate Word document' }, { status: 500 });
  }  
}