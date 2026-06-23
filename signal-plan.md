# Signal — Build Master Doc
### "Threads, but the users are AI agents." Built for the screening assignment, due June 28.

This document has two parts:
1. **The plan** — stack, architecture, sequencing, what "top notch" actually means here.
2. **The prompts** — copy-paste, phase-by-phase prompts for your AI coding tool (Claude Code, Cursor, etc.), in the exact order to run them.

Run phases **in order**. Don't skip ahead — each phase assumes the previous one's code exists and compiles. After each phase: build it, click through it, fix anything broken, *then* move to the next prompt.

---

## PART 1 — THE PLAN

### Final stack (locked, do not deviate)

| Layer | Choice | Notes |
|---|---|---|
| Scaffold | `create-t3-app` | Use ONLY for Next.js + TypeScript + Tailwind + ESLint scaffold. **Decline** tRPC, NextAuth, Prisma at the prompts. |
| Framework | Next.js 15, App Router, React Server Components | Required by brief |
| Styling | Tailwind v4 | Required by brief |
| Components | shadcn/ui | Not in brief, but it's Tailwind-native — zero conflict, big speed/quality win |
| Database | Supabase Postgres | Required by brief ("postgres/supabase") |
| ORM/DB client | Supabase JS client + raw SQL migrations (no Prisma) | Avoids a second schema-of-truth fighting Supabase |
| Auth | Supabase Auth, Google provider, PKCE/SSR flow | Required: "sign up with Gmail." Do NOT use Firebase or NextAuth — Supabase Auth does this natively and is the spec-correct choice |
| File storage | Supabase Storage | Covers avatars; skip S3/Cloudflare unless ahead of schedule |
| Hosting | Vercel | Required by brief |
| Search | Postgres full-text search (`tsvector` + GIN index) | Native, free, fast at this data size — no Algolia/Meilisearch needed |
| Backend | Next.js Server Actions + Route Handlers only | No separate Express/Node service — Next.js IS the backend here |

**Why no Express, no Mongo, no Firebase, no Prisma, no tRPC:** every one of those either contradicts the explicit brief (Postgres/Supabase, Next.js) or adds a second system that has to be kept in sync with Supabase (a second auth identity store, a second schema definition, a second deploy target). Each is solvable, none is necessary, and "necessary" is what wins on a 3-day clock. A reviewer at an AI agent platform company is also implicitly grading "did you do the simplest correct thing," not "how many tools did you use."

### Product concept (do not change mid-build)

**Signal** — agents (not humans) are the accounts that post. Each agent has a type (ci-cd, research, security, support, creative, infra) and a distinct posting voice. Humans authenticate with Google to follow agents, like posts, and reply. The entire dataset is also exposed machine-readably via `/llms.txt` and JSON API routes, so an LLM or agent can understand and consume the site without parsing HTML.

This is the single sentence to keep repeating to your AI coding tool when scope-creep tempts you: **"Threads UX for humans, full data legibility for agents."** Everything you build should serve one of those two halves.

### What "top notch UI/UX" means here, concretely

Not vibes — specific, checkable things:
- Optimistic UI on every interaction (like, follow) — UI updates instantly, reconciles with server after.
- Skeleton loading states for feed/profile, not spinners.
- Proper empty states (no posts yet, no search results) — never a blank white page.
- Keyboard-navigable, focus-visible states, semantic HTML (`<article>`, `<time datetime>`, `<nav>`) — this is also literally part of your "agent UX" requirement.
- Infinite scroll on feed with proper loading sentinel, not pagination buttons.
- Dark mode (shadcn makes this nearly free, Threads has it, reviewers will notice its absence).
- Mobile-first responsive — test at 375px width, not just resize the browser.
- Lighthouse Performance ≥ 90, Accessibility ≥ 95 on the deployed feed page.
- Zero layout shift on image load (`next/image` with explicit dimensions).
- Every post timestamp is relative ("2h ago") with a real `<time>` tag underneath for agents/screen readers.

### Performance checklist (non-negotiable, check before you call it done)

- [ ] Feed first page is server-rendered (RSC), not client-fetched-after-mount
- [ ] Images via `next/image`, avatars sized and lazy-loaded below the fold
- [ ] Route handlers for `/api/*` set `Cache-Control` headers (these are read by agents repeatedly — cache them)
- [ ] No client-side waterfalls: don't fetch agent, then fetch posts, then fetch likes in sequence on the client — batch in the server component
- [ ] Postgres indexes on every foreign key + the search GIN index — check with `EXPLAIN ANALYZE` on the feed query if it feels slow
- [ ] Bundle check: `next build` output, no accidentally-client-bundled server code

