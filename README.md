# FAT2FIT Gym Studio — Netlify + Supabase

Premium responsive website for FAT2FIT Gym Studio, Vijayawada.

## Included
- Spatial dark-forest / acid-lime / warm-gold UI refresh
- Owner-supplied gym photos with restrained lighting, contrast and sharpness correction
- Cropped trainer portrait from the supplied poster
- Circular FAT2FIT logo crop
- Original generated exercise reference imagery (not copied from a third-party fitness app)
- BMI calculation and adult BMI screening category
- Mifflin–St Jeor BMR equation and activity-based daily energy estimate
- Protein, fat and carbohydrate starting targets
- General adult reference intake cards for selected vitamins/minerals/fiber
- Meal examples, goal and experience-aware workout templates, sets/reps/rest/form cues
- PDF report, WhatsApp enquiry and contact links
- Supabase schema with admin-only record reads/deletes and explicit consent fields
- Netlify Functions for secure enquiry and member-plan submission

## Accuracy and responsible use
BMI is calculated as weight (kg) / height (m)^2. BMI classification is a screening tool, not a diagnosis.
BMR uses Mifflin–St Jeor; maintenance calories use a selected activity multiplier. Individual calorie needs cannot be known exactly from a web form and should be adjusted using observed progress and qualified guidance.
Macro targets are calculated starting targets, not a medical prescription. Micronutrient cards show general adult reference intakes; they do not measure dietary intake, detect deficiencies or create an exact personalised vitamin prescription. Food examples are not allergy-checked or medically personalised.
Exercise pictures are visual references, not a substitute for an in-person technique check. The exercise library is original generated imagery, not downloaded from the reference app.

## Current backend
The Supabase project `fat2fit-gym-studio` was created in the India (Mumbai) region and the admin-only schema was applied. No member records exist yet.
The admin account must be created through Supabase Authentication and then granted the admin role by inserting that user's UUID into `public.admin_users`. Do not use a shared/default password.

## Deployment requirements
This project includes Netlify Functions. **A static ZIP drag-and-drop upload alone does not deploy Netlify Functions.** Deploy by connecting a GitHub repository to Netlify or using Netlify CLI. Once connected, set these environment variables in Netlify:
- `SUPABASE_URL` = `https://flwliqgnyryhmvhhiuxg.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase secret service-role key (server-side only; never place in frontend or GitHub)
- `TURNSTILE_SECRET_KEY` = Cloudflare Turnstile secret (server-side only)
- `TURNSTILE_ALLOWED_HOSTS` = the exact Netlify hostname and any approved custom hostname, comma-separated

Set the public Cloudflare Turnstile site key in `CONFIG.TURNSTILE_SITE_KEY` in `index.html`. The public site key is designed to be visible; the secret key is not.
After configuring, test form submission with and without consent, invalid inputs, bot verification, admin login, non-admin denial, and deletion. Until that is done, do not accept real member submissions.

## Admin setup
1. Create a unique admin account under Supabase → Authentication → Users.
2. Copy that account's UUID.
3. In the SQL editor, insert the UUID into `public.admin_users` (do not add passwords to SQL).
4. Sign in via the admin panel and verify non-admin accounts cannot view member records.
5. Change the password to a unique long password; enable MFA if available.

## Local files
- `index.html`
- `assets/` contains owner photos, trainer crop, and generated exercise images
- `netlify/functions/` contains server-side submission handlers
- `netlify.toml` routes `/api/*` to Netlify Functions and sets basic security headers
- `supabase-schema.sql` contains the database policies
- `.env.example` is a names-only template; do not commit real secrets

## Privacy
Customer details and fitness plan data should only be stored after the relevant explicit consent. Limit access to authorised admins, define a retention period, and honour deletion requests. Confirm the final privacy wording and applicable legal requirements with the gym owner before public launch.
