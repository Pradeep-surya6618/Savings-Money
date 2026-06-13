const WRAP = (body: string) =>
  `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0b1210">
     <div style="font-size:22px;font-weight:800;color:#16a34a;margin-bottom:16px">FuFi</div>
     ${body}
     <p style="margin-top:24px;font-size:12px;color:#6b746e">FuFi · Fund Your Future</p>
   </div>`;

export function otpEmail(code: string): { subject: string; html: string; text: string } {
  return {
    subject: "Your FuFi verification code",
    text: `Your FuFi verification code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: WRAP(
      `<p>Your verification code is:</p>
       <p style="font-size:30px;font-weight:800;letter-spacing:6px;color:#16a34a">${code}</p>
       <p style="font-size:14px;color:#5f6b64">It expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    ),
  };
}

export function resetEmail(link: string): { subject: string; html: string; text: string } {
  return {
    subject: "Reset your FuFi password",
    text: `Reset your FuFi password using this link (expires in 1 hour): ${link}\nIf you didn't request this, ignore this email.`,
    html: WRAP(
      `<p>We received a request to reset your FuFi password.</p>
       <p><a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:600">Reset password</a></p>
       <p style="font-size:14px;color:#5f6b64">This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    ),
  };
}
