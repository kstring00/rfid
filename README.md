# IntroBand

Landing page and (soon) parent web app for IntroBand: tap-to-meet NFC + QR tags for autistic and neurodivergent kids.

## What's here
- `app/page.tsx` — landing page: 3D hero, three ways in, waitlist
- `app/components/Hero3D.tsx` — Three.js scene. Items lift on hover (tap on phones) and open a uses card
- `app/components/scene/models.ts` — the built 3D items and badge textures
- `public/models/shoe.glb` — photoreal shoe from Higgsfield (compressed to 1.5 MB)
- `lib/items.ts` — the copy for each item card and the waitlist choices
- `app/api/waitlist/route.ts` — saves waitlist signups to Supabase
- `app/privacy/page.tsx` — privacy policy

## Run it
```
npm install
npm run dev
```

## Connect the waitlist (Supabase)
1. Create a Supabase project.
2. SQL Editor → run `supabase/waitlist.sql`.
3. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
4. Add the same variables in Vercel → Project → Settings → Environment Variables.

Until those are set, the form shows "The waitlist isn't connected yet."

## Swap in more Higgsfield models
Drop a `.glb` in `public/models/`, then load it the same way `loadRealShoe` does in `Hero3D.tsx`.
Compress big models first: `npx @gltf-transform/cli resize in.glb out.glb --width 1024 --height 1024`.
