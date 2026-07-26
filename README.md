# Shepard

> The dog that fits the life you already live.

Shepard is a laptop-first product demo that turns everyday work-pattern
metadata into a human lifestyle profile, translates that profile into a
conceptual dog, and then ranks dogs whose needs fit the person’s real routine.

The intended product answers a simple question:

> Instead of choosing a dog by looks alone, what if we started with the life
> that dog would actually be joining?

## Demo status

**Current status:** high-fidelity MVP / direct-demo build. It is not yet a
production account-linking or adoption platform.

The six-page experience is fully clickable and the core profile, genome, and
matching calculations are implemented. The demo intentionally combines:

- optional live Google Calendar metadata through Merge Agent Handler;
- deterministic local analysis and matching;
- fixture-backed Slack, Drive, persona, and dog data;
- cinematic loading sequences that visualize already-computed results; and
- a fixed Basset Hound 3D asset that is tinted and annotated from the generated
  profile.

This distinction matters when presenting Shepard: the UI demonstrates the
intended end-to-end product, while several data and rendering layers remain
controlled demo implementations.

### Capability matrix

| Area | Current demo | Intended product |
|---|---|---|
| Account connection | Ten Merge connector examples are shown. Google Calendar, Google Drive, and Slack Messages can be dragged or tapped into the dock; the other seven are disabled previews. The selection gates the demo form but does not run OAuth. | Launch Merge Link, authenticate each selected account, and keep connection state tied to the user. |
| Source data | Fixture mode is the default. Optional live mode reads Google Calendar events through Merge Agent Handler; Slack and Drive metrics remain fixture-backed. | Read normalized metadata from Calendar, Slack, Drive, and other approved sources through Merge. |
| Privacy behavior | Server-side keys never reach the browser. Calendar normalization uses timing, duration, all-day, and attendee-count metadata. There is no database or persistence layer. | Give users explicit consent, connector-level controls, revocation, retention rules, and production security review. |
| Personality analysis | Implemented as deterministic weighted formulas over nine normalized signals. It is explainable and repeatable; it is not an LLM or trained psychological model. | Evolve and validate the model with broader behavioral features, user feedback, and transparent confidence/explanations. |
| Analysis loading | A polished 12-second visualization reveals signals and traits. Results are computed before the animation begins. It then waits for “View my profile.” | Use the same visual language around real ingestion/normalization progress without pretending that finished work is still running. |
| Dog blueprint | Thirteen deterministic genome values are calculated: eleven numeric shape/behavior values and two colors. | Drive a richer procedural or generative dog system with validated links between lifestyle and temperament. |
| 3D dog | The current viewer always isolates the Basset Hound mesh from the bundled model pack. The generated coat color lightly tints it; the full genome drives blueprint copy and annotations but does not yet morph the mesh. | Generate or morph a visibly unique dog body, coat, posture, and expression from the full genome. |
| Dog matching | Ten local dog records are ranked with an asymmetric needs-versus-supply score and dog-specific reasons. | Rank current, adoptable shelter inventory with live availability, distance, and application links. |
| Match explanation | Merge Gateway can generate a short explanation when configured; otherwise a safe local fallback is returned. | Produce grounded explanations with citations to approved signals and current shelter data. |
| Map and distance | The map is illustrative and distances are stored demo values. | Use real location-aware shelter search with user consent. |
| Adoption workflow | Not implemented. | Let users save, compare, contact, or apply through participating shelters. |

## Intended demo story

The direct demo is meant to communicate this product journey:

1. **Connect the shape of your life.** A user authorizes work and schedule
   sources. Shepard reads patterns such as meeting density, free blocks,
   after-hours activity, and file activity—not message or document content.
2. **Build a lifestyle profile.** Those signals resolve into activity level,
   home presence, routine stability, household noise, patience, and social
   density, with evidence available for every score.
3. **Translate lifestyle into a dog concept.** The same profile becomes a
   temperament and physical blueprint for a dog that could thrive in that
   environment.
4. **Make the result understandable.** An interactive 3D dog and five
   lifestyle annotations show why the recommendation looks and behaves the way
   it does.
5. **Turn imagination into adoption.** Shepard ranks real shelter dogs by what
   each dog needs from a person, then explains the strongest fits.

