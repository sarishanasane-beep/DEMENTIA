# SmartMind — Cognitive Wellness Assistant

**AI-Based Cognitive Gaming & Memory Assistance Platform for Elderly Dementia Patients**

---

## Project Purpose

SmartMind is a cognitive wellness platform designed to support elderly individuals through:

1. **Voice-based interaction** — natural conversation with a friendly assistant
2. **Cognitive games** — engaging activities across 5 domains
3. **Personalised reminiscence** — family photos and memories
4. **Voice pattern monitoring** — detecting unusual interaction patterns via personal baseline comparison
5. **Caregiver insights** — a dashboard for monitoring and review

### Important Disclaimer

This is a **prototype application**, not a medical device or clinically validated diagnostic system. The app NEVER claims to:

- Detect dementia
- Diagnose any medical condition
- Confirm or rule out any diagnosis

Instead, it provides:
- "Unusual interaction pattern" indicators
- "Caregiver attention recommended" signals
- "Pattern differs from personal baseline" observations

---

## Architecture

```
PATIENT APP                    CAREGIVER DASHBOARD
├── Cognitive Games            ├── Overview
├── Reminiscence               ├── Patient Profile
├── Voice Interaction          ├── Cognitive Fingerprint
└── Reminders                  ├── Voice Insights
        ↓                     ├── Alerts
Local / Offline Engine         ├── Memories
├── Cognitive Scoring          ├── Privacy
├── Personal Baseline          └── Sync
├── Voice Pattern Analysis
└── Stored History             ASHA WORKER VIEW
        ↓                     └── Summary + Sync
AI / Processing Services
├── Reminiscence Generation
├── Speech-to-Text (Bhashini)
└── Voice Feature Analysis
```

---

## Voice Distress Indicator — Methodology

### How It Works

1. **Patient initiates voice interaction** (never continuous listening)
2. **Acoustic features extracted**: pitch, speaking rate, pause patterns, repetition, volume
3. **Compare with personal baseline** (built from 10 previous sessions)
4. **Calculate deviation score** using z-scores and weighted combination
5. **Surface caregiver alert** if score exceeds threshold

### Feature Weights (Prototype Heuristic — NOT Clinically Validated)

| Feature | Weight |
|---------|--------|
| Pitch deviation | 20% |
| Pace deviation | 20% |
| Pause deviation | 25% |
| Repetition deviation | 25% |
| Volume deviation | 10% |

### Anomaly Bands

| Score | Status | Description |
|-------|--------|-------------|
| 0-30 | NORMAL | Within the person's usual range |
| 31-60 | MONITOR | Some variation from usual pattern |
| 61-100 | UNUSUAL | Differs noticeably from personal baseline |

### Key Principle: Personal Baselines

The system compares patients **against themselves**, not against population averages. This is critical because normal speech varies significantly between individuals.

---

## Personal Baseline

Built from 10 historical sessions. Contains:

- Pitch mean and standard deviation
- Speaking rate mean and standard deviation
- Pause duration mean and standard deviation
- Repetition mean and standard deviation
- Volume mean and standard deviation

---

## Cognitive Fingerprint

Five cognitive domains tracked:

| Domain | Description |
|--------|-------------|
| Memory | Object recall, recognition |
| Language | Word identification, matching |
| Orientation | Time, place awareness |
| Attention | Pattern completion, focus |
| Judgement | Safety scenarios, decisions |

Scores compared against personal baseline with trend analysis.

### Probe Games vs Adaptive Games

- **Probe games** (Orientation): Structurally consistent for longitudinal comparison
- **Adaptive games** (Memory, Language, Attention, Judgement): May adjust difficulty for engagement

---

## Bhashini Integration

Bhashini serves as the **language-access layer** (NOT the distress detector):

