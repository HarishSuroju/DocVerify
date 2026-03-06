const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const generatePdfFromContent = async (title, content) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const lineHeight = 18;
  const maxWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Title
  page.drawText(title, {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 35;

  // Content — simple line wrapping
  const words = content.split(/\s+/);
  let line = "";
  const fontSize = 11;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth) {
      if (y < margin + 30) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
      y -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }

  // Draw remaining text
  if (line) {
    if (y < margin + 30) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
  }

  return Buffer.from(await pdfDoc.save());
};

const embedSignatureInPdf = async (pdfBuffer, signatureImageBuffer, signerRole = "receiver") => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pngImage = await pdfDoc.embedPng(signatureImageBuffer);

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();

  const sigWidth = 150;
  const sigHeight = (pngImage.height / pngImage.width) * sigWidth;

  const signatureX = signerRole === "sender" ? 50 : width - sigWidth - 50;

  lastPage.drawImage(pngImage, {
    x: signatureX,
    y: 60,
    width: sigWidth,
    height: sigHeight,
  });

  // Add "Digitally Signed" text below signature
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  lastPage.drawText(`Digitally Signed - ${new Date().toISOString().split("T")[0]}`, {
    x: signatureX,
    y: 45,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return Buffer.from(await pdfDoc.save());
};

module.exports = { generatePdfFromContent, embedSignatureInPdf };