The current MVP tells that complete story, but “Connect” is a simulated
connection form, Slack/Drive are fixtures, the 3D body is a fixed Basset mesh,
and the shelter inventory/map are local demo data.

Shepard is intended as adoption decision support, not an automated placement
decision. Shelter assessments, household constraints, professional behavior
guidance, and an in-person meeting remain essential. The generated dog is an
emotional explanation of lifestyle fit—not a claim that appearance predicts
compatibility.

## The six-page demo and narration guide

The canonical click-through is:

`Connect → Analyze → Profile → Create → Meet → Match`

The shared header keeps the Shepard mark at top-left and shows progress across
all six stages at top-right. Page transitions, clouds, panels, loading
choreography, and interaction feedback use Motion with reduced-motion support.

### 1. Connect — “Your life already knows your dog”

**What the viewer sees**

- A lifestyle-led hero statement on the left.
- A Merge-inspired connection lab on the right.
- Ten connector examples: Google Calendar, Google Drive, Slack Messages, Gmail,
  Notion, Dropbox, Salesforce, HubSpot, Jira, and Microsoft Teams.
- Calendar, Drive, and Slack are active. The other seven are visibly disabled
  previews.
- Active connectors can be dragged into the dock or tapped. All three are
  required before the form can run.
- Submitting shows a short three-source authorization theater, then calls
  `POST /api/profile`.

**What this page is demonstrating**

The intended product begins with passive evidence from a person’s existing
routine instead of a long self-report questionnaire. Shepard is interested in
patterns: when the day starts, how crowded the calendar is, how often work
spills into the evening, and how much uninterrupted time exists.

**Commentary beats for a later voiceover**

- Most dog matching starts with breed or appearance; Shepard starts with the
  life the dog will enter.
- The user chooses exactly which sources to connect.
- Shepard is designed to derive behavioral metadata, not read private messages
  or documents.
- In this MVP, the connection interaction is representative: it gates the real
  profile endpoint but does not launch Merge Link or OAuth.

**Operator cue**

Drag or tap Google Calendar, Google Drive, and Slack Messages, then select
**Connect my sources**.

### 2. Analyze — “Reading your rhythm”

**What the viewer sees**

- A 12-second Cloud Lab sequence.
- Nine incoming lifestyle signals in the left panel.
- A central scanner with Calendar, Slack, and Drive source markers.
- Six profile instruments resolving on the right.
- Phase language moves through “Reading your rhythm,” “Finding patterns,”
  “Building your profile,” and “Finalizing your profile.”
- **Finish now** reveals the completed state without changing pages.
- Natural completion also stops on this page and reveals
  **View my profile**. Navigation only happens when the user clicks it.

**What this page is demonstrating**

Raw connector data is normalized into a common signal model, then mapped into
six understandable lifestyle traits. The screen makes the relationship between
source evidence and profile output visible instead of returning a mysterious
one-line result.

**Commentary beats for a later voiceover**

- Calendar contributes schedule density, active hours, weekend load, free
  blocks, travel gaps, and group-event ratios.
- Slack contributes message volume and after-hours activity.
- Drive contributes a file-activity pattern. That signal is displayed in the
  current profile theater but is not yet used by the six trait formulas.
- The current math is deterministic and explainable. The loading sequence is
  visualization theater; `computeAll()` has already produced the profile,
  genome, and dog ranking before this screen opens.
- The deliberate pause at 100% gives a presenter time to finish the thought
  before moving on.

**Operator cue**

Let the full 12 seconds play when pacing allows. Use **Finish now** during a
shorter rehearsal. In either case, click **View my profile** to continue.

### 3. Profile — “Your life, translated”

**What the viewer sees**

- A plain-language personality summary.
- Six scored traits:
  - activity level;
  - home presence;
  - routine stability;
  - household noise;
  - patience; and
  - social density.
- A **Why this score** disclosure on every trait, containing the source evidence
  used to derive it.
- A primary **Shape my dog** action.

**What this page is demonstrating**

Shepard is not matching on a single “active versus inactive” axis. A good fit
also depends on how long the person is home, how stable the day is, how noisy or
social the household feels, and whether the person has unhurried time for a dog
that needs patience.

**Canonical homebody demo**

The default fixture is intentionally Basset-compatible:

