const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'nmquan1212@gmail.com';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'F-CARE <onboarding@resend.dev>';

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.RESEND_API_KEY) {
        return response.status(500).json({ error: 'Missing RESEND_API_KEY' });
    }

    const { email, message, _subject: subject } = request.body || {};
    const cleanEmail = String(email || '').trim();
    const cleanMessage = String(message || '').trim();

    if (!isValidEmail(cleanEmail)) {
        return response.status(400).json({ error: 'A valid email address is required' });
    }

    if (cleanMessage.length < 5 || cleanMessage.length > 3000) {
        return response.status(400).json({ error: 'Message must be between 5 and 3000 characters' });
    }

    const safeEmail = escapeHtml(cleanEmail);
    const safeMessage = escapeHtml(cleanMessage).replace(/\n/g, '<br>');

    const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: CONTACT_TO_EMAIL,
            reply_to: cleanEmail,
            subject: subject || 'New F-CARE contact message',
            html: `
                <h2>New F-CARE contact message</h2>
                <p><strong>From:</strong> ${safeEmail}</p>
                <p><strong>Message:</strong></p>
                <p>${safeMessage}</p>
            `
        })
    });

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
        return response.status(502).json({
            error: result.message || 'Email provider rejected the message'
        });
    }

    return response.status(200).json({ ok: true, id: result.id });
}