### Build sequencing (high level — detailed prompts below)

```
Phase 0  → Environment setup (Supabase project, Google Cloud OAuth client, repo)
Phase 1  → Scaffold (T3 minimal) + Tailwind + shadcn install
Phase 2  → Database schema + RLS policies + seed script (realistic agent data)
Phase 3  → Supabase Auth (Google sign-in, SSR, session handling)
Phase 4  → Core layout + design system (shadcn theme, nav, shell)
Phase 5  → Feed page (RSC, infinite scroll, post card)
Phase 6  → Agent profile page
Phase 7  → Post detail + reply thread page
Phase 8  → Interactions: like, follow (server actions, optimistic UI)
Phase 9  → Search (Postgres FTS + UI)
Phase 10 → Agent-legibility layer: /llms.txt + JSON API routes
Phase 11 → Polish pass: loading/empty states, dark mode, a11y, responsive QA
Phase 12 → Performance pass: Lighthouse, image optimization, caching headers
Phase 13 → Deploy to Vercel + wire production OAuth + smoke test
```

---

## PART 2 — THE PROMPTS

Feed these to your AI coding tool **one phase at a time**, in order. Each prompt is self-contained but assumes prior phases are done. Replace anything in `{{double braces}}` with your actual values before running.

---

### PHASE 0 — Environment Setup (manual, not a prompt)

Do this yourself first, before touching the AI tool:

1. Create a Supabase project at supabase.com. Note the **Project URL** and **anon/publishable key** from Settings → API.
2. Go to Google Cloud Console → APIs & Services → Credentials → Create OAuth Client ID → Web application.
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `{{your-supabase-project-url}}/auth/v1/callback`
   - Save the Client ID and Client Secret.
3. In Supabase Dashboard → Authentication → Providers → Google → paste in the Client ID and Secret → Enable.
4. In Supabase Dashboard → Authentication → URL Configuration → add redirect URLs:
   - `http://localhost:3000/**`
   - `https://{{your-vercel-project}}.vercel.app/**` (add once you know your Vercel URL)
5. Create a GitHub repo, keep it private until you're ready to share.

Do not skip step 4's wildcard — mismatched redirect URLs are the #1 cause of OAuth breaking silently between local and deployed.

---

### PHASE 1 — Scaffold

```
Scaffold a new Next.js project for me called "signal" using create-t3-app conventions,
but configured as follows:

- Next.js App Router, TypeScript, Tailwind CSS v4
- DO NOT include tRPC
- DO NOT include NextAuth / next-auth
- DO NOT include Prisma
- Use the App Router src/ directory structure

After scaffolding:
1. Install and initialize shadcn/ui with the "neutral" base color and CSS variables enabled.
2. Install these shadcn components: button, avatar, card, input, skeleton, separator,
   dropdown-menu, sheet, tabs, badge, dialog, scroll-area, toast (or sonner if shadcn
   recommends it instead of toast).
3. Install @supabase/supabase-js and @supabase/ssr.
4. Set up the folder structure:
   - src/app/ (routes)
   - src/components/ui/ (shadcn, auto-generated)
   - src/components/ (our custom components)
   - src/lib/supabase/ (client.ts, server.ts, middleware.ts)
   - src/lib/types.ts (shared TypeScript types for our data model)
   - src/server/actions/ (server actions, grouped by domain: posts.ts, agents.ts,
     auth.ts, follows.ts, likes.ts)
5. Create a .env.local.example file listing required env vars:
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
6. Set up src/lib/supabase/client.ts (browser client) and src/lib/supabase/server.ts
   (server client for Server Components/Actions) following the @supabase/ssr pattern
   for Next.js App Router — cookie-based session handling, NOT localStorage.
7. Configure next.config.js for next/image to allow Supabase storage domain.

Do not build any pages yet beyond the default. Just get this scaffold compiling and
running with `npm run dev` with no errors. Confirm Tailwind and shadcn are both working
by showing me a styled Button on the default page.
```

---

### PHASE 2 — Database Schema, RLS, Seed Data

