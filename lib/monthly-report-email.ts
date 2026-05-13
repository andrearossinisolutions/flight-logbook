import { eur, minutesToHoursMinutes } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildMonthlyReportEmail(args: {
  monthName: string;
  partnershipName: string;
  fixedCostPerMember: number;
  fixedCostTotal: number;
  flightCost: number;
  totalCost: number;
  durationMinutes: number;
  aircraftDetails: { registration: string, durationMinutes: number, cost: number }[];
  memberCount: number;
}) {
  const { monthName, partnershipName, fixedCostPerMember, fixedCostTotal, flightCost, totalCost, durationMinutes, aircraftDetails, memberCount } = args;

  const subject = `Rendiconto Mensile ${partnershipName} - ${monthName}`;

  const aircraftText = aircraftDetails.map(a => 
    `- ${a.registration}: ${minutesToHoursMinutes(a.durationMinutes)} voli, costo ${eur(a.cost)}`
  ).join("\n");

  const text = `
Rendiconto Mensile: ${partnershipName}
Mese: ${monthName}

Ecco il riepilogo delle spese da versare per questo mese:

Totale da versare: ${eur(totalCost)}

Dettagli:
- Quota fissa mensile: ${eur(fixedCostPerMember)} (Totale società: ${eur(fixedCostTotal)} diviso per ${memberCount} soci)
- Costo totale voli: ${eur(flightCost)} per ${minutesToHoursMinutes(durationMinutes)} ore di volo

Voli per aereo:
${aircraftText}
  `.trim();

  const aircraftHtml = aircraftDetails.map(a => `
    <div style="margin-top: 10px; font-size: 14px; color: #17324d;">
      <span style="font-weight: 700;">${escapeHtml(a.registration)}:</span>
      ${escapeHtml(minutesToHoursMinutes(a.durationMinutes))} ore <span style="opacity: 0.6;"> · </span> ${escapeHtml(eur(a.cost))}
    </div>
  `).join("");

  const html = `
    <div style="margin: 0; padding: 32px 16px; background: #edf3f8; font-family: Inter, 'Segoe UI', Arial, sans-serif; color: #17324d;">
      <div style="max-width: 760px; margin: 0 auto;">
        
        <div style="margin: 0 0 24px; padding: 22px; border-radius: 24px; background: linear-gradient(135deg, #17324d 0%, #244a70 100%); color: #ffffff;">
          <div style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.78; margin-bottom: 10px;">
            Rendiconto Mensile
          </div>
          <div style="font-size: 30px; line-height: 1.1; font-weight: 800; margin-bottom: 10px;">
            ${escapeHtml(partnershipName)}
          </div>
          <div style="font-size: 15px; line-height: 1.6; opacity: 0.92;">
            Riepilogo delle spese per <strong>${escapeHtml(monthName)}</strong>
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #dbe5f0; border-radius: 28px; padding: 24px;">
          
          <div style="text-align: center; margin-bottom: 32px; padding: 24px; border-radius: 16px; background: #f8fafc;">
            <div style="font-size: 14px; color: #4c5f76; margin-bottom: 8px;">Totale da versare</div>
            <div style="font-size: 36px; font-weight: 800; color: #17324d;">${escapeHtml(eur(totalCost))}</div>
          </div>

          <div style="margin: 0 0 28px;">
            <div style="font-size: 18px; font-weight: 800; color: #17324d; margin: 0 0 14px;">Dettaglio Costi Fissi</div>
            <div style="padding: 16px; border: 1px solid #dbe5f0; border-radius: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #4c5f76;">Quota fissa mensile</span>
                <strong style="color: #17324d;">${escapeHtml(eur(fixedCostPerMember))}</strong>
              </div>
              <div style="font-size: 13px; color: #5b718c;">
                Il totale mensile dei costi fissi della società (${escapeHtml(eur(fixedCostTotal))}) è stato diviso in parti uguali tra i ${memberCount} soci.
              </div>
            </div>
          </div>

          <div style="margin: 0 0 28px;">
            <div style="font-size: 18px; font-weight: 800; color: #17324d; margin: 0 0 14px;">Dettaglio Voli</div>
            <div style="padding: 16px; border: 1px solid #dbe5f0; border-radius: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #edf3f8;">
                <span style="color: #4c5f76;">Ore volate totali</span>
                <strong style="color: #17324d;">${escapeHtml(minutesToHoursMinutes(durationMinutes))}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #edf3f8;">
                <span style="color: #4c5f76;">Costo totale voli</span>
                <strong style="color: #17324d;">${escapeHtml(eur(flightCost))}</strong>
              </div>
              
              <div style="margin-top: 16px;">
                <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #5b718c; margin-bottom: 8px;">Dettaglio per aeromobile</div>
                ${aircraftHtml || '<div style="font-size: 14px; color: #4c5f76;">Nessun volo registrato.</div>'}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}