| Trait | Demo value | Interpretation |
|---|---:|---|
| Activity level | 29% | Low-mileage week |
| Home presence | 93% | Usually home and available |
| Routine stability | 86% | Predictable days and evenings |
| Household noise | 38% | Relatively calm environment |
| Patience | 89% | Plenty of unhurried time |
| Social density | 50% | Moderate, not isolated or constantly crowded |

Live Calendar data or a different fixture will produce different values.

**Commentary beats for a later voiceover**

- The profile is short by default, but every result remains inspectable.
- Evidence makes the recommendation debuggable and gives the user something
  concrete to agree or disagree with.
- The default person is affectionate, home-oriented, calm, highly patient, and
  consistent—the kind of person who can enjoy a laid-back, stubborn,
  scent-driven companion.

**Operator cue**

Open one **Why this score** row to show evidence, close it, then select
**Shape my dog**.

### 4. Create — “Canine blueprint”

**What the viewer sees**

- A 14-second high-tech dog-generation sequence.
- A wireframe Basset silhouette assembling in the center.
- Eleven numeric genome parameters resolving around it:
  body length, body height, leg length, head size, ear droop, ear size, snout
  length, tail length, tail curl, fluffiness, and posture.
- Coat and accent colors resolve as the final two parameters.
- **Finish now** completes the visualization without navigating.
- At 100%, the page waits and reveals **Meet my dog**.

**What this page is demonstrating**

The human profile is translated into a dog blueprint. In the current
deterministic mapping, for example, lower activity tends toward shorter legs
and a longer body, a quieter home tends toward softer ears, patience tends
toward a rounder head and shorter muzzle, and home presence contributes to a
heavier coat.

**Commentary beats for a later voiceover**

- This is the bridge between an abstract personality profile and a memorable
  visual recommendation.
- All thirteen values are real computed outputs, not random loading text.
- The sequence is intentionally cinematic, but the result already exists when
  it begins.
- The final product is intended to morph or generate the visible 3D dog from
  these parameters; today the full blueprint is expressed in the UI while only
  coat tint reaches the fixed Basset mesh.

**Operator cue**

Allow the 14-second build to finish for the full presentation. Click
**Meet my dog** only after the completion state appears.

### 5. Meet — “The dog your days shaped”

**What the viewer sees**

- A large, interactive Basset Hound in a transparent Three.js scene.
- A technical floor grid, concentric rings, scan plane, contact shadow, soft
  lighting, and passive turntable motion.
- Orbit and zoom controls; idle rotation pauses while the user interacts.
- Five clickable lifestyle annotations:
  - Daily rhythm;
  - Energy compatibility;
  - Home presence;
  - Social environment; and
  - Sensitivity & patience.
- Selecting a dot updates the explanation panel and connects a human trait to
  temperament and a physical-expression note.
- A compact temperament summary with an expandable **Full temperament** section.
- A **See my matches** action.

**What this page is demonstrating**

The dog is not presented as a magic answer. Each annotation explains how a
specific part of the user’s life influenced the recommendation. For the
homebody fixture, the visible story is a laid-back, affectionate, routine-loving
companion suited to slow, scent-led walks and plenty of shared time.

**Commentary beats for a later voiceover**

- Clickability turns the generated dog into an explanation surface, not just a
  mascot.
- The grid and scan treatment represent a living blueprint while the soft
  clouds and friendly dog keep the experience human.
- Be precise about current capability: the Basset geometry is a fixed licensed
  asset. The generated coat color is applied as a tint; the other genome values
  currently drive the labels, temperament, and annotation story.
- “Put your dog in a photo” is intentionally not part of this demo.

**Operator cue**

Drag the model slightly, click **Energy compatibility** and **Home presence**,
optionally expand **Full temperament**, then select **See my matches**.

### 6. Match — “Someone worth meeting”

**What the viewer sees**

- An explicitly illustrative area map.
- One large best-match card with photo or graceful initial-based fallback,
  metadata, score, and the strongest reason.
- A compact **Why this match** disclosure containing additional reasons,
  character notes, care details, and the asynchronous Shepard explanation.
- Nine additional dogs ranked in a horizontal card rail.
- A **Start over** action.

**What this page is demonstrating**

The conceptual dog becomes an adoption-oriented result. Matching is based on
what each dog needs from a person—not just surface similarity. Shortfalls such
as too little time at home are penalized more heavily than harmless excesses,
and every dog has specific reasons drawn from its local record.