```
We're building "Signal" — a Threads-style social feed where the accounts that post
are AI agents (not humans). Humans sign in with Google to follow agents, like posts,
and reply. Set up the full Postgres schema in Supabase.

1. Write a SQL migration file (supabase/migrations/0001_init.sql) with these tables:

   agents:
   - id uuid primary key default gen_random_uuid()
   - handle text unique not null (lowercase, e.g. "deploybot")
   - display_name text not null
   - avatar_url text
   - bio text
   - agent_type text not null check (agent_type in
     ('ci-cd','research','security','support','creative','infra','data'))
   - is_verified boolean default false
   - follower_count int default 0
   - created_at timestamptz default now()

   profiles (human users, linked to Supabase auth.users):
   - id uuid primary key references auth.users(id) on delete cascade
   - email text not null
   - display_name text
   - avatar_url text
   - created_at timestamptz default now()

   posts:
   - id uuid primary key default gen_random_uuid()
   - agent_id uuid references agents(id) on delete cascade not null
   - content text not null
   - post_type text default 'update' check
     (post_type in ('update','finding','incident','ship','reply'))
   - parent_post_id uuid references posts(id) on delete cascade
   - like_count int default 0
   - reply_count int default 0
   - created_at timestamptz default now()

   follows:
   - follower_profile_id uuid references profiles(id) on delete cascade
   - agent_id uuid references agents(id) on delete cascade
   - created_at timestamptz default now()
   - primary key (follower_profile_id, agent_id)

   likes:
   - profile_id uuid references profiles(id) on delete cascade
   - post_id uuid references posts(id) on delete cascade
   - created_at timestamptz default now()
   - primary key (profile_id, post_id)

2. Add a generated tsvector column "search_vector" on posts (from content) and a
   GIN index on it. Also add a GIN index using pg_trgm or a tsvector on agents
   (handle + display_name + bio) for agent search. Add btree indexes on all
   foreign keys (agent_id, parent_post_id, etc.) and on posts.created_at descending
   (the feed query will sort by this).

3. Write a Postgres trigger or function so that:
   - inserting a like increments posts.like_count, deleting decrements it
   - inserting a reply (post with parent_post_id set) increments the parent's
     reply_count
   - inserting/deleting a follow updates agents.follower_count
   Use triggers, not application-side counting — keep counts correct even under
   concurrent writes.

4. Enable Row Level Security on all tables. Policies:
   - agents: public read for everyone (anon + authenticated). No public write
     (agents are seeded/service-role only for this project).
   - posts: public read for everyone. No public write (same reason).
   - profiles: a user can read any profile (for displaying who liked/replied) but
     can only update/delete their own row.
   - follows: public read. A user can only insert/delete rows where
     follower_profile_id = auth.uid().
   - likes: public read. A user can only insert/delete rows where
     profile_id = auth.uid().

5. Write a trigger on auth.users that auto-creates a matching row in profiles
   when a new user signs up via Supabase Auth (copy email, and pull
   display_name/avatar_url from the Google OAuth user_metadata if present).

6. Write src/lib/types.ts with TypeScript types matching every table above
   (Agent, Profile, Post, Follow, Like), plus composed types we'll need like
   PostWithAgent (post + its agent joined).

After the schema, write a seed script at scripts/seed.ts (run via tsx, using the
Supabase service role key, NOT the anon key) that:

- Inserts 15 agents with genuinely distinct, realistic personas. Examples of the
  range I want (invent the rest in this spirit, don't just reuse these):
  - @deploybot (ci-cd) — terse, technical, posts about deployments and rollbacks
  - @researchagent (research) — posts paper summaries and findings, longer-form
  - @secscanner (security) — posts vulnerability findings, terse and serious
  - @incidentresponder (infra) — posts incident timelines, postmortems
  - @pixelmuse (creative) — posts about generated art/design experiments
  - @querytuner (data) — posts about database optimization wins
  - @supportsage (support) — posts about resolved customer issues, friendly tone
  Each agent needs a real bio (1-2 sentences, in-character) and a placeholder
  avatar (use a service like dicebear or boring-avatars via URL, not base64).

- Inserts 150-200 posts across these agents, spread realistically over the last
  30 days (not evenly — cluster some, leave gaps, like real activity). Mix
  post_types appropriately per agent (deploybot mostly 'ship'/'update',
  secscanner mostly 'finding', incidentresponder mostly 'incident'). Write
  actual varied content per post — not Lorem Ipsum, not "Post #47" — content
  that reads like a real agent's real activity log, in that agent's voice.

- Creates reply threads: roughly 15-20% of posts should be replies
  (parent_post_id set) to another post, often from a DIFFERENT agent (agents
  reply to each other — e.g. secscanner posts a finding, deploybot replies
  confirming the patch shipped). This is important for making the feed feel
  alive and interconnected.

- Do NOT seed any rows into profiles/follows/likes — those only get created
  through real human sign-in and interaction.

Print a summary when the seed completes (counts per table). Make the seed script
idempotent-safe: if run twice, it should clear and re-seed agents/posts rather
than duplicate them (truncate agents/posts with cascade at the start).

Run the migration and the seed script against the real Supabase project and
confirm row counts.
```

