import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a beautifully formatted PDF of the lecture notes.
 * Handles page splitting, margins, typography, and styling.
 * @param {Object} data - Lecture data containing title, subject, summary, sections, keyTerms.
 */
export function generateLecturePDF(data) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to check page overflow and add page
  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - margin - 30) {
      doc.addPage();
      y = margin + 20;
      // Header on subsequent pages
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(`${data.title || 'Lecture Notes'} • ClassMind AI`, margin, margin);
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, margin + 5, pageWidth - margin, margin + 5);
      y += 10;
    }
  };

  // 1. Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, y, contentWidth, 54, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('CLASSMIND AI', margin + 16, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Smart Revision Notes & Active Recall Synthesis', margin + 16, y + 42);

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  doc.setFontSize(9);
  doc.text(dateStr, pageWidth - margin - 16, y + 33, { align: 'right' });

  y += 75;

  // 2. Lecture Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Slate-900
  const titleLines = doc.splitTextToSize(data.title || 'Untitled Lecture', contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22 + 4;

  // 3. Subject Badge
  if (data.subject) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.setFillColor(238, 242, 255); // Indigo-50
    const badgeText = `SUBJECT: ${data.subject.toUpperCase()}`;
    const badgeWidth = doc.getTextWidth(badgeText) + 16;
    doc.roundedRect(margin, y, badgeWidth, 18, 4, 4, 'F');
    doc.text(badgeText, margin + 8, y + 12);
    y += 28;
  }

  // 4. Executive Summary Box
  if (data.summary) {
    checkPageBreak(80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Executive Summary', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const summaryLines = doc.splitTextToSize(data.summary, contentWidth - 24);
    const boxHeight = summaryLines.length * 14 + 16;

    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(margin, y, contentWidth, boxHeight, 4, 4, 'FD');
    doc.text(summaryLines, margin + 12, y + 18);
    y += boxHeight + 20;
  }

  // 5. Key Terms
  if (data.keyTerms && data.keyTerms.length > 0) {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Key Terms & Definitions', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);

    data.keyTerms.forEach((term) => {
      checkPageBreak(18);
      doc.setFillColor(79, 70, 229);
      doc.circle(margin + 5, y - 3, 2, 'F');
      const termLines = doc.splitTextToSize(term, contentWidth - 20);
      doc.text(termLines, margin + 14, y);
      y += termLines.length * 13 + 4;
    });

    y += 14;
  }

  // 5.5 Teacher's Intent & Exam Radar
  if (data.teacherIntent && Array.isArray(data.teacherIntent.highYieldTopics) && data.teacherIntent.highYieldTopics.length > 0) {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(225, 29, 72);
    doc.text(`Teacher's Exam Radar & Guaranteed Probables (${data.teacherIntent.overallTone || 'Exam-Focused'})`, margin, y);
    y += 14;

    data.teacherIntent.highYieldTopics.forEach((item) => {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const timeStr = item.timestamp ? ` [${item.timestamp}]` : '';
      doc.text(`* [${item.intentLevel || 'MUST-KNOW'}] ${item.topic}${timeStr}`, margin + 10, y);
      y += 12;

      if (item.verbalCues) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const cueLines = doc.splitTextToSize(`Instructor emphasis: "${item.verbalCues}"`, contentWidth - 28);
        doc.text(cueLines, margin + 20, y);
        y += cueLines.length * 11 + 4;
      }
    });

    y += 10;
  }

  // 5.6 Teacher Warning Traps
  if (data.teacherIntent && Array.isArray(data.teacherIntent.warningTraps) && data.teacherIntent.warningTraps.length > 0) {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text('Teacher Warning Traps & Common Exam Pitfalls', margin, y);
    y += 14;

    data.teacherIntent.warningTraps.forEach((trap) => {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const trapTime = trap.timestamp ? ` [${trap.timestamp}]` : '';
      doc.text(`* [PITFALL] ${trap.concept || 'Common Confusion'}${trapTime}`, margin + 10, y);
      y += 12;

      if (trap.warning) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const warningLines = doc.splitTextToSize(`Warning: ${trap.warning}`, contentWidth - 28);
        doc.text(warningLines, margin + 20, y);
        y += warningLines.length * 11 + 4;
      }
    });

    y += 10;
  }

  // 6. Comprehensive Conceptual Sections with Full Detailed Notes
  if (data.sections && data.sections.length > 0) {
    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('Comprehensive Detailed Lecture Notes', margin, y);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 4, pageWidth - margin, y + 4);
    y += 20;

    data.sections.forEach((section, idx) => {
      checkPageBreak(50);
      // Section Heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(15, 23, 42);
      const badgePrefix = section.intentBadge ? `[${section.intentBadge}] ` : '';
      const timestampSuffix = section.timestamp ? ` [${section.timestamp}]` : '';
      const headingText = `${idx + 1}. ${badgePrefix}${section.heading}${timestampSuffix}`;
      const headingLines = doc.splitTextToSize(headingText, contentWidth);
      doc.text(headingLines, margin, y);
      y += headingLines.length * 15 + 6;

      // Section Key Bullet Takeaways
      if (section.points && section.points.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);

        section.points.forEach((point) => {
          const pointLines = doc.splitTextToSize(point, contentWidth - 20);
          checkPageBreak(pointLines.length * 13 + 6);
          doc.setFillColor(79, 70, 229);
          doc.rect(margin + 4, y - 5, 3, 3, 'F');
          doc.text(pointLines, margin + 14, y);
          y += pointLines.length * 13 + 4;
        });
        y += 6;
      }

      // Full Detailed Content & Conceptual Deep Dive
      if (section.detailedContent) {
        checkPageBreak(60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(79, 70, 229);
        doc.text('DETAILED CONCEPTUAL BREAKDOWN & ANALYSIS:', margin + 14, y);
        y += 12;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const detailedLines = doc.splitTextToSize(section.detailedContent, contentWidth - 28);
        
        // Draw subtle left indicator bar
        const startY = y - 8;
        const blockHeight = detailedLines.length * 13 + 8;
        checkPageBreak(blockHeight);
        
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin + 12, startY, contentWidth - 24, blockHeight, 3, 3, 'F');
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(2);
        doc.line(margin + 12, startY, margin + 12, startY + blockHeight);
        
        doc.text(detailedLines, margin + 20, y);
        y += detailedLines.length * 13 + 18;
      }

      y += 8;
    });
  }

  // 7. Comprehensive Academic Study Guide (if provided)
  if (data.comprehensiveGuide) {
    checkPageBreak(70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('In-Depth Academic Study Guide & Deep Dive', margin, y);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 4, pageWidth - margin, y + 4);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const guideLines = doc.splitTextToSize(data.comprehensiveGuide, contentWidth);
    
    // Paginate long guide text safely
    guideLines.forEach((line) => {
      checkPageBreak(14);
      doc.text(line, margin, y);
      y += 13;
    });
    y += 16;
  }

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by ClassMind AI • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `${(data.title || 'lecture_notes').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
  doc.save(filename);
}
