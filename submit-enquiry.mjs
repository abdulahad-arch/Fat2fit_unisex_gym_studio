import { json, getDb, parseBody, text, verifyTurnstile, clientIp } from './_shared.mjs';

export default async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed' });
  try {
    const data = await parseBody(event);
    // Honeypot: return a generic success to bots without writing anything.
    if (text(data.website, 200)) return json(200, { ok: true, message: 'Thanks. If needed, the team will contact you.' });
    if (data.consent !== true) return json(400, { ok: false, message: 'Please give consent before sending this enquiry.' });
    await verifyTurnstile(data.turnstileToken, clientIp(event));
    const name = text(data.name, 80, true);
    const phone = text(data.phone, 25, true);
    const topic = text(data.topic || 'General', 80, true);
    const message = text(data.message, 1000);
    if (!/^[+()\-\s\d]{7,25}$/.test(phone)) return json(400, { ok: false, message: 'Please enter a valid phone number.' });
    const db = getDb();
    const { error } = await db.from('gym_enquiries').insert({
      name, phone, topic, message: message || null,
      consent_recorded: true, consent_at: new Date().toISOString(), consent_version: 'privacy-v1'
    });
    if (error) throw error;
    return json(200, { ok: true, message: 'Enquiry received. The gym can contact you about this request.' });
  } catch (error) {
    const message = error.message || 'Unable to submit right now. Please try again later.';
    const clientError = /consent|complete|required|too long|valid phone|anti-spam|spam protection|host is not authorised|invalid request|invalid JSON/i.test(message);
    return json(clientError ? 400 : 503, { ok: false, message: clientError ? message : 'Submission is not available right now. Please use the gym WhatsApp link instead.' });
  }
};