---

### PHASE 3 — Auth (Supabase + Google)

```
Implement Google sign-in using Supabase Auth's PKCE/SSR flow for Next.js App
Router. Use the official @supabase/ssr pattern, not the deprecated auth-helpers
package.

1. src/lib/supabase/server.ts — server client using cookies() from next/headers,
   for use in Server Components, Server Actions, and Route Handlers.
2. src/lib/supabase/client.ts — browser client, for use in Client Components only
   where strictly necessary.
3. src/lib/supabase/middleware.ts + middleware.ts at project root — refresh the
   Supabase session cookie on every request per the official SSR pattern.
4. src/server/actions/auth.ts — a server action `signInWithGoogle()` that calls
   supabase.auth.signInWithOAuth with provider 'google' and redirectTo dynamically
   built from the request origin (read via headers()), pointing to
   /auth/callback. Also a `signOut()` server action.
5. src/app/auth/callback/route.ts — the OAuth callback route handler. Exchange
   the code for a session using exchangeCodeForSession, then redirect to "/".
   Handle the error case (no code present) by redirecting to /login?error=...
6. src/app/login/page.tsx — a clean, centered login page. Logo/wordmark "Signal"
   at top, one-line tagline ("Where AI agents post, and you follow along"), and
   a "Continue with Google" button (shadcn Button, outline variant, Google "G"
   icon from lucide-react or an inline SVG — use the real multi-color Google G,
   not a generic icon) that triggers signInWithGoogle(). Make this page look
   genuinely polished, not a default auth template — this is often the first
   screen a reviewer sees.
7. A way to read the current session/user in Server Components: a helper
   `getCurrentUser()` in src/lib/supabase/server.ts that returns the Supabase
   user + the matching profiles row, or null.
8. Route protection: interactions that require auth (like, follow, reply) should
   check auth server-side in the server action itself and return a clear error
   if unauthenticated — the CLIENT should redirect unauthenticated users to
   /login when they attempt these actions, with a toast explaining why.

Do not build the full nav/header yet — that's the next phase. Just get the auth
flow itself working end to end: click "Continue with Google" on /login, complete
OAuth, land back on / authenticated, confirm a profiles row was created. Show me
how to verify this manually.
```

---

### PHASE 4 — Layout, Design System, Shell

```
Build the core app shell and visual design system for Signal. This needs to look
genuinely "top notch" — distinctive, not a default shadcn template look. Reference
Threads' actual layout patterns (centered single column feed, sticky header,
clean typography) but do not copy Threads' exact visual style — give Signal its
own identity since it's about AI agents, not people.

Design direction:
- Typography: a clean sans-serif for UI (Inter or Geist), but use a subtle
  monospace accent (e.g. JetBrains Mono or Geist Mono) for agent handles,
  timestamps, and post_type badges — this reinforces "these are machines
  posting," a small detail that sells the whole concept.
- Color: support both light and dark mode via shadcn's theme system
  (next-themes). Pick an accent color that isn't generic shadcn violet/blue —
  something that reads "signal/network" (consider a cyan or amber accent against
  neutral grays).
- post_type should have a small colored badge/dot on each post (e.g. 'incident'
  = red/orange, 'ship' = green, 'finding' = blue, 'update' = neutral, 'reply'
  = no badge, shown as threaded).

Build:
1. src/components/theme-provider.tsx + a theme toggle (sun/moon icon button)
   using next-themes, wired into the root layout.
2. src/app/layout.tsx — root layout with the theme provider, font setup
   (next/font for Inter + a mono font), and a <Toaster /> for notifications.
3. src/components/header.tsx — sticky top header, centered max-width container.
   Left: "Signal" wordmark (link to /). Center or right: search input (just
   the UI for now, wire it up in the search phase). Right: if authenticated,
   user avatar with a dropdown (shadcn DropdownMenu: profile, theme toggle,
   sign out); if not, a "Sign in" button linking to /login.
4. src/components/app-shell.tsx — the main content wrapper: centered column,
   max-width ~640px for the feed (Threads-like), responsive padding, mobile
   gets full-width with smaller side padding.
5. A bottom tab bar for mobile only (below ~768px) with icons for Home and
   Search at minimum (use lucide-react icons), hidden on desktop where the
   header nav suffices.
6. src/components/agent-avatar.tsx — reusable avatar component (shadcn Avatar)
   that takes an agent, shows their avatar_url with a fallback of their initials,
   and a small verified-checkmark badge overlay if is_verified is true.
7. src/components/post-type-badge.tsx — small badge component mapping post_type
   to a label + color as described above.

Wire this shell into the root layout so every page gets header + shell
automatically. Use a placeholder "Feed coming next" text in the home page body
for now to confirm the shell renders correctly in both light and dark mode, and
at both mobile (375px) and desktop widths. Confirm there is zero layout shift
and the header stays sticky on scroll.
```

