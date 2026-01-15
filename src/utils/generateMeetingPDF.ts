import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MeetingData {
    title: string;
    date: string;
    duration: number;
    participants: string[];
    summary: string;
    actionItems: Array<{ task: string; owner: string; deadline: string; priority: string }>;
    keyMoments: Array<{ timestamp: string; description: string; type: string }>;
    transcript?: string;
}

export const generateMeetingPDF = (data: MeetingData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(data.title || 'Meeting Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Date: ${data.date}`, 14, 30);
    doc.text(`Duration: ${Math.round(data.duration / 60)} mins`, 60, 30);
    doc.text(`Participants: ${data.participants.join(', ')}`, 14, 36);

    let yPos = 50;

    // Executive Summary
    if (data.summary) {
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Executive Summary', 14, yPos);
        yPos += 8;

        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const splitSummary = doc.splitTextToSize(data.summary, pageWidth - 28);
        doc.text(splitSummary, 14, yPos);
        yPos += (splitSummary.length * 5) + 10;
    }

    // Action Items Table
    if (data.actionItems && data.actionItems.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Action Items', 14, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Task', 'Owner', 'Priority', 'Due Date']],
            body: data.actionItems.map(item => [
                item.task,
                item.owner,
                item.priority?.toUpperCase(),
                item.deadline
            ]),
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [15, 23, 42] }, // Slate-900
            theme: 'grid'
        });

        // @ts-expect-error
        yPos = doc.lastAutoTable.finalY + 15;
    }

    // Key Moments
    if (data.keyMoments && data.keyMoments.length > 0) {
        // Check page break
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Key Moments', 14, yPos);
        yPos += 5;

        autoTable(doc, {
            startY: yPos,
            head: [['Time', 'Type', 'Description']],
            body: data.keyMoments.map(m => [m.timestamp, m.type?.replace('_', ' '), m.description]),
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [71, 85, 105] }, // Slate-600
            theme: 'striped'
        });

        // @ts-expect-error
        yPos = doc.lastAutoTable.finalY + 15;
    }

    // Transcript (Optional)
    if (data.transcript) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Full Transcript', 14, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        // Limit transcript length or chunk it if needed, simply split for now
        const splitTranscript = doc.splitTextToSize(data.transcript, pageWidth - 28);

        // Basic pagination loop for text
        const lineHeight = 4;
        for (let i = 0; i < splitTranscript.length; i++) {
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(splitTranscript[i], 14, yPos);
            yPos += lineHeight;
        }
    }

    // Save
    const safeTitle = data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeTitle}_report.pdf`);
};
