import { json, getDb, parseBody, text, verifyTurnstile, clientIp } from './_shared.mjs';

const goals = new Set(['maintain', 'gain', 'lose', 'athletic']);
const diets = new Set(['mixed', 'veg', 'vegan']);
const experiences = new Set(['beginner', 'intermediate', 'advanced']);

export default async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed' });
  try {
    const data = await parseBody(event);
    if (text(data.website, 200)) return json(200, { ok: true, message: 'Request received.' });
    if (data.consent !== true) return json(400, { ok: false, message: 'Please give separate consent before saving your fitness plan.' });
    await verifyTurnstile(data.turnstileToken, clientIp(event));
    const p = data.plan;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return json(400, { ok: false, message: 'Calculate your plan first.' });
    const name = text(p.name || 'Member', 60, true);
    const age = Number(p.age), height = Number(p.height), weight = Number(p.weight), activity = Number(p.activity);
    if (!Number.isInteger(age) || age < 18 || age > 80) throw new Error('Age must be between 18 and 80');
    if (!Number.isFinite(height) || height < 120 || height > 230) throw new Error('Height is outside the accepted range');
    if (!Number.isFinite(weight) || weight < 35 || weight > 300) throw new Error('Weight is outside the accepted range');
    if (!goals.has(p.goal) || !diets.has(p.diet) || !experiences.has(p.experience)) throw new Error('Invalid fitness plan options');
    if (!Number.isFinite(activity) || activity < 1.2 || activity > 1.9) throw new Error('Invalid activity level');
    // Persist only the fields needed for basic member plan tracking. No sex field, IP address, or browser data is stored.
    const planJson = {
      goalText: text(p.goalText || p.goal, 80, true), diet: p.diet, experience: p.experience,
      bmr: Number.isFinite(Number(p.bmr)) ? Math.round(Number(p.bmr)) : null,
      tdee: Number.isFinite(Number(p.tdee)) ? Math.round(Number(p.tdee)) : null,
      target: Number.isFinite(Number(p.target)) ? Math.round(Number(p.target)) : null,
      protein: Number.isFinite(Number(p.protein)) ? Math.round(Number(p.protein)) : null,
      carbs: Number.isFinite(Number(p.carbs)) ? Math.round(Number(p.carbs)) : null,
      fat: Number.isFinite(Number(p.fat)) ? Math.round(Number(p.fat)) : null,
      bmi: Number.isFinite(Number(p.bmi)) ? Number(p.bmi) : null
    };
    const db = getDb();
    const { error } = await db.from('fitness_plans').insert({
      created_by: null, member_name: name, age, height_cm: height, weight_kg: weight,
      goal: p.goal, activity_factor: activity, plan_json: planJson,
      consent_recorded: true, consent_at: new Date().toISOString(), consent_version: 'privacy-v1'
    });
    if (error) throw error;
    return json(200, { ok: true, message: 'Your plan was saved with consent. Only authorised gym admins can view it.' });
  } catch (error) {
    const message = error.message || '';
    const clientError = /consent|age must|height is|weight is|invalid fitness|invalid activity|complete|required|too long|anti-spam|spam protection|invalid request|invalid JSON/i.test(message);
    return json(clientError ? 400 : 503, { ok: false, message: clientError ? message : 'Plan saving is not available right now. Your plan was not confirmed as saved.' });
  }
};