---

### PHASE 5 — Feed Page

```
Build the main feed at src/app/page.tsx. This is the highest-visibility page in
the whole project — it needs to feel fast, alive, and information-dense without
being cluttered.

1. Data fetching: a Server Component fetches the first page (20 posts) of
   top-level posts (parent_post_id is null) ordered by created_at desc, joined
   with their agent (handle, display_name, avatar_url, is_verified, agent_type).
   Write this as a function in src/server/actions/posts.ts:
   `getFeedPosts({ cursor, limit = 20 })` using keyset pagination (where
   created_at < cursor) rather than OFFSET — this matters for performance as
   the dataset grows and avoids the "page 2 is slow" problem.

2. src/components/post-card.tsx — the core feed unit. Shows:
   - Agent avatar + display_name + @handle (mono font) + verified badge,
     all linking to /agent/[handle]
   - post_type badge
   - relative timestamp ("2h", "3d") that links to /post/[id], with a real
     <time dateTime="..."> element underneath holding the ISO timestamp
     (for agents/screen readers/SEO — visible text can stay relative)
   - post content, preserving line breaks, with sensible max line length
   - action row: like button (heart icon, fills + count on like, lucide-react),
     reply button (comment icon + reply_count, links to /post/[id]) — no
     repost/share needed for v1
   - if this post IS a reply to another agent's post, show a small "replying to
     @handle" line above the content, linking to the parent post
   Wrap the whole card in <article> for semantic correctness.

3. Infinite scroll: use an IntersectionObserver-based "load more" sentinel at
   the bottom of the list. When it comes into view, fetch the next page via a
   server action or route handler and append. Show a skeleton row (3-4 skeleton
   PostCards using shadcn Skeleton) while loading the next page — never a bare
   spinner.

4. Initial page load must be server-rendered: the first 20 posts come from the
   Server Component directly, with NO client-side fetch-on-mount for the first
   paint. Only subsequent pages (scroll-triggered) fetch client-side.

5. Empty state: if there are somehow zero posts, show a clean empty state (not
   used in practice since we seeded data, but build it anyway — “No signal yet”
   with a small icon).

6. A small composer-style affordance for HUMANS at the top of authenticated feed
   isn't needed — humans don't post top-level content in this product, they
   reply and react. Do NOT build a "what's happening" composer for top-level
   posts. (Important: don't let the AI tool default-add a Twitter-style compose
   box here — that breaks the "agents post, humans respond" concept.)

After building, manually scroll through and confirm: smooth infinite scroll,
no layout jump when new posts load, fast initial paint, both light/dark mode
look correct, and it's usable one-handed on a 375px mobile viewport.
```

---

### PHASE 6 — Agent Profile Page

```
Build src/app/agent/[handle]/page.tsx — generateStaticParams is not needed
(too dynamic / will grow), but DO add proper generateMetadata for SEO/agent-
legibility (title: "{display_name} (@{handle}) on Signal", description: bio).

1. Fetch the agent by handle (404 via notFound() if missing) plus their posts
   (same PostCard component as the feed, paginated/infinite-scroll the same
   way, but filtered to agent_id).

2. Profile header section:
   - Large avatar, display_name (with verified badge), @handle in mono,
     agent_type as a badge, bio text
   - follower_count, post count (computed), formatted with proper thousand
     separators (1,204 not 1204)
   - Follow/Following button (shadcn Button): if the viewer is unauthenticated,
     clicking it redirects to /login with a toast ("Sign in to follow
     @handle"); if authenticated, it's a real follow/unfollow action (built
     fully in the interactions phase, just wire the UI + optimistic state here
     with a stub action)
   - created_at shown as "Active since {month year}"

3. Tabs (shadcn Tabs) under the header: "Posts" (default, top-level posts only)
   and "Replies" (posts where this agent is the author AND parent_post_id is
   set) — this mirrors Threads' profile tab pattern and shows off the
   reply-thread data you seeded.

4. Responsive: on mobile, header stacks vertically (avatar above name/handle);
   on desktop, avatar sits left of the text block.

Confirm by visiting a couple of different seeded agent profiles and checking
the Posts/Replies tabs actually filter correctly and the page looks complete
in both themes and both viewport sizes.
```

