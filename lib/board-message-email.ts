export function renderBoardMessageEmail(
  partnershipName: string,
  authorName: string,
  content: string,
  partnershipId: string
) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const boardUrl = `${appUrl}/societa/${partnershipId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #142033; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1f6f5b; margin: 0; font-size: 24px;">Nuovo messaggio in bacheca</h1>
        <p style="color: #60708a; margin-top: 8px;">Società: <strong>${partnershipName}</strong></p>
      </div>

      <div style="background: #f6f8fb; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #d9e0ea;">
        <p style="margin: 0 0 12px 0; color: #145242; font-weight: bold;">
          ${authorName} ha scritto:
        </p>
        <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #d9e0ea; white-space: pre-wrap; font-size: 15px; line-height: 1.5;">
          ${content}
        </div>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${boardUrl}" style="background-color: #1f6f5b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Vai alla Bacheca
        </a>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #60708a;">
        Ricevi questa email perché sei membro della società ${partnershipName} su Flight Logbook.
      </div>
    </div>
  `;

  return html;
}
