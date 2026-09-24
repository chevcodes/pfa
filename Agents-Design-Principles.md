Guiding Principles for App-Wide Consistency and Calm 

This is a standing design dir˜lection, not a bug list. It applies everywhere in the app, not just to screens already discussed in this thread. Make the calls yourself, act on your own judgement across the whole codebase, and only come back if something is genuinely ambiguous or needs a decision only I can make. 

 

Principle 1: One number, one source, always 

Any figure that could plausibly appear on more than one screen, income, take-home, account balances, card balance, category totals, commitment totals, goal progress, savings progress, projected cash, must be calculated once, in one place, and read from that same place everywhere it's shown. Two screens must never be allowed to quietly drift apart because each one grew its own version of the same calculation. 

Where two screens genuinely need to answer different questions that happen to look like the same number, a balance as of a selected month versus a balance as of right now, for instance, don't force them to match. Instead, label each one honestly with what it actually represents, so the difference reads as a deliberate distinction rather than an error. The test is simple: if a person could reasonably ask "why do these two screens disagree", either they shouldn't disagree, or the reason they don't need to should be stated plainly next to both figures. 

This principle applies retroactively too. Go looking for other places in the app where this same pattern might already exist quietly, not just the specific cases already caught in this thread. 

Principle 2: One concept, one master list, everywhere it's used 

Anything that can be attached to a transaction, an account, or a goal, a spending category, a custom label, an account designation, a goal type, must live in exactly one authoritative list. Every screen that displays, searches, filters, or offers a choice involving that concept must read from that same list, never a second copy, a hardcoded subset, or an assumption about what exists. 

If something can be assigned to an item anywhere in the app, it must be visible, searchable, and selectable everywhere that concept is meant to appear. Nothing should be creatable in one corner of the app and invisible everywhere else. Check this pattern deliberately across categories, tags, account roles, and goal configuration, not only the one instance already found. 

Principle 3: One concept, one wording, everywhere it appears 

Any single idea, a goal's purpose, a status, a warning tone, a plain-language explanation, should be generated from one function and reused, never typed out separately in multiple templates that can drift apart from each other. If a description is fixed to use correct wording, every other surface describing that same thing, buttons, tags, secondary text, history entries, must inherit the same fix automatically, not require a second, separate correction later. Treat any recurrence of mismatched wording for the same concept as a sign that two code paths exist where only one should, and consolidate them rather than patching the symptom again. 

Principle 4: Quiet by default, depth available on request 

Every screen should open by saying one true, calm thing, a single number and a short sentence, and nothing more. Everything beyond that, detailed breakdowns, editing controls, charts, secondary explanations, should start collapsed and only expand when a person actually chooses to look further. This applies to the whole app, but especially to the busiest screens today, Plan and Activity, which currently present a stacked wall of cards all visible at once. 

The one thing that must never be hidden behind a tap is anything requiring a decision right now, an overdue payment, a statement gap, a goal that's badly off track. Those stay visible without any interaction, the same way the existing "Needs attention" pattern already works. Quieting the app means holding back detail that can wait, never hiding a fact that can't. 

Apply this test to every card, section, and control currently on screen: would a person reasonably want this the moment they land here, or only if they chose to look deeper? If the answer is the second, it should start closed. 

Principle 5: One way to expand, used consistently everywhere 

Wherever a "tap to reveal more" moment is needed, reuse whichever expand-and-collapse mechanism is already working well elsewhere in the app, rather than inventing a new interaction pattern per screen. If an existing pattern has genuine limitations, fix that one pattern once and let every screen benefit, rather than letting each part of the app grow its own slightly different way of expanding and collapsing. Consistency in how the app physically behaves is itself part of what makes it feel calm. See principle 8 for more guidance. 

Principle 6: A glance answers the question; a tap begins a journey 

The first thing a person sees on any screen should be understandable in the time it takes to glance at a phone, no scrolling required, no interpretation needed, no second-guessing what a figure means. The moment someone taps into something, they've chosen to do real work, and from that point the screen is free to be as detailed, as data-dense, and as thorough as the underlying feature genuinely needs to be. Depth is not the enemy, unwanted depth arriving unprompted is. 

Every existing element of the app should be judged against this distinction as it's improved: is this something a person needs the instant they arrive, or something they'd only want after deciding to look closer. Build and rebuild accordingly. 

Principle 7: Aesthetics and low-effort interaction are equal priorities to correctness 

