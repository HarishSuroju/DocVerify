const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const SIGNATURE_TOKENS = {
  sender: "{{sender_signature}}",
  receiver: "{{receiver_signature}}",
};

const decodeHtmlEntities = (text) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalizeRichText = (content = "") => {
  let text = String(content).replace(/\r\n?/g, "\n");

  // Preserve basic block structure when content comes from rich text HTML.
  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|ul|ol|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/td>/gi, "  ")
    .replace(/<[^>]+>/g, "");

  text = decodeHtmlEntities(text)
    .replace(/\s(\d{1,2}\.)\s/g, "\n$1 ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
};

const splitSignatureAwareLines = (normalizedText) => {
  const rawLines = normalizedText.split("\n");
  const segments = [];

  for (const rawLine of rawLines) {
    let line = rawLine;

    while (line.includes(SIGNATURE_TOKENS.sender) || line.includes(SIGNATURE_TOKENS.receiver)) {
      const senderIdx = line.indexOf(SIGNATURE_TOKENS.sender);
      const receiverIdx = line.indexOf(SIGNATURE_TOKENS.receiver);
      const hasSender = senderIdx !== -1;
      const hasReceiver = receiverIdx !== -1;
      const nextIdx = hasSender && hasReceiver ? Math.min(senderIdx, receiverIdx) : hasSender ? senderIdx : receiverIdx;
      const role = hasSender && senderIdx === nextIdx ? "sender" : "receiver";
      const token = SIGNATURE_TOKENS[role];

      const before = line.slice(0, nextIdx).trimEnd();
      if (before) segments.push({ type: "text", value: before });
      segments.push({ type: "signature", role });

      line = line.slice(nextIdx + token.length).trimStart();
    }

    if (line.trim()) {
      segments.push({ type: "text", value: line });
    } else {
      segments.push({ type: "blank" });
    }
  }

  return segments;
};

const wrapText = (font, text, fontSize, maxWidth) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
};

const roleHints = {
  sender: ["sender", "landlord", "owner", "issuer", "authorized", "admin", "employer"],
  receiver: ["receiver", "tenant", "client", "employee", "student", "buyer", "assignee"],
};

const resolveSignatureRoleFromLine = (line) => {
  const normalized = String(line || "").toLowerCase();
  if (!normalized.includes("signature")) return null;

  const senderMatch = roleHints.sender.some((hint) => normalized.includes(hint));
  const receiverMatch = roleHints.receiver.some((hint) => normalized.includes(hint));

  if (senderMatch && !receiverMatch) return "sender";
  if (receiverMatch && !senderMatch) return "receiver";

  // Generic "Authorized Signature" is treated as sender.
  if (normalized.includes("authorized signature")) return "sender";

  return null;
};

const resolveSignatureStartX = ({ line, margin, font, fontSize, maxWidth }) => {
  const text = String(line || "");

  const underscoreMatch = text.match(/_{3,}/);
  if (underscoreMatch && underscoreMatch.index !== undefined) {
    const prefix = text.slice(0, underscoreMatch.index);
    return margin + font.widthOfTextAtSize(prefix, fontSize);
  }

  const colonIdx = text.indexOf(":");
  if (colonIdx !== -1) {
    const prefix = text.slice(0, colonIdx + 1).trimEnd() + " ";
    return margin + font.widthOfTextAtSize(prefix, fontSize);
  }

  const lineWidth = font.widthOfTextAtSize(text, fontSize);
  return Math.min(margin + lineWidth + 8, margin + maxWidth - 120);
};

