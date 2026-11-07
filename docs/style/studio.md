# Studio style — the rules every episode follows

Owner: Bruce Wayne · Time zone: Pacific (America/Los_Angeles) · Season 1: 6 episodes × 3 channels = 18 films.

## 1. Channels and where they post

| # | Channel (draft names) | Subject | YouTube | TikTok | Instagram |
|---|---|---|---|---|---|
| 1 | Pan Theory | food and cooking science | TODO handle | TODO handle | shared account |
| 2 | Skin Receipts | skin-care habits vs evidence | TODO handle | TODO handle | shared account |
| 3 | Unreal, Actually | insane-but-true facts: space, time, mysteries | TODO handle | TODO handle | shared account |

That makes 3 YouTube channels, 3 TikTok accounts and **1 shared Instagram** (TODO handle) that posts for all three.
On Instagram every post carries the channel name first in the caption (e.g. "Pan Theory · Ep 1") and a small channel badge on the cover.
The first five-channel lineup (Nov 2026) is retired and kept only in `archive/`.
Each channel keeps its own look, voice and palette (see `channels/`). Nothing from one channel's identity is reused in another.

## 2. Deliverables per episode

- Film: 1080×1920 (9:16), 30 fps, H.264 + AAC, about 75 s (70–80 s), loudness about −14 LUFS.
- Captions: burned in, and also a `.srt` file. At most 2 lines and about 32 characters per line.
- Safe area: no text in the bottom 20 % or the right 12 % (that's where the app buttons sit) or the top 8 %.
- Cover: 1080×1920 PNG, readable as a thumbnail.
- Text per platform: title, description, hashtags, all written for that platform.
- `claims.md`, `scorecard.md`, render report (duration, resolution, loudness, black or frozen frames).

## 3. Quality gate

Score every episode from 1 to 5 on each line:

| | Criterion | What a 5 looks like |
|---|---|---|
| a | **Hook in the first 2 s** | A "wait, what?" lands before 2 s, both in picture and in words. |
| b | **One thread** | A single question runs from the hook to the payoff, with no side trips. |
| c | **Picture moves with the sentence** | What you see changes on the word that needs it. |
| d | **Motivated camera** | Every move has a reason you can name (follow, reveal, compare). |
| e | **Voice carries meaning, screen carries figures** | Numbers and labels go on screen; the voice says what they mean. |
| f | **Rhythm** | Beats match the channel's pacing, with no dead air and no rush. |
| g | **Ending** | Pays off the hook and leaves one line you would repeat to a friend. |
| h | **Production value** | Looks made for this channel: no default 3D render, template or stock look. |

**Pass** means all of these are true:
- no score under 3;
- (a), (g) and (h) are each 4 or more;
- no factual or ethical item is still open.

**Who scores:** a separate reviewer pass, using the strongest model, scores from the rendered film's frames, captions and script. The builder never scores its own work. If it fails: fix, re-render, re-score, and repeat until it passes. Every round is logged in `scorecard.md`.

## 4. Words

- Write like a friend, not a textbook. Plain words first.
- A technical term only when it earns its place, and it is explained in the same breath.
- Comparisons beat counts ("as wide as a hair" beats "70 micrometres").
- Open on a "wait, what?" by 2 s, then pay it off.
- Tie it to your body or your day.
- Short sentences. One idea per sentence.

## 5. Facts and ethics (strict)

- Every claim goes in the episode's `claims.md`, with a source.
- A claim is **OK** only after a person has opened the source and found the line. If it was checked only from a search excerpt, it is **OPEN**.
- Claims table columns: ID · claim as spoken · source (title + link) · where in the source · hedge used · status (OK/OPEN) · checked by · date.
- Hedge only as far as the source goes. Animal or lab data is never "your body". Use "about" and "up to".
- No medical advice on any channel. Skin Receipts captions always carry **"Education, not medical advice."** Pan Theory is food education, never diet advice.
- No product recommendations, no brands paid or unpaid, no diagnosis, no dosing.
- Skin and body visuals show a range of skin tones and bodies.
- An episode with any OPEN claim cannot pass the gate.

## 6. Safety and accounts

- Passwords, codes and API keys never go in chat. Claude names the settings page; Bruce types the secret there.
- Card data is never collected.
- **Nothing is posted anywhere without Bruce's approval.** Publishing is manual: the studio hands off files and text, and Bruce posts.

## 7. Placeholders

Any stand-in (phone number, email, price, handle, link) is written as `TODO: …`. Every summary lists all open TODOs.

## 8. How we work

- One channel at a time, one episode at a time, until it passes the gate.
- Every render is measured (length, size, loudness, frames) before Bruce is asked to watch it.
- Cheaper models build and render; the strongest model is used only for gate scoring.
- Everything lives in git with frequent commits. No force-pushes, and no pull requests unless asked.
- Check-ins every 30 min while working: at most four lines covering done, now, blocked and next.

## Open TODOs

- TODO: YouTube handles ×3, TikTok handles ×3, Instagram handle ×1.
- TODO: final channel names (the three names are drafts).
- TODO: Railway account (setup steps come later, phone-friendly).
- Voice: free Kokoro voices (open licence), one distinct voice per channel.