With the default homebody fixture, **Fog** is currently the top match at roughly
91% because the person’s high home presence, patience, quiet environment, and
low activity fit her needs.

**Commentary beats for a later voiceover**

- The generated dog helps the user understand themselves; the ranked dogs turn
  that understanding into an actionable adoption direction.
- The score is deterministic and considers patience, routine, home presence,
  energy, noise tolerance, and estimated handling experience.
- The map is not live, and the ten-dog inventory is local demo data.
- When Merge Gateway is configured, Shepard can add a concise grounded
  explanation. Without it, the endpoint returns a reliable fallback.
- The intended product would use current shelter inventory, real distance, and
  a direct next step with the shelter.

**Operator cue**

Open **Why this match**, point out the care note and Shepard’s explanation,
scroll the remaining matches if useful, then use **Start over**.

## How the current pipeline works

```text
Connector form
    ↓ POST /api/profile
RawMergeData: 9 normalized signals
    ↓ analyze()
HumanProfile: 6 traits + evidence + summary
    ↓ toGenome()
DogGenome: 11 numeric values + 2 colors
    ↓ match()
10 ranked local dog records + reasons
```

`computeAll()` runs `analyze()`, `toGenome()`, and `match()` synchronously as
soon as `RawMergeData` arrives. Both loading pages replay known results; they do
not delay or mutate the calculation.

### Nine source signals

| Source | Signals |
|---|---|
| Google Calendar | meeting density, time-of-day spread, weekend load, longest free block, travel gaps, group-event ratio |
| Slack | message volume, after-hours activity |
| Google Drive | file activity |

Every signal contains:

- a normalized `0–1` value;
- a human-readable raw evidence string; and
- a `synthetic` flag that tracks fixture versus live origin internally.

### Six lifestyle traits

`analyze()` uses explicit weighted formulas to calculate activity level, home
presence, routine stability, household noise, patience, and social density.
The same input always produces the same profile.

### Thirteen dog-genome values

`toGenome()` deterministically maps the profile to body length, body height,
leg length, head size, ear droop, ear size, snout length, tail length, tail
curl, coat color, accent color, fluffiness, and posture.

### Dog matching

Each local dog has a six-dimensional needs vector:

- patience;
- routine stability;
- home presence;
- activity level;
- noise tolerance; and
- dog experience.

`match()` compares the person’s available “supply” against those needs.
Shortfalls and excesses receive different penalties, high-impact needs receive
more weight, and dog-specific care notes generate concrete reasons. Results are
stable and sorted from highest to lowest score.

## Data modes and Merge behavior

### Fixture mode — default

```bash
DATA_SOURCE=fixture
FIXTURE_PERSONA=homebody
```

No network or credentials are required. All nine signals come from a local
persona and are marked synthetic internally.

Available personas:

| Persona | Intended lifestyle | Current top match |
|---|---|---|
| `homebody` | Calm, patient, highly present, routine-oriented | Fog |
| `outdoorsy` | Active weekends and long movement windows | Presidio |
| `busyTraveler` | Dense calendar, travel, little home time | Boulder |
| `quietApartment` | Quiet home and fixed rhythm | Kimbop |
| `socialHost` | Busy, social, noisy household | Sutro |

### Live mode — partial

```bash
DATA_SOURCE=live
MERGE_AGENT_HANDLER_KEY=...
MERGE_TOOL_PACK_ID=...
MERGE_REGISTERED_USER_ID=...
```

In live mode:

1. the server discovers or uses the configured Calendar `list_events` tool;
2. it requests up to 250 primary-calendar events from the last 30 days;
3. six Calendar signals are normalized from event timing and attendee counts;
4. Slack and Drive signals still come from the selected fallback fixture; and
5. any missing credential, network error, malformed response, or non-200 result
   falls back to fixture data without breaking the demo.

`personaId` and the response’s connector list also remain fixture-derived in
live mode. Because fallback is deliberately silent in the browser, presenters
should confirm the server configuration rather than infer “live” status from
the UI.

The current Connect page does **not** create a Merge registered user or open
Merge Link. A registered user and connected account must already exist for
`DATA_SOURCE=live` to return live Calendar metadata. Connector selections are a
presentation/form gate and are not sent to `/api/profile`.

