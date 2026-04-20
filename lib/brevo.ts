interface SendEmailOptions {
  to: string
  toName?: string
  subject: string
  html: string
}

interface SendSmsOptions {
  to: string
  content: string
}

interface SendResult {
  success: boolean
  error?: string
}

export async function sendEmail({ to, toName, subject, html }: SendEmailOptions): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('[Brevo] BREVO_API_KEY not configured')
    return { success: false, error: 'Email service not configured' }
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@gateguard.com'
  const senderName = process.env.BREVO_SENDER_NAME || 'GateGuard'

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = (data as { message?: string }).message || `HTTP ${res.status}`
      console.error('[Brevo] Email send failed:', msg)
      return { success: false, error: msg }
    }

    console.log('[Brevo] Email sent to', to)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Brevo] Email error:', msg)
    return { success: false, error: msg }
  }
}

export async function sendSms({ to, content }: SendSmsOptions): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('[Brevo] BREVO_API_KEY not configured')
    return { success: false, error: 'SMS service not configured' }
  }

  const senderName = process.env.BREVO_SMS_SENDER || 'GateGuard'

  // Normalize PH phone: 09XX → +639XX
  let phone = to.replace(/[\s-]/g, '')
  if (phone.startsWith('09')) {
    phone = '+63' + phone.slice(1)
  } else if (!phone.startsWith('+')) {
    phone = '+63' + phone
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        type: 'transactional',
        unicodeEnabled: true,
        sender: senderName,
        recipient: phone,
        content,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const msg = (data as { message?: string }).message || `HTTP ${res.status}`
      console.error('[Brevo] SMS send failed:', msg)
      return { success: false, error: msg }
    }

    console.log('[Brevo] SMS sent to', phone)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Brevo] SMS error:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Notify a homeowner via SMS (priority) then email as fallback.
 * Sends SMS if phone is available, always sends email if email is available.
 */
export async function notifyHomeowner({
  phone,
  email,
  name,
  smsContent,
  emailSubject,
  emailHtml,
}: {
  phone: string | null
  email: string | null
  name: string
  smsContent: string
  emailSubject: string
  emailHtml: string
}): Promise<void> {
  // Priority: SMS first
  if (phone) {
    try {
      await sendSms({ to: phone, content: smsContent })
    } catch (err) {
      console.error('[Brevo] SMS notify error:', err)
    }
  }

  // Always send email as backup
  if (email) {
    try {
      await sendEmail({ to: email, toName: name, subject: emailSubject, html: emailHtml })
    } catch (err) {
      console.error('[Brevo] Email notify error:', err)
    }
  }
}
