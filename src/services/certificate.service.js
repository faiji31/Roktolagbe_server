import PDFDocument from "pdfkit";

export function streamDonationCertificate(donation, res) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 50,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="RoktoLagbe-Certificate-${donation._id}.pdf"`
  );

  doc.pipe(res);

  // Outer decorative border
  doc
    .rect(25, 25, doc.page.width - 50, doc.page.height - 50)
    .lineWidth(3)
    .stroke("#be123c");

  doc
    .rect(33, 33, doc.page.width - 66, doc.page.height - 66)
    .lineWidth(1)
    .stroke("#fda4af");

  doc.moveDown(2);

  // Header
  doc
    .fillColor("#be123c")
    .fontSize(32)
    .font("Helvetica-Bold")
    .text("ROKTOLAGBE", { align: "center" });

  doc
    .fillColor("#475569")
    .fontSize(13)
    .font("Helvetica")
    .text("COMMUNITY BLOOD DONATION NETWORK — BANGLADESH", {
      align: "center",
    });

  doc.moveDown(1.5);

  doc
    .fillColor("#0f172a")
    .fontSize(26)
    .font("Helvetica-Bold")
    .text("CERTIFICATE OF APPRECIATION", { align: "center" });

  doc.moveDown(1);

  doc
    .fillColor("#334155")
    .fontSize(14)
    .font("Helvetica")
    .text("This certificate is proudly presented to", { align: "center" });

  doc.moveDown(0.8);

  // Donor Name
  doc
    .fillColor("#be123c")
    .fontSize(28)
    .font("Helvetica-Bold")
    .text(donation.donorName || "Honored Blood Donor", { align: "center" });

  doc.moveDown(0.8);

  const donatedDate = donation.donatedAt
    ? new Date(donation.donatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Recent Date";

  doc
    .fillColor("#1e293b")
    .fontSize(15)
    .font("Helvetica")
    .text(
      `In grateful recognition of voluntarily donating ${
        donation.bags || 1
      } bag(s) of ${donation.bloodGroup} blood`,
      { align: "center" }
    );

  doc
    .moveDown(0.4)
    .text(
      `at ${donation.hospitalName || donation.bankName || "Partner Medical Center"} on ${donatedDate}.`,
      { align: "center" }
    );

  doc.moveDown(2.5);

  // Footer metadata
  const bottomY = doc.page.height - 110;
  doc
    .fillColor("#64748b")
    .fontSize(11)
    .text(`Certificate ID: ${donation._id}`, 70, bottomY)
    .text(`Blood Group: ${donation.bloodGroup}`, 70, bottomY + 18)
    .text(
      "Verified by RoktoLagbe Digital Blood Registry",
      doc.page.width - 340,
      bottomY,
      { width: 270, align: "right" }
    );

  doc.end();
}