See the official [Merge Agent Handler connector
catalog](https://docs.merge.dev/merge-agent-handler/connectors/overview) and
[Merge Link authentication
guide](https://docs.merge.dev/merge-agent-handler/build/authentication/link)
for the production connection path.

### Merge Gateway explanation — optional

When `MERGE_GATEWAY_KEY` is present, `/api/explain` sends the top dog, the human
profile, evidence, and the dog-needs vector to an OpenAI-compatible Merge
Gateway endpoint. It asks for a warm, grounded two-to-three-sentence
explanation and times out after five seconds.

If the key is absent or any request fails, a local fallback explanation is
returned. The match ranking itself never depends on this network call.

## Run locally

Requirements:

- Node.js and npm;
- a modern browser with WebGL for the 3D page; and
- network access during the first production build so `next/font` can fetch
  Geist from Google Fonts.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The default `.env.example` configuration runs the complete demo offline with
the `homebody` fixture.

### Commands

```bash
npm run dev      # Next.js development server
npm test         # Vitest: 39 deterministic tests, no network required
npx tsc --noEmit # TypeScript check
npm run build    # Production Next.js build
npm start        # Serve the production build
```

## Environment variables

All variables are optional unless live Merge mode is enabled.

| Variable | Purpose |
|---|---|
| `DATA_SOURCE` | `fixture` by default; set to `live` for Merge Agent Handler Calendar data. |
| `FIXTURE_PERSONA` | `homebody`, `outdoorsy`, `busyTraveler`, `quietApartment`, or `socialHost`. Used in fixture mode and as live fallback. |
| `MERGE_AGENT_HANDLER_KEY` | Server-side Merge Agent Handler key. |
| `MERGE_TOOL_PACK_ID` | Tool pack containing the registered user’s Calendar tool. |
| `MERGE_REGISTERED_USER_ID` | Existing Merge registered user ID. |
| `MERGE_AGENT_HANDLER_BASE_URL` | Optional override; defaults to `https://ah-api.merge.dev`. |
| `MERGE_CALENDAR_TOOL_NAME` | Optional exact tool name; otherwise the server discovers a name ending in `list_events`. |
| `MERGE_GATEWAY_KEY` | Enables the optional top-match explanation request. |
| `MERGE_GATEWAY_BASE_URL` | Optional override; defaults to `https://api-gateway.merge.dev/v1/openai`. |
| `MERGE_GATEWAY_MODEL` | Optional model name; defaults to `gpt-5.2`. |

All Merge requests happen in server routes. Environment keys are never
serialized into browser responses or UI state.

## Direct demo and developer routes

### Jump directly to a demo page

The main page accepts a flow state and fixture persona:

```text
/?state=connect&persona=homebody
/?state=analyzing&persona=homebody
/?state=profile&persona=homebody
/?state=generating&persona=homebody
/?state=dog&persona=homebody
/?state=nearby&persona=homebody
```

Replace `homebody` with any fixture persona listed above. Deep links compute the
full pipeline synchronously from that fixture, then open the requested page.

### Developer harness

- `/dev` shows the selected raw fixture, computed human profile, dog genome,
  interactive 3D viewer, full match ranking, and links into every flow state.
- `/dev/genome` exposes sliders for all genome parameters for visual inspection.

## Replacing dog images

The demo’s current dog photos live in:

[`public/dogs/`](./public/dogs/)

Use these exact lowercase filenames:

```text
campi.jpg
cinderella.jpg
sierra.jpg
kimbop.jpg
indigo.jpg
boulder.jpg
meter.jpg
presidio.jpg
sutro.jpg
fog.jpg
```

The browser URLs are `/dogs/<id>.jpg`; do not include `public` in
`src/data/dogs.ts`. A gradient card with the dog’s initial appears when a file
is absent or fails to load.

To add another dog, append a `ShelterDog` object to `src/data/dogs.ts` with:

- a stable lowercase `id` and display `name`;
- date of birth, breed, sex, weight, vaccination, and neuter metadata;
- concise `character` and `features` care notes;
- the six-value `needs` vector;
- internal source provenance;
- location, distance, and `/dogs/<id>.jpg` photo path.

The matcher includes new records automatically. Re-run the test suite because
adding inventory can change persona ranking regressions.

## Architecture

| Path | Responsibility |
|---|---|
| `src/app/page.tsx` | Six-state client flow and synchronous `computeAll()` handoff |
| `src/components/FlowShell.tsx` | Shared atmosphere, brand, progress navigation, and reduced-motion configuration |
| `src/components/screens/` | The six direct-demo page compositions |
| `src/components/DogViewer.tsx` | Basset GLTF extraction, tinting, lighting, grid, scan plane, orbit, and idle animation |
| `src/app/api/profile/route.ts` | Fixture or partial-live Merge profile endpoint |
| `src/app/api/explain/route.ts` | Optional Merge Gateway explanation with fallback |
| `src/lib/analyze.ts` | Nine signals → six lifestyle traits |
| `src/lib/genome.ts` | Six traits → thirteen dog-genome values |
| `src/lib/match.ts` | Human supply → dog-needs ranking and reasons |
| `src/lib/flow.ts` | State constants, display order, synchronous computation, and theater timelines |
| `src/lib/merge/` | Fixture source, Agent Handler client, and Calendar normalization |
| `src/data/fixtures/personas.ts` | Five deterministic demo personas |
| `src/data/dogs.ts` | Ten local dog records |

### Main stack

- Next.js 16.2.12 App Router;
- React 19.2.4;
- TypeScript;
- Tailwind CSS 4;
- Motion 12.42.2 via `motion/react`;
- React Three Fiber, Drei, and Three.js; and
- Vitest 4.1.10.

## Reliability and test status

The demo is designed to fail soft:

- profile-source errors fall back to fixtures;
- explanation errors fall back to local copy;
- missing dog photos render a visual fallback;
- the 3D model is wrapped in an error boundary;
- timed screens can be finished early but never auto-navigate;
- completion waits for explicit user action; and
- reduced-motion preferences disable or simplify nonessential movement.

Current automated coverage: **39 tests across four files**.

The suite covers:

- connector inventory, enabled-state gating, and duplicate selection;
- six-state flow and 12/14-second timing constants;
- fixture selection and fallback behavior;
- Merge credential, network, HTTP, and key-leak failure cases;
- Calendar normalization and synthetic/live signal flags;
- deterministic analysis, genome, ranking, score bounds, and evidence;
- the Basset-compatible homebody regression; and
- single-language dog-name data.

The repository does not yet contain component, screenshot, accessibility, or
end-to-end browser tests. The timeline suite currently locks the duration
constants, while timer lifecycle, drag geometry, 3D interaction, and disclosure
behavior are verified manually in the direct click-through. There is also no
successful live Agent Handler or Merge Gateway integration test in the local
suite.

The current working build has been verified with:

```bash
npm test
npx tsc --noEmit
npm run build
```

## Known limitations and presentation guardrails

Do not describe the following as live in the current MVP:

- account authentication or Merge Link;
- Slack or Drive ingestion;
- an AI-generated personality model;
- real-time work occurring during either loading screen;
- full procedural 3D body generation;
- a live shelter feed, availability, map, or distance;
- an adoption application flow; or
- persistent user profiles or saved matches.

Also note:

- The connector shelf is a working demo form, not an OAuth form.
- The “personality” profile is a transparent lifestyle heuristic, not a
  clinical or psychological assessment.
- Drive file activity is currently displayed but not included in a trait
  formula.
- “Dog experience” is inferred from patience and routine stability because the
  current signal model does not measure prior handling experience directly.
- Dog source provenance remains in the data model but is intentionally not
  displayed as “real” or “synthetic” labels.
- The removed “put your dog in a photo” concept is outside the direct demo and
  has no camera, upload, or compositing UI.

## Intended next-stage work

1. Add Merge Link and registered-user creation to the Connect page.
2. Replace fixture Slack and Drive metrics with live normalized metadata.
3. Add consent, disconnect, retention, and deletion controls.
4. Morph or generate the visible 3D dog from the full genome.
5. Connect to live shelter inventory and location search.
6. Add dog detail, save/compare, shelter contact, and application handoff.
7. Validate the lifestyle model and dog-needs rubric with shelters, trainers,
   behaviorists, and adopters.
8. Add end-to-end browser tests for drag-to-connect, timed completion, 3D
   annotation selection, and match disclosure behavior.

## Asset credit

The 3D viewer uses “Low Poly Dog Pack” from Sketchfab. The local license is at
`public/models/low_poly_dog_pack/license.txt`. The current viewer isolates the
Basset Hound from that pack.