| Bhashini Handles | Voice Analysis Handles |
|------------------|----------------------|
| Speech → Text | Pitch analysis |
| Text → Speech | Pace measurement |
| Regional language UI | Pause detection |
| Multilingual interaction | Repetition counting |
| | Volume/intensity analysis |

If Bhashini API is unavailable, a mock language service provides simulated STT/TTS.

---

## Offline Architecture

- All core data stored locally (IndexedDB/localStorage)
- Voice analysis works offline
- Games accessible offline
- Sync happens when connection is available
- Pending sync count displayed

---

## Reminiscence Flow

1. Family uploads photos/stories
2. Content marked as: Approved, Pending, or Excluded
3. Only **APPROVED** content shown to patient
4. AI generates simple questions from content
5. Family review required before display

---

## ASHA Worker Mock Flow

Simplified community health worker view:

- Patient summary with domain trends
- Voice interaction alert count
- Sync simulation with animation
- Recommendation display

---

## Privacy & Consent

- Microphone used **only** during voice interactions
- Voice-derived features for baseline comparison
- Raw recordings stored locally
- No hidden surveillance
- Delete data option available
- Clear privacy messaging throughout

---

## How to Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

---

## Demo Scenarios

### Scenario 1: Normal Voice Interaction
Patient speaks normally → Score ~20-30 → Status: NORMAL → No alert

### Scenario 2: Unusual Voice Interaction
Patient speaks with confusion → Score ~68 → Status: UNUSUAL → Caregiver alert

### Scenario 3: Cognitive Domain Change
Orientation score drops from 75% to 55% → "Noticeable change from personal baseline"

### Scenario 4: Personalised Reminiscence
Family photos with AI-generated questions → "Do you remember this festival?"

### Scenario 5: Offline → Sync
Network off → Activity saved locally → Network on → "4 interactions synced"

---

## Which Components Are Real vs Simulated

| Component | Status |
|-----------|--------|
| Screen navigation | ✅ Real |
| Patient/Caregiver modes | ✅ Real |
| Voice recording | ✅ Real (Web Audio API) |
| Feature extraction (basic) | ✅ Real + Simulated |
| Baseline storage | ✅ Real |
| Anomaly score calculation | ✅ Real (z-score) |
| Alert generation | ✅ Real |
| Dashboard updates | ✅ Real |
| Cognitive games | ✅ Real |
| Bhashini STT/TTS | ⚡ Simulated |
| Advanced ML models | ⚡ Simulated |
| Healthcare integration | ⚡ Simulated |
| ASHA backend sync | ⚡ Simulated |
| Clinical validation | ❌ Not applicable |

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build**: Vite 8
- **Styling**: Tailwind CSS 4
- **State**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router v7
- **Audio**: Web Audio API
- **Storage**: localStorage (demo)

---

## File Structure

```
src/
├── components/
│   ├── games/           # Shared game components
│   └── shared/          # Layout, nav, toast, etc.
├── pages/
│   ├── patient/         # Patient-facing screens
│   │   └── games/       # 5 cognitive games
│   ├── caregiver/       # Caregiver dashboard + ASHA
│   └── demo/            # Demo mode
├── services/
│   ├── voiceAnalysis.ts # Voice feature extraction + anomaly scoring
│   ├── storage.ts       # Local data persistence
│   └── language.ts      # Bhashini integration layer
├── store/
│   └── useAppStore.ts   # Zustand state management
├── types/
│   └── index.ts         # All data models
└── utils/
    ├── demoData.ts      # Preloaded demo data
    └── translations.ts  # EN/AS/HI translations
```

---

## Limitations

1. Voice analysis uses basic acoustic features, not deep learning
2. Demo mode uses pre-computed values for reliability
3. Bhashini integration is simulated (needs API credentials)
4. No real backend or cloud infrastructure
5. No clinical validation — this is a prototype
6. Cognitive games are simplified versions
7. No real-time emergency alerting (by design)

---

*Prototype indicator only. Not a medical diagnosis.*
