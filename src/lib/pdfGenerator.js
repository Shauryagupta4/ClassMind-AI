import { jsPDF } from 'jspdf';

/**
 * Generates an executive, beautifully formatted and aligned PDF for lecture notes.
 * Designed with precise typography, card containers, running headers/footers, and clean alignment.
 * Timestamps are explicitly omitted from the PDF per user specification.
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
  const margin = 38;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 44;

  let y = margin;

  // Helper: Truncate string safely
  const truncate = (str, maxLen = 60) => {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
  };

  // Helper: Draw running header on page 2+
  const drawPageHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(truncate(data.title || 'Lecture Notes', 60).toUpperCase(), margin, margin - 12);

    doc.setFont('helvetica', 'normal');
    doc.text('CLASSMIND AI • STUDY REVISION VAULT', pageWidth - margin, margin - 12, { align: 'right' });

    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.75);
    doc.line(margin, margin - 5, pageWidth - margin, margin - 5);
  };

  // Helper: Check space and add page with header if needed
  const ensureSpace = (neededHeight) => {
    if (y + neededHeight > bottomLimit) {
      doc.addPage();
      drawPageHeader();
      y = margin + 20;
      return true;
    }
    return false;
  };

  // ==========================================
  // 1. HERO HEADER BANNER (Page 1)
  // ==========================================
  const headerHeight = 62;
  doc.setFillColor(15, 23, 42); // Obsidian / Slate-900
  doc.roundedRect(margin, y, contentWidth, headerHeight, 6, 6, 'F');

  // Accent Bottom Stripe
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.rect(margin, y + headerHeight - 4, contentWidth, 4, 'F');

  // Brand Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('CLASSMIND AI', margin + 18, y + 26);

  // Brand Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text('COMPREHENSIVE EXAM REVISION & STUDY VAULT', margin + 18, y + 42);

  // Date Badge (Right Aligned)
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 180, 252); // Indigo-200
  doc.text(dateStr, pageWidth - margin - 18, y + 34, { align: 'right' });

  y += headerHeight + 18;

  // ==========================================
  // 2. DOCUMENT TITLE & METADATA CHIPS
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate-900

  const titleLines = doc.splitTextToSize(data.title || 'Comprehensive Lecture Notes', contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 21 + 8;

  // Meta Badges Row (Subject, Concept Count, Tone)
  let badgeX = margin;
  const drawMetaBadge = (label, bgR, bgG, bgB, textR, textG, textB, borderR, borderG, borderB) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const textWidth = doc.getTextWidth(label);
    const badgeW = textWidth + 14;
    const badgeH = 16;

    if (badgeX + badgeW > pageWidth - margin) {
      badgeX = margin;
      y += 20;
    }

    doc.setFillColor(bgR, bgG, bgB);
    doc.setDrawColor(borderR, borderG, borderB);
    doc.setLineWidth(0.75);
    doc.roundedRect(badgeX, y, badgeW, badgeH, 3, 3, 'FD');

    doc.setTextColor(textR, textG, textB);
    doc.text(label, badgeX + 7, y + 11);
    badgeX += badgeW + 8;
  };

  if (data.subject) {
    drawMetaBadge(`SUBJECT: ${data.subject.toUpperCase()}`, 238, 242, 255, 67, 56, 202, 199, 210, 254);
  }

  const sectionCount = Array.isArray(data.sections) ? data.sections.length : 0;
  if (sectionCount > 0) {
    drawMetaBadge(`${sectionCount} CORE MODULES`, 241, 245, 249, 51, 65, 85, 203, 213, 225);
  }

  if (data.teacherIntent?.overallTone) {
    drawMetaBadge(`TONE: ${data.teacherIntent.overallTone.toUpperCase()}`, 250, 245, 255, 126, 34, 206, 233, 213, 255);
  }

  if (data.teacherIntent?.examReadinessScore) {
    drawMetaBadge(`${data.teacherIntent.examReadinessScore}% EXAM WEIGHT`, 255, 241, 242, 190, 18, 60, 254, 205, 211);
  }

  y += 24;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // ==========================================
  // 3. EXECUTIVE SUMMARY CARD
  // ==========================================
  if (data.summary) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const summaryLines = doc.splitTextToSize(data.summary, contentWidth - 32);
    const cardHeight = summaryLines.length * 13.5 + 32;

    ensureSpace(cardHeight + 10);

    // Card background & border
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 5, 5, 'FD');

    // Left indicator bar (Indigo)
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, y, 4, cardHeight, 2, 2, 'F');

    // Header label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('EXECUTIVE OVERVIEW', margin + 16, y + 16);

    // Text content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(summaryLines, margin + 16, y + 30);

    y += cardHeight + 16;
  }

  // ==========================================
  // 4. TEACHER'S INTENT & EXAM RADAR (HIGH-YIELD & TRAPS)
  // ==========================================
  const highYieldTopics = data.teacherIntent?.highYieldTopics || [];
  const warningTraps = data.teacherIntent?.warningTraps || [];

  if (highYieldTopics.length > 0 || warningTraps.length > 0) {
    ensureSpace(60);

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('EXAM INTENT & HIGH-YIELD PROBABLES', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Analysis of instructor vocal emphasis, exam weightage & critical traps', margin, y + 11);
    y += 20;

    // A. High-Yield Exam Topics
    if (highYieldTopics.length > 0) {
      highYieldTopics.forEach((item, idx) => {
        const itemTopic = item.topic || `Priority Topic ${idx + 1}`;
        const intentLevel = item.intentLevel || 'MUST-KNOW';
        const verbalCues = item.verbalCues;
        const whyImportant = item.whyImportant;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const topicLines = doc.splitTextToSize(`${idx + 1}. [${intentLevel}] ${itemTopic}`, contentWidth - 32);

        let itemHeight = topicLines.length * 13 + 12;
        let cueLines = [];
        let noteLines = [];

        if (verbalCues) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          cueLines = doc.splitTextToSize(`Instructor Cue: "${verbalCues}"`, contentWidth - 36);
          itemHeight += cueLines.length * 11 + 6;
        }

        if (whyImportant) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          noteLines = doc.splitTextToSize(`Exam Relevance: ${whyImportant}`, contentWidth - 36);
          itemHeight += noteLines.length * 11 + 6;
        }

        ensureSpace(itemHeight + 8);

        // Card Container
        doc.setFillColor(255, 241, 242); // Rose-50
        doc.setDrawColor(254, 205, 211); // Rose-200
        doc.setLineWidth(0.75);
        doc.roundedRect(margin, y, contentWidth, itemHeight, 4, 4, 'FD');

        // Left Accent Bar (Rose-600)
        doc.setFillColor(225, 29, 72);
        doc.rect(margin, y, 3.5, itemHeight, 'F');

        // Heading
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(159, 18, 57); // Rose-800
        doc.text(topicLines, margin + 14, y + 12);
        let internalY = y + 12 + topicLines.length * 13;

        // Verbal Cue
        if (cueLines.length > 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(cueLines, margin + 14, internalY);
          internalY += cueLines.length * 11 + 4;
        }

        // Exam Note
        if (noteLines.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text(noteLines, margin + 14, internalY);
        }

        y += itemHeight + 8;
      });
    }

    // B. Warning Traps & Common Confusion
    if (warningTraps.length > 0) {
      warningTraps.forEach((trap, idx) => {
        const concept = trap.concept || `Pitfall Concept ${idx + 1}`;
        const warning = trap.warning || '';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        const conceptLines = doc.splitTextToSize(`PITFALL #${idx + 1}: ${concept}`, contentWidth - 32);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const warningLines = doc.splitTextToSize(`Warning: ${warning}`, contentWidth - 32);

        const cardH = conceptLines.length * 12 + warningLines.length * 11 + 16;
        ensureSpace(cardH + 8);

        doc.setFillColor(254, 243, 199); // Amber-100
        doc.setDrawColor(253, 230, 138); // Amber-200
        doc.setLineWidth(0.75);
        doc.roundedRect(margin, y, contentWidth, cardH, 4, 4, 'FD');

        doc.setFillColor(217, 119, 6); // Amber-600
        doc.rect(margin, y, 3.5, cardH, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(146, 64, 14); // Amber-800
        doc.text(conceptLines, margin + 14, y + 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(69, 26, 3);
        doc.text(warningLines, margin + 14, y + 11 + conceptLines.length * 12);

        y += cardH + 8;
      });
    }

    y += 10;
  }

  // ==========================================
  // 5. KEY TERMS & GLOSSARY (ELEGANT 2-COLUMN OR CLEAN LIST)
  // ==========================================
  const rawTerms = data.keyTerms || [];
  if (Array.isArray(rawTerms) && rawTerms.length > 0) {
    ensureSpace(60);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('KEY TERMS & GLOSSARY', margin, y);
    y += 14;

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

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const termLines = doc.splitTextToSize(termStr, contentWidth - 28);

      let defLines = [];
      if (defStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        defLines = doc.splitTextToSize(defStr, contentWidth - 28);
      }

      const termHeight = termLines.length * 11 + (defLines.length > 0 ? defLines.length * 10.5 + 4 : 0) + 6;
      ensureSpace(termHeight + 4);

      // Bullet dot
      doc.setFillColor(79, 70, 229); // Indigo
      doc.circle(margin + 5, y + 5, 2, 'F');

      // Term
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(termLines, margin + 14, y + 7);

      let subY = y + 7 + termLines.length * 11;

      // Definition
      if (defLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(defLines, margin + 14, subY);
      }

      y += termHeight + 4;
    });

    y += 12;
  }

  // ==========================================
  // 6. COMPREHENSIVE CONCEPTUAL LECTURE SECTIONS
  // ==========================================
  const sections = Array.isArray(data.sections) ? data.sections : [];

  if (sections.length > 0) {
    ensureSpace(45);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('COMPREHENSIVE CONCEPTUAL BREAKDOWN', margin, y);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.75);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    y += 18;

    sections.forEach((section, idx) => {
      ensureSpace(60);

      // Section Number Badge
      const numBoxSize = 18;
      doc.setFillColor(238, 242, 255); // Indigo-50
      doc.setDrawColor(199, 210, 254); // Indigo-200
      doc.setLineWidth(1);
      doc.roundedRect(margin, y - 2, numBoxSize, numBoxSize, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(67, 56, 202); // Indigo-700
      doc.text(String(idx + 1), margin + (numBoxSize / 2), y + 10, { align: 'center' });

      // Section Heading (No timestamps!)
      const badgePrefix = section.intentBadge ? `[${section.intentBadge}] ` : '';
      const headingText = `${badgePrefix}${section.heading || `Concept Module ${idx + 1}`}`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const headingLines = doc.splitTextToSize(headingText, contentWidth - 30);
      doc.text(headingLines, margin + 26, y + 10);
      y += Math.max(numBoxSize, headingLines.length * 15) + 6;

      // Teacher vocal note / emphasis if present
      if (section.teacherEmphasis) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const emphasisLines = doc.splitTextToSize(`Instructor Vocal Note: "${section.teacherEmphasis}"`, contentWidth - 32);
        const emphHeight = emphasisLines.length * 11 + 10;

        ensureSpace(emphHeight + 4);

        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin + 12, y, contentWidth - 12, emphHeight, 3, 3, 'FD');

        doc.setTextColor(71, 85, 105);
        doc.text(emphasisLines, margin + 22, y + 10);
        y += emphHeight + 6;
      }

      // Key Takeaway Bullet Points
      if (Array.isArray(section.points) && section.points.length > 0) {
        section.points.forEach((point) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          const pointLines = doc.splitTextToSize(point, contentWidth - 32);
          const pointHeight = pointLines.length * 12.5 + 4;

          ensureSpace(pointHeight + 3);

          // Custom square bullet
          doc.setFillColor(99, 102, 241); // Indigo-500
          doc.rect(margin + 14, y + 3, 3, 3, 'F');

          doc.setTextColor(51, 65, 85); // Slate-700
          doc.text(pointLines, margin + 24, y + 8);
          y += pointHeight;
        });
        y += 4;
      }

      // Detailed Conceptual Breakdown & Deep Dive (In-depth notes)
      if (section.detailedContent) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const detailedLines = doc.splitTextToSize(section.detailedContent, contentWidth - 40);

        // Header for detailed breakdown
        ensureSpace(28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text('DETAILED CONCEPTUAL BREAKDOWN & ANALYSIS:', margin + 14, y + 6);
        y += 14;

        // Render detailed content safely with continuous left accent bar across pages
        const lineHeight = 12;
        let blockStartIndex = 0;

        while (blockStartIndex < detailedLines.length) {
          const linesAvailable = Math.max(1, Math.floor((bottomLimit - y) / lineHeight));
          const linesToPrint = detailedLines.slice(blockStartIndex, blockStartIndex + linesAvailable);
          const blockH = linesToPrint.length * lineHeight + 8;

          // Background card for current page segment
          doc.setFillColor(248, 250, 252); // Slate-50
          doc.setDrawColor(226, 232, 240); // Slate-200
          doc.setLineWidth(0.75);
          doc.roundedRect(margin + 12, y - 2, contentWidth - 12, blockH, 3, 3, 'FD');

          // Left border bar
          doc.setFillColor(99, 102, 241); // Indigo
          doc.rect(margin + 12, y - 2, 2.5, blockH, 'F');

          // Print lines
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59); // Slate-800
          doc.text(linesToPrint, margin + 22, y + 8);

          y += blockH + 6;
          blockStartIndex += linesToPrint.length;

          if (blockStartIndex < detailedLines.length) {
            doc.addPage();
            drawPageHeader();
            y = margin + 20;
          }
        }

        y += 8;
      }

      y += 8;
    });
  }

  // ==========================================
  // 7. COMPREHENSIVE ACADEMIC STUDY GUIDE (Deep Dive)
  // ==========================================
  if (data.comprehensiveGuide) {
    ensureSpace(45);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('ACADEMIC MASTER STUDY GUIDE & SYNTHESIS', margin, y);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.75);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const guideLines = doc.splitTextToSize(data.comprehensiveGuide, contentWidth - 16);

    const guideLineHeight = 12.5;
    let guideIndex = 0;

    while (guideIndex < guideLines.length) {
      const available = Math.max(1, Math.floor((bottomLimit - y) / guideLineHeight));
      const chunk = guideLines.slice(guideIndex, guideIndex + available);

      doc.text(chunk, margin + 8, y + 8);
      y += chunk.length * guideLineHeight;
      guideIndex += chunk.length;

      if (guideIndex < guideLines.length) {
        doc.addPage();
        drawPageHeader();
        y = margin + 20;
      }
    }

    y += 14;
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
    doc.text('ClassMind AI • Smart Revision & Active Recall Notes', margin, pageHeight - 16);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 16, { align: 'right' });
  }

  // Download PDF
  const safeTitle = (data.title || 'lecture_notes').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${safeTitle}.pdf`);
}