const generatePdfFromContent = async (title, content) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const lineHeight = 16;
  const maxWidth = pageWidth - margin * 2;
  const signatureAnchors = {};

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let pageIndex = 0;
  let y = pageHeight - margin;

  const ensureSpace = (required = 20) => {
    if (y < margin + required) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      pageIndex += 1;
      y = pageHeight - margin;
    }
  };

  // Title
  page.drawText(title, {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 35;

  const normalized = normalizeRichText(content);
  const segments = splitSignatureAwareLines(normalized);

  for (const segment of segments) {
    if (segment.type === "blank") {
      y -= lineHeight * 0.6;
      continue;
    }

    if (segment.type === "signature") {
      ensureSpace(50);
      const label = segment.role === "sender" ? "Sender Signature:" : "Receiver Signature:";

      page.drawText(label, {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0.15, 0.15, 0.15),
      });

      const labelWidth = boldFont.widthOfTextAtSize(label, 11);
      const lineStartX = margin + labelWidth + 8;
      const lineWidth = 220;
      page.drawLine({
        start: { x: lineStartX, y: y + 2 },
        end: { x: lineStartX + lineWidth, y: y + 2 },
        thickness: 1,
        color: rgb(0.4, 0.4, 0.4),
      });

      signatureAnchors[segment.role] = {
        pageIndex,
        x: lineStartX + 2,
        y: y + 6,
        maxWidth: lineWidth - 4,
      };

      y -= 28;
      continue;
    }

    const trimmed = segment.value.trim();
    if (!trimmed) {
      y -= lineHeight * 0.6;
      continue;
    }

    const isHeading = /^[A-Z][A-Z\s\d:&-]{6,}$/.test(trimmed) || /^#{1,3}\s+/.test(trimmed);
    const textValue = trimmed.replace(/^#{1,3}\s+/, "");
    const fontSize = isHeading ? 13 : 11;
    const currentFont = isHeading ? boldFont : font;
    const currentColor = isHeading ? rgb(0.12, 0.12, 0.12) : rgb(0.2, 0.2, 0.2);
    const wrappedLines = wrapText(currentFont, textValue, fontSize, maxWidth);

    for (const line of wrappedLines) {
      ensureSpace(24);
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font: currentFont,
        color: currentColor,
      });

      // If a template already has a written signature field line (without placeholders),
      // anchor signature placement to that line.
      const inferredRole = resolveSignatureRoleFromLine(line);
      if (inferredRole && !signatureAnchors[inferredRole]) {
        const startX = resolveSignatureStartX({
          line,
          margin,
          font: currentFont,
          fontSize,
          maxWidth,
        });

        signatureAnchors[inferredRole] = {
          pageIndex,
          x: startX,
          y: y + 4,
          maxWidth: Math.max(120, Math.min(180, margin + maxWidth - startX)),
        };
      }

      y -= isHeading ? lineHeight + 1 : lineHeight;
    }

    if (isHeading) y -= 2;
  }

  return {
    pdfBuffer: Buffer.from(await pdfDoc.save()),
    signatureAnchors,
  };
};

const embedSignatureInPdf = async (
  pdfBuffer,
  signatureImageBuffer,
  signerRole = "receiver",
  signatureAnchors = {}
) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pngImage = await pdfDoc.embedPng(signatureImageBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const anchor = signatureAnchors?.[signerRole];
  let page = null;
  let signatureX = 0;
  let signatureY = 0;
  let sigWidth = 170;

  if (anchor) {
    page = pages[anchor.pageIndex];
    if (!page) {
      throw new Error("Invalid signature anchor position in document.");
    }
    sigWidth = Math.min(anchor.maxWidth || 170, 170);
    signatureX = anchor.x;
    signatureY = anchor.y;
  } else {
    // Legacy fallback for documents created before placeholder support.
    page = pages[pages.length - 1];
    const { width } = page.getSize();
    sigWidth = 150;
    signatureX = signerRole === "sender" ? 50 : width - sigWidth - 50;
    signatureY = 60;
  }

  const sigHeight = (pngImage.height / pngImage.width) * sigWidth;

  page.drawImage(pngImage, {
    x: signatureX,
    y: signatureY,
    width: sigWidth,
    height: sigHeight,
  });

  // Add signing stamp below the signature image.
  page.drawText(`Digitally Signed - ${new Date().toISOString().split("T")[0]}`, {
    x: signatureX,
    y: Math.max(signatureY - 12, 12),
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return Buffer.from(await pdfDoc.save());
};

module.exports = { generatePdfFromContent, embedSignatureInPdf };
