# VoltWise — Design Brief

## The problem with the current look

Near-black background + one acid-green accent + identical rounded cards
with the same soft shadow + ALL-CAPS tracked eyebrow labels on every
field. This is the generic default for *any* AI-generated dashboard —
fintech, fitness, SaaS admin, it doesn't matter. Nothing about it
currently says "electricity" or "charging" specifically. That's the gap
to close.

## Ground it in the actual subject: electricity has three distinct sources

Right now everything renewable is the same green. But your own PS data
has **solar** and **wind** as separate signals, plus **grid** as a
fallback — that's a real distinction worth showing, not collapsing into
one color. Judges who've seen 20 identical green-dashboard EV apps today
will notice if yours is the one that visually distinguishes its energy
sources.

## Color — 6 tokens, sourced from what they represent

| Token | Hex | Used for |
|---|---|---|
| `--ink` | `#0D1117` | Base background — a cool near-black, not pure black |
| `--solar` | `#F2A93B` | Solar contribution — warm amber/gold, like sunlight |
| `--wind` | `#4FC1C9` | Wind contribution — cool cyan-teal |
| `--grid-neutral` | `#6B7684` | Non-renewable grid draw — flat slate, deliberately unglamorous |
| `--alert-priority` | `#E85D4C` | Priority/critical EV only — reserve this, don't reuse it elsewhere |
| `--paper` | `#EDEFF2` | Primary text on dark backgrounds |

Drop the single all-purpose green. A renewable score becomes a small
stacked bar of solar-amber + wind-teal instead of one green number —
that alone makes your Green Score visually unlike every other team's.

## Typography

Pick one display face with real character for headlines (numbers,
"14:15–16:30," "88/100") and one plain, highly legible face for body/UI
text — two families, clearly distinct from each other, not the default
system-ui/Inter combination every generated UI reaches for. Look at
grotesk or industrial-technical faces with some personality (something
that could sit on an actual utility meter or dispatch terminal) rather
than a generic geometric sans.

Drop ALL-CAPS tracked labels everywhere ("VEHICLE CLASS," "TELEMETRY
CONTROLS"). Use sentence case. Let position and structure communicate
hierarchy instead of shouting in caps — this is one of the most common
"AI made this" tells, and removing it alone will make a big difference.

## Layout — show the actual flow of electricity, not a pile of cards

Right now the UI is cards scattered on a grid, structurally identical to
any SaaS dashboard. Consider instead a layout that mirrors what's
physically happening: **source → station → vehicle**, left to right.

```
[ Solar/Wind/Grid mix ]  ──thin line──▶  [ Port 1 ]  ──▶  [ Vehicle ]
        (small stacked                   [ Port 2 ]
         bar, live %)
```

A subtle animated line (a flow, not a decoration) connects source to
whichever port is actively drawing power. This does double duty: it's
visually distinctive AND it makes your actual mechanism instantly
legible to a judge in 5 seconds, which a stack of disconnected cards
doesn't.

## Motion — spend it in exactly one place

Don't add hover animations or fade-ins to every card — that's the other
big "AI made this" tell. Save all your motion budget for the one moment
that matters: when "Trigger Renewable Drop" fires, the flow line's color
mix shifts, and the assigned time window visibly slides from its old
value to its new one (not a snap re-render). One deliberate moment beats
ten scattered micro-animations.

## Rework the two "generic" elements specifically

- **SOC sliders** → consider an arc/dial gauge instead of a flat
  horizontal slider — batteries are physically round cells, gauges read
  as "energy" more than a generic form-input slider does.
- **Identical rounded cards for everything** → give ports a distinct
  shape/treatment (something suggesting a physical charging bay) rather
  than the same card component reused for SOC input, recommendation,
  ports, and analytics. Reserve one card style for informational content
  and a visually different treatment for "live/active" elements.

## What to keep

The information itself (deadline, price, green score, reason string,
port status, priority badge) is correct and contract-bound — don't
change *what* is shown, only *how*. This brief is about visual identity
not the data model.