---

### PHASE 7 — Post Detail + Reply Thread

```
Build src/app/post/[id]/page.tsx.

1. Fetch the post (404 if missing) with its agent joined. If the post has a
   parent_post_id, fetch and show the parent post above it in a slightly
   de-emphasized style (smaller/muted) with a connecting line or visual thread
   indicator, similar to how Threads shows "replying to" context — clicking the
   parent navigates to ITS detail page.

2. Show the main post large and prominent (bigger text than feed card).

3. Below it, fetch and list all direct replies (posts where parent_post_id =
   this post's id) ordered by created_at asc, using PostCard in a slightly
   condensed mode (add a `compact` prop to PostCard if not already present).

4. If the viewer is authenticated, show a reply composer (Textarea + Submit)
   at the top of the replies section — humans CAN reply to posts (this is
   different from Phase 5's note: humans don't create top-level agent-style
   posts, but they CAN reply in the thread). The reply gets inserted as a row
   in posts with parent_post_id set, but note: replies authored by a HUMAN
   need a way to be visually distinguished from agent replies in the UI (e.g.
   show the human's Google profile avatar/name instead of an agent card style,
   maybe a subtly different background tint) — handle this by allowing posts
   created by humans to optionally carry profile_id instead of agent_id. STOP
   and check with me on the schema implication before implementing this part:
   we may need an ALTER TABLE on posts to make agent_id nullable and add a
   profile_id column, with a check constraint that exactly one of the two is
   set. Propose the migration, then implement once I confirm.

5. If unauthenticated, show the composer in a disabled/locked state with a
   "Sign in to reply" prompt instead of hiding it entirely.

Confirm thread navigation works both directions (parent link up, replies down)
and that human vs agent replies are visually distinct once implemented.
```

---

### PHASE 8 — Interactions (Like, Follow, Reply submit)

```
Wire up full, real interactivity using Server Actions with optimistic UI on
the client. No interaction should feel like it's waiting on a network request.

1. src/server/actions/likes.ts — `toggleLike(postId)`: checks auth, inserts or
   deletes the likes row for (current user, postId), relies on the DB trigger
   from Phase 2 to keep posts.like_count correct. Revalidate the relevant path
   (revalidatePath) so server-rendered counts stay correct on next navigation.

2. src/server/actions/follows.ts — `toggleFollow(agentId)`: same pattern for
   follows.

3. src/server/actions/posts.ts — `createReply(parentPostId, content)`: checks
   auth, validates content (non-empty, reasonable max length, e.g. 500 chars),
   inserts the reply row, relies on the trigger to increment reply_count.

4. Client-side optimistic UI: convert PostCard's like button (and the profile
   page's follow button) into Client Components (or isolate just the
   interactive button into a small Client Component island, keeping PostCard
   itself a Server Component where possible) using useOptimistic or local state
   + startTransition, so the heart fills and count increments INSTANTLY on
   click, before the server action resolves. On error, roll back the optimistic
   state and show a toast.

5. For unauthenticated users clicking like/follow/reply: redirect to /login
   (or show a toast + redirect), don't silently fail.

6. Add basic rate-limiting/debounce so rapid double-clicks on like don't send
   duplicate requests (disable the button briefly during the pending
   transition, or use the primary key conflict on (profile_id, post_id) as a
   natural guard — handle that unique constraint error gracefully either way).

After this phase, do a full manual pass: sign in, like several posts across
different agents, follow a couple of agents, post a reply, refresh the page
and confirm everything persisted correctly (counts, follow state, the reply
appearing in the thread).
```

---

### PHASE 9 — Search

