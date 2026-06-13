const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Email shell themed like the in-app "About FuFi" hero card: a dark-green
 * gradient header (with a solid fallback for Outlook) holding the FuFi brand,
 * over a white content card. Table-based + inline styles for client support.
 */
function shell(preheader: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light only" />
  </head>
  <body style="margin:0;padding:0;background:#eef4f1;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4f1;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(13,60,46,0.12);">
            <!-- Hero header (themed like the About card) -->
            <tr>
              <td style="background-color:#15803d;background-image:linear-gradient(135deg,#16a34a 0%,#15803d 55%,#166534 100%);padding:26px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="font-family:${FONT};font-size:30px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;line-height:1;">FuFi</div>
                      <div style="font-family:${FONT};font-size:13px;color:rgba(255,255,255,0.85);margin-top:7px;">Fund Your Future</div>
                    </td>
                    <td align="right" style="vertical-align:top;">
                      <span style="display:inline-block;background:rgba(255,255,255,0.16);color:#ffffff;font-family:${FONT};font-size:11px;font-weight:600;padding:5px 11px;border-radius:999px;">v1.0.0</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:30px 28px 8px;font-family:${FONT};color:#0b1210;">
                ${body}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:22px 28px 26px;">
                <div style="border-top:1px solid #e7ece9;padding-top:16px;font-family:${FONT};font-size:12px;color:#8a938d;">
                  FuFi · Fund Your Future
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function otpEmail(code: string): { subject: string; html: string; text: string } {
  return {
    subject: "Your FuFi verification code",
    text: `Your FuFi verification code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: shell(
      `Your FuFi code is ${code}`,
      `<p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#374640;">Use this verification code to continue. It keeps your account secure.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
         <tr>
           <td style="background:#ecfdf3;border:1px solid #bbf7d0;border-radius:14px;padding:20px;text-align:center;">
             <div style="font-family:${FONT};font-size:34px;font-weight:800;letter-spacing:12px;color:#15803d;padding-left:12px;">${code}</div>
           </td>
         </tr>
       </table>
       <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b746e;">It expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>`,
    ),
  };
}

export function resetEmail(link: string): { subject: string; html: string; text: string } {
  return {
    subject: "Reset your FuFi password",
    text: `Reset your FuFi password using this link (expires in 1 hour): ${link}\nIf you didn't request this, ignore this email.`,
    html: shell(
      "Reset your FuFi password",
      `<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374640;">We received a request to reset your FuFi password. Tap the button below to choose a new one.</p>
       <table role="presentation" cellpadding="0" cellspacing="0">
         <tr>
           <td style="background-color:#15803d;background-image:linear-gradient(135deg,#16a34a 0%,#15803d 100%);border-radius:12px;">
             <a href="${link}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Reset password</a>
           </td>
         </tr>
       </table>
       <p style="margin:22px 0 6px;font-size:12px;line-height:1.5;color:#8a938d;">Or paste this link into your browser:</p>
       <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${link}" style="color:#16a34a;text-decoration:underline;">${link}</a></p>
       <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b746e;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    ),
  };
}
