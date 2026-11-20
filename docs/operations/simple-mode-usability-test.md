# Simple Mode: a 30-minute test with real people

Watching two or three non-technical people use Keelwork shows more than any automated check. Use this script, and look at **Back office → Simple Mode feedback** before and after each round.

## Who to invite

- 2–3 people who have never built an app or a website: a shop owner, a teacher, a relative.
- Not developers, and not anyone who has seen Keelwork before.

## Before they arrive

- A fresh account for each person, made on the day. Don't reuse your own.
- Simple Mode **off**. Part of the test is whether they notice the button.
- A phone and a laptop. Do half the tasks on each.
- Have a key ready for task 4, for example a Resend test key. Never use a live payment key.

## How to run it

- Say: *"We're testing Keelwork, not you. If something is confusing, that's our fault. Please think out loud."*
- Don't help. If they're stuck for more than two minutes, note it, then say: *"What would you try next?"* Only show them if they're still stuck after that.
- Take notes on where they hesitate, what they say, and which words they misread.

## Tasks

1. **Find the help.** "This website feels technical. Is there a way to make it easier to understand?"
   *Watch:* how long it takes to find the Simple Mode button, and on which screen.
2. **Make something.** "Start a project for a bakery that takes cake orders."
   *Watch:* whether the guide's steps tick themselves, and whether they use "Show me".
3. **Read the plan.** "Is this plan what you asked for? What would you change?"
   *Watch:* whether "Yes, build it" is clear, and whether they know nothing is built until then.
4. **Connect an app.** "Your bakery wants to send order emails. Connect the email service."
   *Watch:* the Connect my apps → Private keys journey. Can they tell which key goes where?
5. **Put it online.** "Make a private preview, then tell me how you'd put it online for everyone."
   *Watch:* whether they understand preview versus online for everyone, and going back to an earlier version.
6. **Money.** "How much have you spent, and how would you stop spending more than $20 a month?"
7. **Switch back.** "Turn the simple wording off and on again."
   *Watch:* whether they worry about losing work. Check that nothing was lost.

## After the tasks (5 minutes)

- "Which word or screen confused you most?"
- "Did anything feel like it was talking down to you?"
- "On a scale of 1–5, how confident would you feel doing this alone?"

## What to do with the notes

- **A word misread by two or more people:** change it in `src/lib/simple/content.ts`. Every simple label, guide and error message lives there.
- **A step that didn't tick itself:** add or fix its `doneWhen` selector in the same file, and a `data-guide` attribute on the page if one is needed.
- **A page with mostly "Not really" feedback:** rewrite that page's text first.
- Run `pnpm test`. The Simple Mode tests check coverage, sentence length and jargon.
