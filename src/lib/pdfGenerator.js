import { jsPDF } from 'jspdf';

/**
 * Robust text sanitization function for jsPDF Helvetica / standard Latin-1 encoding.
 * Completely strips all emojis (which cause corrupted characters like Ø<ß¯),
 * converts typographical quotes/dashes/bullets to clean ASCII equivalents,
 * and strips non-printable characters to ensure text never corrupts or clips.
 */
function sanitize(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    // Strip all Unicode emojis and symbols
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    // Convert typographic symbols to standard ASCII
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/[…]/g, '...')
    .replace(/[\u00A0\u2000-\u200B]/g, ' ')
    // Remove unprintable control characters except newline and tab
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Generates an exhaustive, beautifully aligned, textbook-grade Master Detailed Notes PDF.
 * - Emojis and corrupted unicode symbols are completely sanitized.
 * - Text wrapping uses strict inner boundary math to guarantee text never cuts out of frame.
 * - Detailed lecture content, comprehensive study compendium, and deep conceptual breakdowns are front and center.
 * - Timestamps are omitted from the PDF per user specification.
 *
 * @param {Object} data - Lecture data containing title, subject, summary, sections, keyTerms, teacherIntent, comprehensiveGuide.
 */
export function generateLecturePDF(data) {
  if (!data) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2; // 515.28 pt on A4
  const bottomLimit = pageHeight - 48; // Leaves room for clean footer

  let y = margin;

  // Running page header for page 2+
  const drawPageHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    const cleanTitle = sanitize(data.title || 'Comprehensive Lecture Notes');
    const headerTitle = cleanTitle.length > 55 ? cleanTitle.slice(0, 52) + '...' : cleanTitle;
    doc.text(headerTitle.toUpperCase(), margin, margin - 14);

    doc.setFont('helvetica', 'normal');
    doc.text('CLASSMIND AI • MASTER STUDY NOTES', pageWidth - margin, margin - 14, { align: 'right' });

    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.75);
    doc.line(margin, margin - 6, pageWidth - margin, margin - 6);
  };

  // Space verification & automatic page breaking helper
  const ensureSpace = (neededHeight) => {
    if (y + neededHeight > bottomLimit) {
      doc.addPage();
      drawPageHeader();
      y = margin + 18;
      return true;
    }
    return false;
  };

  // Helper to safely render multi-line text blocks with exact width bounds
  const renderParagraph = (text, startX, maxW, fontSize = 9, fontStyle = 'normal', color = [51, 65, 85], lineSpacing = 13.5) => {
    if (!text) return;
    const cleanText = sanitize(text);
    if (!cleanText) return;

    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(cleanText, maxW);
    lines.forEach((line) => {
      ensureSpace(lineSpacing + 2);
      doc.text(line, startX, y);
      y += lineSpacing;
    });
  };

  // ==========================================
  // 1. HERO COVER HEADER (Page 1)
  // ==========================================
  const bannerHeight = 58;
  doc.setFillColor(15, 23, 42); // Obsidian / Slate-900
  doc.roundedRect(margin, y, contentWidth, bannerHeight, 4, 4, 'F');

  // Vibrant Indigo accent stripe
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.rect(margin, y + bannerHeight - 4, contentWidth, 4, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('CLASSMIND AI', margin + 16, y + 25);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('MASTER COMPREHENSIVE LECTURE STUDY COMPENDIUM', margin + 16, y + 40);

  // Date Badge
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254);
  doc.text(dateStr, pageWidth - margin - 16, y + 32, { align: 'right' });

  y += bannerHeight + 18;

  // ==========================================
  // 2. DOCUMENT TITLE & COURSE METADATA
  // ==========================================
  const rawTitle = sanitize(data.title || 'Comprehensive Lecture Notes');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42); // Slate-900

  const safeTitleLines = doc.splitTextToSize(rawTitle, contentWidth - 10);
  safeTitleLines.forEach((tLine) => {
    ensureSpace(22);
    doc.text(tLine, margin, y);
    y += 21;
  });
  y += 6;

  // Metadata Chips
  let chipX = margin;
  const drawChip = (label, bgR, bgG, bgB, textR, textG, textB, borderR, borderG, borderB) => {
    const cleanLabel = sanitize(label);
    if (!cleanLabel) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const chipTextW = doc.getTextWidth(cleanLabel);
    const chipW = chipTextW + 14;
    const chipH = 15;

    if (chipX + chipW > pageWidth - margin) {
      chipX = margin;
      y += 19;
    }

    doc.setFillColor(bgR, bgG, bgB);
    doc.setDrawColor(borderR, borderG, borderB);
    doc.setLineWidth(0.75);
    doc.roundedRect(chipX, y, chipW, chipH, 3, 3, 'FD');

    doc.setTextColor(textR, textG, textB);
    doc.text(cleanLabel, chipX + 7, y + 10.5);
    chipX += chipW + 8;
  };

  if (data.subject) {
    drawChip(`SUBJECT: ${data.subject.toUpperCase()}`, 238, 242, 255, 67, 56, 202, 199, 210, 254);
  }

  const sectionsCount = Array.isArray(data.sections) ? data.sections.length : 0;
  if (sectionsCount > 0) {
    drawChip(`${sectionsCount} DETAILED MODULES`, 241, 245, 249, 51, 65, 85, 203, 213, 225);
  }

  if (data.teacherIntent?.overallTone) {
    drawChip(`TONE: ${data.teacherIntent.overallTone.toUpperCase()}`, 250, 245, 255, 126, 34, 206, 233, 213, 255);
  }

  if (data.teacherIntent?.examReadinessScore) {
    drawChip(`${data.teacherIntent.examReadinessScore}% EXAM WEIGHT`, 255, 241, 242, 190, 18, 60, 254, 205, 211);
  }

  y += 24;

  // Horizontal Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // ==========================================
  // 3. EXECUTIVE SUMMARY & OBJECTIVES
  // ==========================================
  if (data.summary) {
    const cleanSummary = sanitize(data.summary);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const summaryLines = doc.splitTextToSize(cleanSummary, contentWidth - 32);
    const cardH = summaryLines.length * 13.5 + 28;

    ensureSpace(cardH + 12);

    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.75);
    doc.roundedRect(margin, y, contentWidth, cardH, 4, 4, 'FD');

    // Left accent bar
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(margin, y, 3.5, cardH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('EXECUTIVE LECTURE OVERVIEW & OBJECTIVES', margin + 14, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(summaryLines, margin + 14, y + 27);

    y += cardH + 18;
  }

  // ==========================================
  // 4. MAIN BODY: COMPREHENSIVE DETAILED LECTURE NOTES (MODULE BY MODULE)
  // ==========================================
  const sections = Array.isArray(data.sections) ? data.sections : [];

  if (sections.length > 0) {
    ensureSpace(40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('SECTION 1: COMPREHENSIVE MODULAR LECTURE NOTES', margin, y);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.75);
    doc.line(margin, y + 5, pageWidth - margin, y + 5);
    y += 18;

    sections.forEach((section, idx) => {
      ensureSpace(60);

      // Clean heading & badge (NO corrupted emoji unicode)
      const rawBadge = sanitize(section.intentBadge || '').replace(/[\[\]]/g, '').trim();
      const rawHeading = sanitize(section.heading || `Core Topic ${idx + 1}`);
      const badgePrefix = rawBadge ? `[${rawBadge}] ` : '';
      const fullHeading = `MODULE ${idx + 1}: ${badgePrefix}${rawHeading}`;

      // Calculate width conservatively to prevent cutting out of frame
      const maxHeadingW = contentWidth - 36;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);

      const headingLines = doc.splitTextToSize(fullHeading, maxHeadingW);

      // Module Card Top Header
      const headerBoxH = headingLines.length * 14.5 + 14;
      ensureSpace(headerBoxH + 10);

      doc.setFillColor(241, 245, 249); // Slate-100
      doc.setDrawColor(203, 213, 225); // Slate-300
      doc.setLineWidth(0.75);
      doc.roundedRect(margin, y, contentWidth, headerBoxH, 4, 4, 'FD');

      // Left Accent Strip
      doc.setFillColor(79, 70, 229); // Indigo
      doc.rect(margin, y, 4, headerBoxH, 'F');

      // Draw Heading Text
      doc.text(headingLines, margin + 14, y + 14);
      y += headerBoxH + 10;

      // Teacher vocal note / emphasis if present
      if (section.teacherEmphasis) {
        const cleanEmphasis = sanitize(section.teacherEmphasis);
        if (cleanEmphasis) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          const emphLines = doc.splitTextToSize(`Instructor Vocal Note: "${cleanEmphasis}"`, contentWidth - 32);
          const emphH = emphLines.length * 11.5 + 8;

          ensureSpace(emphH + 6);

          doc.setFillColor(255, 251, 235); // Amber-50
          doc.setDrawColor(253, 230, 138); // Amber-200
          doc.roundedRect(margin + 6, y, contentWidth - 12, emphH, 3, 3, 'FD');

          doc.setTextColor(146, 64, 14); // Amber-800
          doc.text(emphLines, margin + 14, y + 10);
          y += emphH + 8;
        }
      }

      // --- Part A: In-Depth Conceptual Theory & Full Explanations ---
      if (section.detailedContent) {
        const cleanDetailed = sanitize(section.detailedContent);
        if (cleanDetailed) {
          ensureSpace(28);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(79, 70, 229); // Indigo-600
          doc.text('IN-DEPTH CONCEPTUAL THEORY & DETAILED BREAKDOWN:', margin + 6, y + 6);
          y += 15;

          // Split by paragraphs to give rich textbook readability
          const paragraphs = cleanDetailed.split(/\n\s*\n|\n/).filter(p => p.trim().length > 0);

          paragraphs.forEach((para) => {
            renderParagraph(
              para.trim(),
              margin + 6,
              contentWidth - 14,
              8.5,
              'normal',
              [30, 41, 59], // Slate-800
              13
            );
            y += 5; // Paragraph spacing
          });
          y += 4;
        }
      }

      // --- Part B: Key Principles & Core Bullet Breakdown ---
      if (Array.isArray(section.points) && section.points.length > 0) {
        ensureSpace(24);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text('KEY PRINCIPLES & CORE TAKEAWAYS:', margin + 6, y + 4);
        y += 12;

        section.points.forEach((point) => {
          const cleanPoint = sanitize(point);
          if (!cleanPoint) return;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          const pointLines = doc.splitTextToSize(cleanPoint, contentWidth - 36);
          const pointHeight = pointLines.length * 12.5 + 4;

          ensureSpace(pointHeight + 4);

          // Custom square bullet dot
          doc.setFillColor(99, 102, 241); // Indigo-500
          doc.rect(margin + 8, y + 2, 3, 3, 'F');

          doc.setTextColor(51, 65, 85); // Slate-700
          doc.text(pointLines, margin + 18, y + 6);
          y += pointHeight;
        });
        y += 6;
      }

      // Subtle module separator
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(margin + 20, y, pageWidth - margin - 20, y);
      y += 14;
    });

    y += 10;
  }

  // ==========================================
  // 5. ACADEMIC MASTER STUDY COMPENDIUM & SYNTHESIS (Deep Dive Chapter)
  // ==========================================
  if (data.comprehensiveGuide) {
    const cleanGuide = sanitize(data.comprehensiveGuide);
    if (cleanGuide && cleanGuide.length > 20) {
      ensureSpace(45);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('SECTION 2: MASTER ACADEMIC STUDY COMPENDIUM & SYNTHESIS', margin, y);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.75);
      doc.line(margin, y + 5, pageWidth - margin, y + 5);
      y += 18;

      // Parse markdown-style sections and render as academic book text
      const rawLines = cleanGuide.split('\n');

      rawLines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          y += 5;
          return;
        }

        // Heading Level 3 (###)
        if (trimmed.startsWith('###')) {
          const text = trimmed.replace(/^###\s*/, '');
          ensureSpace(24);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(79, 70, 229); // Indigo
          doc.text(sanitize(text), margin + 4, y + 6);
          y += 16;
          return;
        }

        // Heading Level 2 (##)
        if (trimmed.startsWith('##')) {
          const text = trimmed.replace(/^##\s*/, '');
          ensureSpace(28);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(15, 23, 42); // Slate-900
          doc.text(sanitize(text), margin, y + 8);
          y += 18;
          return;
        }

        // Heading Level 1 (#)
        if (trimmed.startsWith('#')) {
          const text = trimmed.replace(/^#\s*/, '');
          ensureSpace(32);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11.5);
          doc.setTextColor(15, 23, 42);
          doc.text(sanitize(text), margin, y + 10);
          y += 20;
          return;
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.replace(/^[-*]\s*/, '');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          const bLines = doc.splitTextToSize(sanitize(text), contentWidth - 30);
          const bHeight = bLines.length * 12.5 + 3;

          ensureSpace(bHeight + 3);

          doc.setFillColor(99, 102, 241);
          doc.rect(margin + 6, y + 2, 2.5, 2.5, 'F');

          doc.setTextColor(51, 65, 85);
          doc.text(bLines, margin + 16, y + 6);
          y += bHeight;
          return;
        }

        // Regular paragraph text
        renderParagraph(trimmed, margin + 4, contentWidth - 12, 8.5, 'normal', [51, 65, 85], 13);
      });

      y += 14;
    }
  }

  // ==========================================
  // 6. APPENDIX: TEACHER'S EXAM RADAR & WARNING PITFALLS
  // ==========================================
  const highYieldTopics = data.teacherIntent?.highYieldTopics || [];
  const warningTraps = data.teacherIntent?.warningTraps || [];

  if (highYieldTopics.length > 0 || warningTraps.length > 0) {
    ensureSpace(45);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('SECTION 3: EXAM STRATEGY, GUARANTEED PROBABLES & PITFALL TRAPS', margin, y);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.75);
    doc.line(margin, y + 5, pageWidth - margin, y + 5);
    y += 16;

    // High Yield Topics
    if (highYieldTopics.length > 0) {
      highYieldTopics.forEach((item, idx) => {
        const topicName = sanitize(item.topic || `Priority Topic ${idx + 1}`);
        const intentLevel = sanitize(item.intentLevel || 'MUST-KNOW');
        const verbalCues = sanitize(item.verbalCues || '');
        const whyImportant = sanitize(item.whyImportant || '');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        const titleLines = doc.splitTextToSize(`* [${intentLevel}] ${topicName}`, contentWidth - 28);

        let cueLines = [];
        let whyLines = [];

        if (verbalCues) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          cueLines = doc.splitTextToSize(`Instructor Vocal Cue: "${verbalCues}"`, contentWidth - 32);
        }

        if (whyImportant) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          whyLines = doc.splitTextToSize(`Exam Relevance: ${whyImportant}`, contentWidth - 32);
        }

        const cardH = titleLines.length * 12 + cueLines.length * 11 + whyLines.length * 11 + 14;
        ensureSpace(cardH + 6);

        doc.setFillColor(255, 241, 242); // Rose-50
        doc.setDrawColor(254, 205, 211); // Rose-200
        doc.roundedRect(margin, y, contentWidth, cardH, 3, 3, 'FD');

        doc.setFillColor(225, 29, 72); // Rose-600
        doc.rect(margin, y, 3.5, cardH, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(159, 18, 57);
        doc.text(titleLines, margin + 12, y + 11);

        let subY = y + 11 + titleLines.length * 12;

        if (cueLines.length > 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(cueLines, margin + 14, subY);
          subY += cueLines.length * 11;
        }

        if (whyLines.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(whyLines, margin + 14, subY);
        }

        y += cardH + 6;
      });
    }

    // Warning Traps
    if (warningTraps.length > 0) {
      warningTraps.forEach((trap, idx) => {
        const concept = sanitize(trap.concept || `Pitfall Concept ${idx + 1}`);
        const warning = sanitize(trap.warning || '');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        const conceptLines = doc.splitTextToSize(`[PITFALL TRAP #${idx + 1}] ${concept}`, contentWidth - 28);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const warningLines = doc.splitTextToSize(`Caution: ${warning}`, contentWidth - 28);

        const trapCardH = conceptLines.length * 12 + warningLines.length * 11 + 14;
        ensureSpace(trapCardH + 6);

        doc.setFillColor(254, 243, 199); // Amber-100
        doc.setDrawColor(253, 230, 138); // Amber-200
        doc.roundedRect(margin, y, contentWidth, trapCardH, 3, 3, 'FD');

        doc.setFillColor(217, 119, 6); // Amber-600
        doc.rect(margin, y, 3.5, trapCardH, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(146, 64, 14);
        doc.text(conceptLines, margin + 12, y + 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(69, 26, 3);
        doc.text(warningLines, margin + 12, y + 11 + conceptLines.length * 12);

        y += trapCardH + 6;
      });
    }

    y += 10;
  }

  // ==========================================
  // 7. APPENDIX: KEY TERMS & DEFINITIONS GLOSSARY
  // ==========================================
  const rawTerms = data.keyTerms || [];
  if (Array.isArray(rawTerms) && rawTerms.length > 0) {
    ensureSpace(45);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('SECTION 4: KEY TERMS & ACADEMIC GLOSSARY', margin, y);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.75);
    doc.line(margin, y + 5, pageWidth - margin, y + 5);
    y += 16;

    rawTerms.forEach((termItem) => {
      let termStr = typeof termItem === 'string' ? termItem : (termItem.term || JSON.stringify(termItem));
      let defStr = '';

      if (typeof termItem === 'object' && termItem.definition) {
        termStr = termItem.term || termItem.name || 'Term';
        defStr = termItem.definition;
      } else if (termStr.includes(':')) {
        const parts = termStr.split(':');
        termStr = parts[0].trim();
        defStr = parts.slice(1).join(':').trim();
      } else if (termStr.includes(' - ')) {
        const parts = termStr.split(' - ');
        termStr = parts[0].trim();
        defStr = parts.slice(1).join(' - ').trim();
      }

      termStr = sanitize(termStr);
      defStr = sanitize(defStr);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const termLines = doc.splitTextToSize(termStr, contentWidth - 28);

      let defLines = [];
      if (defStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        defLines = doc.splitTextToSize(defStr, contentWidth - 28);
      }

      const termH = termLines.length * 11 + (defLines.length > 0 ? defLines.length * 10.5 + 4 : 0) + 6;
      ensureSpace(termH + 4);

      doc.setFillColor(79, 70, 229);
      doc.circle(margin + 5, y + 5, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(termLines, margin + 14, y + 7);

      let subY = y + 7 + termLines.length * 11;

      if (defLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(defLines, margin + 14, subY);
      }

      y += termH + 4;
    });

    y += 12;
  }

  // ==========================================
  // 8. GLOBAL RUNNING FOOTERS (ALL PAGES)
  // ==========================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Hairline divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);

    // Footer Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text('ClassMind AI • Comprehensive Lecture Notes & Study Compendium', margin, pageHeight - 16);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 16, { align: 'right' });
  }

  // Download PDF
  const safeTitle = sanitize(data.title || 'lecture_notes').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${safeTitle || 'comprehensive_notes'}.pdf`);
}