A fix that is technically correct but visually inconsistent, cramped, or effortful to use has not actually solved the underlying problem this app is trying to solve. Every change made under these principles should be judged not only on whether the data is now right, but on whether using the app feels calmer, clearer, and less effortful afterward than it did before. Where a choice exists between a quick patch and a more thorough fix that genuinely improves the feel of the app, prefer the latter, using your own judgement about what's proportionate. 

 

Principle 8: The app connects the dots; the person shouldn't have to 
 

The app should be an active system, not a container of features. Wherever it states a fact - a count, a figure, a badge, a plain-language insight, a warning - that fact should be the way into the evidence behind it, landing the person on exactly the rows or the screen that fact describes, with the reason stated on arrival and the way back obvious. Never a collapsed card, never a different number than the one that sent them, never a screen they have to re-orient within. 

The same applies in reverse: the action belongs where the need for it becomes visible. If a person can see a problem in one part of the app, they must be able to act on it there - correcting a row where they see it wrong, creating a label at the moment they want to attach one, updating a stale balance on the card that shows it's stale - not by learning the app's structure and navigating to a drawer elsewhere. 

Two constraints on how this is built. Always reach first for the mechanism that already exists - the shared disclosure, the shared confirmation store, the existing filter registry, the one charting tool. And where that existing feature, function or code genuinely cannot carry the job, rebuild it so it can, rather than wiring a second thing beside it, however much more work that is. A parallel mechanism is a worse outcome than a larger refactor; piecemeal additions are what create the drift Principles 1 through 3 exist to prevent. 

 

Principle 9: A person's answer outranks the app's guess, permanently, through one shared mechanism 

  

The app constantly infers things that drive real figures 

- which transactions are internal transfers between your own accounts, which deposits are genuinely income rather than a refund or money passing through, which accounts are yours and which count as savings, which payments are recurring commitments, which merchant a truncated description refers to, whether an unmatched reversal is money returned or something else. Every one is the same shape: the app guesses, the guess drives a number, and being wrong is invisible. 

  

There must be exactly one shared mechanism for capturing an explicit human answer about any inference - one store, one writer, read wherever that inference is consumed, with any inference able to register as a consumer. It must record enough to distinguish a person's answer from the app's guess, so a later change to detection logic can never silently rewrite what someone said. Never let a second confirmation mechanism grow beside it; if one already exists, migrate it on and remove it rather than leaving both. 

  

Precedence: a confirmation is a personal rule, sitting in the order the app already declares (merchant intelligence → personal rules → config), and it outranks inference the same way a manual category override outranks the categoriser. A person's explicit answer wins, permanently. 

The journey is mostly silence. Most of the time nothing is asked - the inference is right and the person never learns a decision was made for them. 

  

Occasionally one question appears, only where being wrong would materially change a figure they're about to rely on, and it passes through the existing attention-list gate that already caps, ranks and stays quiet in a quiet month. Never a queue, never an onboarding wizard, never a settings page of toggles. And always a way in from the row itself: if someone spots a wrong inference - a transfer counted as spending, an income row that isn't income - they correct it where they see it, not by hunting through a drawer. 

Six constraints. Silence is the default, surfacing only where the answer materially changes a figure. A dismissed question stays dismissed - never ask about that subject again. Nothing blocks on an answer: inference keeps working if every question is ignored, because a figure that only becomes correct once you've answered questions is worse than one that works and gets better. A confirmed answer survives contradicting data - a payment confirmed fixed that then skips a month stays fixed, because intent doesn't change when the data wobbles. And scope is the inference's own natural level - merchant-level where detection works at merchant level, transaction-level for income, account-level for designation; the mechanism carries the scope, it doesn't impose one. Please ensure that no features are removed simply for the sake of simplification, as all existing functionality remains vital - the goal is to refine how features are surfaced to keep the user experience quiet, intuitive, and low in cognitive load, leveraging strong component modularity to keep every capability fully accessible without cluttering the main interface.

What must be true: reversible through the existing toast-undo idiom; confirmed versus inferred distinguishable internally; survives re-import, export and backup as category overrides do; a build-failing guard that fails if any inference grows its own private confirmation store again; and tone objective throughout - "These payments repeat. Treat them as fixed expenses?" - never congratulating, never implying the person was wrong not to have answered. 

Decide scope deliberately, not silently. Whether a confirmation applies retroactively or forward only is a real choice - retroactive makes history correct immediately but changes numbers already looked at; forward-only is stabler but leaves history wrong. The category override already offers exactly this choice ("only this transaction" vs "every charge, now and in future"); reuse that same control rather than deciding it silently, and let it vary by inference where that's genuinely right.

 

 