```
Build full-text search across both agents and posts.

1. src/app/search/page.tsx — reads ?q= from search params. Server Component
   that, if q is present, runs the search server-side and renders results;
   if absent, shows a clean "search agents and posts" empty/prompt state.

2. src/server/actions/search.ts — `searchAll(query)` that runs two Postgres
   queries using the tsvector/GIN indexes from Phase 2:
   - agents matching handle/display_name/bio (use websearch_to_tsquery for
     natural query parsing)
   - posts matching content
   Return both result sets with a relevance rank (ts_rank), each capped at a
   reasonable limit (e.g. 10 agents, 20 posts).

3. UI: results grouped in two sections — "Agents" (small agent cards: avatar,
   name, handle, bio snippet, follower count) then "Posts" (using PostCard).
   If only one type has results, only show that section. If neither, a clear
   "No results for '{query}'" empty state.

4. Header search input (built as a placeholder in Phase 4) now actually works:
   typing and pressing Enter, or a debounced live-as-you-type behavior (your
   call, debounced 300ms is fine), navigates to /search?q=... Use the URL as
   the source of truth (so search is shareable/bookmarkable, and so an agent
   fetching /search?q=incident could theoretically parse it too — though the
   JSON API in the next phase is the real machine-readable path).

Test with a few realistic queries (an agent handle, a word you know appears in
seeded post content, a nonsense query with no matches) and confirm relevance
ordering looks sane and the empty state triggers correctly.
```

---

### PHASE 10 — Agent-Legibility Layer (llms.txt + JSON API)

```
This is the conceptual core of the project: making Signal's content readable
by AI agents/LLMs directly, not just by humans through HTML. Build this
carefully and make it genuinely correct, since it's the differentiator I'll be
asked about.

1. public/llms.txt — a static Markdown file (served automatically by Next.js
   at the site root) following the llms.txt convention: an H1 title, a short
   blockquote summary, then sections describing what the site is and how an
   agent should consume it. Include:
   - What Signal is, in 2-3 sentences
   - The JSON API endpoints below, with their purpose and example response
     shape, written out
   - The human-facing URL patterns (/agent/{handle}, /post/{id}) in case an
     agent wants to link back to a human-readable page
   - A note that this is a demo/portfolio project

2. src/app/api/agents/route.ts — GET, returns JSON array of all agents
   (id, handle, display_name, bio, agent_type, is_verified, follower_count,
   created_at). Support optional ?type= filter by agent_type. Set a
   Cache-Control header (e.g. public, s-maxage=300, stale-while-revalidate=60)
   since this data doesn't change often relative to request volume.

3. src/app/api/agents/[handle]/route.ts — GET, returns a single agent plus
   their N most recent posts (use a query param ?limit=, default 20, cap at
   100). 404 with a clean JSON error body if handle doesn't exist.

4. src/app/api/posts/route.ts — GET, returns paginated posts (keyset
   pagination via ?before=<ISO timestamp>, default limit 20, cap 100), each
   with its agent's handle/display_name embedded (denormalized, so an agent
   consuming this doesn't need a second fetch per post). Support optional
   ?agent= (filter by handle) and ?type= (filter by post_type).

5. Every JSON route should return a consistent envelope, e.g.:
   { data: [...], meta: { count, next_cursor } }
   and consistent error shape on failure:
   { error: { message, code } }

6. Add a robots.txt at public/robots.txt that explicitly allows crawling of
   /api/ (don't accidentally block agents from reading the very thing you
   built for them) and references the llms.txt location.

7. Write a short section for the project README (just produce the Markdown,
   I'll place it) titled "Built for agents" explaining: the llms.txt file,
   the JSON API, and the semantic HTML choices made elsewhere (the <article>,
   <time>, <address>-style markup from earlier phases) — framed as one
   coherent design decision, not three separate features.

Test by literally curling /llms.txt, /api/agents, /api/agents/deploybot (or
whichever handle you seeded), and /api/posts directly and confirming clean,
correct JSON with no leaked internal fields (no service role data, no raw
Postgres errors).
```

---

### PHASE 11 — Polish Pass

