function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function layout(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:480px;width:100%;">
        <tr><td style="background:#1B3A5C;padding:20px 24px;text-align:center;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">GateGuard</span>
          <br><span style="color:#ffffffaa;font-size:11px;">Sabang Dexterville Subdivision</span>
        </td></tr>
        <tr><td style="padding:24px;">${content}</td></tr>
        <tr><td style="padding:16px 24px;background:#f9f9f9;text-align:center;border-top:1px solid #eee;">
          <span style="color:#999;font-size:11px;">&copy; ${new Date().getFullYear()} GateGuard &mdash; Sabang Dexterville Subdivision</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function visitorAtGateEmail(visitorName: string, purpose: string, vehiclePlate: string | null, loginUrl?: string) {
  const link = loginUrl || '#'
  return layout(`
    <h2 style="margin:0 0 8px;font-size:16px;color:#1B3A5C;">Visitor at the Gate</h2>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.5;">
      A visitor is waiting at the gate and needs your approval.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:6px;padding:2px;">
      <tr><td style="padding:10px 14px;border-bottom:1px solid #eee;">
        <span style="color:#888;font-size:11px;">Visitor</span><br>
        <span style="font-size:14px;font-weight:600;color:#1B3A5C;">${esc(visitorName)}</span>
      </td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #eee;">
        <span style="color:#888;font-size:11px;">Purpose</span><br>
        <span style="font-size:13px;color:#333;">${esc(purpose)}</span>
      </td></tr>
      ${vehiclePlate ? `<tr><td style="padding:10px 14px;">
        <span style="color:#888;font-size:11px;">Vehicle</span><br>
        <span style="font-size:13px;color:#333;">${esc(vehiclePlate)}</span>
      </td></tr>` : ''}
    </table>
    <div style="margin:20px 0 0;text-align:center;">
      <a href="${link}" style="display:inline-block;background:#1B3A5C;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;">
        Approve or Deny Visitor
      </a>
    </div>
    <p style="margin:12px 0 0;color:#999;font-size:11px;text-align:center;line-height:1.5;">
      Or open <a href="${link}" style="color:#1B3A5C;">${link}</a> in your browser.
    </p>
  `)
}

export function visitorExitedEmail(visitorName: string, exitTime: string) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:16px;color:#1B3A5C;">Visitor Has Exited</h2>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.5;">
      Your visitor has safely left the subdivision.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:6px;padding:2px;">
      <tr><td style="padding:10px 14px;border-bottom:1px solid #eee;">
        <span style="color:#888;font-size:11px;">Visitor</span><br>
        <span style="font-size:14px;font-weight:600;color:#1B3A5C;">${esc(visitorName)}</span>
      </td></tr>
      <tr><td style="padding:10px 14px;">
        <span style="color:#888;font-size:11px;">Exit Time</span><br>
        <span style="font-size:13px;color:#333;">${esc(exitTime)}</span>
      </td></tr>
    </table>
  `)
}

export function registrationApprovedEmail(homeownerName: string) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:16px;color:#2D8B4E;">Registration Approved</h2>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.5;">
      Hi <strong>${esc(homeownerName)}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.5;">
      Your homeowner registration has been approved. You can now sign in to GateGuard to manage your visitors and receive gate notifications.
    </p>
    <p style="margin:0;color:#555;font-size:14px;line-height:1.5;">
      Welcome to Sabang Dexterville Subdivision!
    </p>
  `)
}

export function registrationRejectedEmail(homeownerName: string, reason?: string) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:16px;color:#ef4444;">Registration Not Approved</h2>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.5;">
      Hi <strong>${esc(homeownerName)}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.5;">
      Unfortunately, your homeowner registration was not approved.
    </p>
    ${reason ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:6px;margin-bottom:16px;">
      <tr><td style="padding:12px 14px;">
        <span style="color:#888;font-size:11px;">Reason</span><br>
        <span style="font-size:13px;color:#333;">${esc(reason)}</span>
      </td></tr>
    </table>` : ''}
    <p style="margin:0;color:#555;font-size:13px;line-height:1.5;">
      If you believe this is a mistake, please contact the subdivision admin.
    </p>
  `)
}