```
Do a full polish pass across the whole app. Go page by page: /, /login,
/agent/[handle], /post/[id], /search.

1. Loading states: confirm every data-fetching boundary has a real loading.tsx
   (Next.js file convention) with skeleton UI matching the actual content
   shape — not a generic spinner anywhere.

2. Error states: add error.tsx boundaries where sensible; confirm a deleted/
   invalid agent handle or post id shows a proper 404 (not-found.tsx), not a
   crash.

3. Empty states: re-check every list view (feed with no results edge case,
   profile with no posts, search with no matches) has a designed empty state,
   not blank space.

4. Dark mode: go through every page/component in dark mode specifically and
   fix any contrast issues, especially on badges and the mono-font handle
   text.

5. Accessibility: every icon-only button (like, reply, theme toggle) needs an
   aria-label. Confirm focus states are visible (don't strip default focus
   rings without replacing them). Confirm color isn't the only signal for
   post_type badges (icon or text label alongside color).

6. Mobile QA at 375px: re-check header, feed, profile header, post composer,
   bottom tab bar — nothing should overflow horizontally or require pinch-zoom.

7. Small details that read as "top notch": consistent border-radius scale, a
   subtle hover/transition on cards and buttons (150-200ms), consistent
   spacing scale (stick to Tailwind's default spacing tokens, don't invent
   arbitrary px values), and a custom favicon + Open Graph meta tags (title,
   description, og:image — even a simple branded placeholder image) so the
   link looks good if shared in Slack/iMessage when you send the live preview.

List everything you changed in this pass as a summary at the end.
```

---

### PHASE 12 — Performance Pass

```
Run a performance audit and fix what's flagged.

1. Run `next build` and review the output — flag any route that's larger than
   expected, or any Server Component that accidentally became a Client
   Component (check the build output's route type indicators).

2. Confirm next/image is used for every avatar and any other image, with
   explicit width/height or fill+sized container — no layout shift.

3. Confirm fonts are loaded via next/font (not a <link> to Google Fonts in
   the HTML head) so they're self-hosted and don't block render.

4. Check the feed query and search query with EXPLAIN ANALYZE against the
   real seeded data in Supabase — confirm the indexes from Phase 2 are
   actually being used (look for Index Scan, not Seq Scan, in the plan). Fix
   any missing index this reveals.

5. Confirm the /api/* routes have caching headers set (from Phase 10) and
   aren't marked force-dynamic unnecessarily.

6. Deploy a preview build to Vercel (or run `next build && next start`
   locally) and run Lighthouse against the feed page and a profile page, both
   mobile and desktop presets. Target: Performance ≥ 90, Accessibility ≥ 95,
   Best Practices ≥ 95. Report the actual scores and fix anything dragging
   them down (oversized images, render-blocking resources, missing
   meta viewport, etc.).

Report before/after if you make changes that affect bundle size or scores.
```

---

### PHASE 13 — Deploy

```
Prepare for and execute a production deploy to Vercel.

1. Confirm .env.local.example is current and matches every env var actually
   used in the codebase (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY — note: service role key should ONLY be used in
   the seed script / trusted server context, confirm it's never imported into
   any client-reachable code path).

2. Write a short, clean README.md covering: what Signal is (2-3 sentences),
   the stack, how to run locally (env vars, migration, seed), and the "Built
   for agents" section from Phase 10.

3. Walk me through, step by step, exactly what I need to do manually:
   - Push final code to GitHub
   - Import the repo into Vercel
   - Add the three env vars in Vercel project settings
   - Get the resulting *.vercel.app URL
   - Add that URL (with /** wildcard) to Supabase Auth → URL Configuration →
     Redirect URLs
   - Add the exact production callback URL to Google Cloud Console →
     Credentials → Authorized redirect URIs (this is the Supabase-hosted
     callback URL, not the Vercel one — confirm which one before adding)
   - Add the Vercel production domain to Google Cloud Console → Authorized
     JavaScript origins

4. After deploy, give me a smoke-test checklist to run manually on the live
   URL: sign in with Google end to end, view feed, view an agent profile,
   view a post thread, like a post, follow an agent, post a reply, run a
   search, fetch /llms.txt directly, fetch /api/agents directly. Confirm
   each works before calling this done.
```

---

## Notes on using these prompts with your AI coding tool

- Run phases in order, in the **same project/session** so context carries forward — don't start each phase in a fresh chat with no memory of prior code.
- After each phase, actually run the app and click through it yourself before moving on. If something's broken, fix it in that phase before starting the next — debugging compounding issues across phases is much harder.
- When a prompt says "STOP and check with me" (Phase 7, step 4), actually pause and think it through — that's a real schema decision point, not filler.
- If you're behind schedule by Saturday night, the phases you can compress or cut without breaking the core pitch, in order of safest-to-cut: Phase 11 (polish) can be shortened to just dark mode + mobile QA; Phase 9 (search) could ship as agents-only search if posts search is taking too long; do NOT cut Phase 10 (llms.txt/API) — that's your differentiator, protect that time above all else.