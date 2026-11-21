# TeenMoney mockups

Open `index.html` straight from disk. Each page loads only `../public/css/tokens.css`, `base.css` and `screens.css`. `payday.html` and `choice-result.html` also load `demo.js`, which only demonstrates the tear and the count. The real screens do not copy it.

This is the markup contract for the `screens` task. Reproduce the elements and class names below. The example text is placeholder. Real copy comes from `content/` and `quiz/`.

## Shared pieces (base.css)

| Piece | Markup | States |
|---|---|---|
| Page | `<main class="page {screen}">`. Add `page-wide` for payday, lock-spot and lock-pick. | |
| Eyebrow | `<p class="eyebrow">Week 2 of 4, day 9</p>` | |
| Money | Any amount gets `money`. Every change gets `money-in` (+) or `money-out` (-): choice prices, deductions on the stub, statement lines, receipt changes, pick amounts. A zero change (`$0.00`) and a balance get neither. A balance below zero gets `money-negative`. | Text always carries the sign. Colour only repeats it. An unavailable choice greys its price over `money-out`. |
| Button | `<button class="button">`. Add `button-secondary` for the second action and `button-block` for full width on phones (auto width from 48rem). | hover, `:active`, `:disabled` / `aria-disabled="true"` (dashed), `:focus-visible` |
| Field | `.field` > `label.field-label` + `input.field-input` + `p.field-hint` / `p.field-error` | `aria-invalid="true"` gives a heavy red border. Always pair it with a `field-error` message. |
| Meters | See below | |
| Documents | `doc` plus one of `doc-check`, `doc-stub` (punched holes along the top), `doc-statement`, `doc-receipt` (zig-zag ends). Inside: `doc-title`, `doc-meta`, `table.doc-table` with `td.doc-amount`. | |
| Screen-reader text | `visually-hidden` | |

Meters:

```html
<dl class="meters">
  <div class="meter meter-cash [is-up|is-down]">
    <dt class="meter-label">Cash</dt>
    <dd class="meter-value [is-negative]">$412.50</dd>
    <dd class="meter-change money-out">-$120.00</dd>      <!-- only right after a change -->
  </div>
  <div class="meter meter-savings">…</div>
  <div class="meter meter-mood" data-mood="low|meh|okay|good|great" style="--mood: 5">
    <dt class="meter-label">Mood</dt>
    <dd class="meter-value"><span class="meter-mood-bar" aria-hidden="true"></span>okay</dd>
  </div>
</dl>
```

- Mood words: 0-2 `low`, 3-4 `meh`, 5-6 `okay`, 7-8 `good`, 9-10 `great`. The word is always shown. The bar fills to `--mood` × 10%.
- Mood bar colour: red for low, yellow for meh and okay, green for good and great.
- **Count and flash.** When a value changes, count the text from the old to the new value over `--duration-count`. Read that duration from the computed style of `:root`, the way `demo.js` does: it is `0ms` under `prefers-reduced-motion`, so set the final value at once. Add `is-up` or `is-down` to the `.meter` to flash it, and remove the class and re-add it to replay. Under reduced motion the flash duration is 0, so nothing animates.
- Tabular figures are built into `.money` and `.meter-value`, so a counting number never shifts the layout.

## Screens

### Quiz (`quiz.html`)
`main.page.quiz` > `header.quiz-header` (eyebrow + `.quiz-progress` with `p.quiz-progress-text` "2 of 6" and `ol.quiz-progress-steps` of six `li`) + `form.quiz-form` > `fieldset.quiz-question` > `legend.quiz-question-text` + `.quiz-options` > `label.quiz-option` > `input.quiz-option-input[type=radio]` + `span.quiz-option-text`, then `button.button.button-block` "Next question".
- Steps: `li.is-done`, `li.is-current`, `li` for the rest.
- Option: hover wash only on devices that hover (`@media (hover: hover)`), so a tapped option on a phone never looks picked. When its radio is checked the border is heavier and the text bold. The focus ring goes on the label (`:has(:focus-visible)`).
- The button stays disabled until an answer is picked.

### Payday (`payday.html`)
`main.page.page-wide.payday` > `header.payday-header` (eyebrow + `h1` + `p.lede`) + `.payday-paper` > `.payday-slot` (holds `article.payday-check.doc.doc-check` and `div.payday-cashed`) + `section.payday-stub.doc.doc-stub`, then `.payday-actions` with "Cash this check" and a hidden "Start week 1".
- `div.payday-cashed[role=status]` holds `p.payday-cashed-title` "Cashed.", then the cash meter in the same `.meters` structure as every other screen, with the modifier `payday-cashed-meters` for one column and no frame (`dl.meters.payday-cashed-meters` > `div.meter.meter-cash` > `dt.meter-label` "Your cash" + `dd.meter-value` + `dd.meter-change.money-in`), then a `p` about keeping the stub.
- Check parts, in order: `payday-check-payer`, `payday-check-meta`, `payday-check-payee` (with `label.payday-check-label` "Pay to the order of", `input.payday-check-name#payday-name`, `p.payday-check-name-hint` and a hidden `p.field-error`), `payday-check-amount` (with `span.payday-check-amount-sign`), `payday-check-words`, `payday-check-memo`, `payday-check-sign` (inline SVG signature), `payday-check-micr`.
- States:
  - Empty name: on "Cash this check", show the `field-error` and set `aria-invalid="true"` on the input.
  - Tear: add `is-torn` to `.payday-check`. It animates for `--duration-tear` (0 under reduced motion).
  - Cashed: after the tear, add `is-cashed` to `main.payday`. This hides the check and shows `.payday-cashed`. Then count its `.meter-value` from $0.00 with `is-up`, swap the buttons and focus "Start week 1".
- The name never leaves the browser.

### Choice (`choice.html`)
`main.page.choice` > `header.choice-header` (eyebrow + meters) + `section.choice-event` (`p.choice-tag` "Surprise", only for surprises; `h1.choice-title`; `p.choice-body`) + `ul.choice-options` > `li` > `button.choice-option` > `span.choice-option-label` + `span.choice-option-price.money[.money-out|.money-in]`.
- A choice paid from savings adds `span.choice-option-from` "from savings".
- **Unavailable choice** (its `requires` is not met): shown, never hidden. Do not use the `disabled` attribute, which drops the button out of the Tab order so a keyboard user never hears why. Instead:
  ```html
  <button class="choice-option" type="button" aria-disabled="true" aria-describedby="choice-reason-2">
    <span class="choice-option-label">Use your savings</span>
    <span class="choice-option-price money money-out">-$120.00</span>
    <span class="choice-option-from">from savings</span>
    <span class="choice-option-reason" id="choice-reason-2">You have $60.00 saved. This needs $120.00.</span>
  </button>
  ```
  It stays focusable and is styled as unavailable (dashed border, greyed text). Its click handler must do nothing. The reason id must be unique on the page, for example the choice index.
- A zero-cost choice shows `$0.00` with no sign.
- States: hover (only on devices that hover), active (pressed down 2px), focus ring, `aria-disabled="true"` (dashed).

### Result of a choice (`choice-result.html`)
`main.page.choice-result` > `header.choice-header` (eyebrow + meters, each changed meter with its `meter-change` and `is-up` / `is-down`; an unchanged one says "no change") + `section.choice-result-body[aria-live=polite]` > `p.choice-result-picked` + `p.choice-result-line`, then "Keep going".

### Locks (shared)
`main.page.lock.lock-{kind}` > `header.lock-header` (eyebrow "Week N door" + `h1.lock-prompt`) + `form.lock-form` > `.lock-document.doc…` + feedback + hints + `.lock-actions` > "Try the door".
- `.lock-document-head` holds `doc-title` and `doc-meta`.
- Wrong try: `.lock-feedback[role=status]` > `p.lock-feedback-result` ("Not yet…") + a line with the count of wrong tries. Hidden before the first wrong try.
- Hints: `ol.lock-hints` > `li.lock-hint` (`span.lock-hint-label` "Hint 1" + text), plus `li.lock-hint-next` saying when the next one unlocks. Hint 1 shows after 2 wrong tries and hint 2 after 3 (section 2). After 4 wrong tries add a `button.button-secondary` "Show me how" in `.lock-actions`, and show the `explain` text in a `li.lock-hint`.
- Opened: swap the form for a line in `payday-green-ink` and a "Next week" button. Not mocked, because it uses only shared pieces.

### Lock: read the pay stub (`lock-code.html`)
The document is `article.lock-document.doc.doc-stub` with a `doc-table`. Its `tfoot` row `tr.lock-code-row` holds `label[for=lock-code-input]` "Total taken out" and `span.lock-code-entry` "$" + `input.lock-code-input[inputmode=decimal]`. A wrong try sets `aria-invalid="true"` on the input and `aria-describedby="lock-feedback"`.

### Lock: find the fee (`lock-spot.html`)
The document is `article.lock-document.doc.doc-statement`. It contains `.lock-document-head`, `.lock-spot-summary` (starting balance), `div.lock-spot-table` > (`.lock-spot-columns[aria-hidden]` (the column titles) + `ol.lock-spot-lines` > `li` > `button.lock-spot-line[aria-pressed]` > `span.lock-spot-date` + description `span` (with `span.lock-spot-mark` "Marked") + `span.money.money-out` + `span.lock-spot-balance.money`), and `.lock-spot-summary` (ending balance). Then `p.lock-spot-choice[role=status]` repeats the marked line.
- Only one line can be pressed at a time. Pressed: highlighter background, bold, "Marked" tag. Hover wash only on devices that hover.
- The balance column shows from 40rem up.

### Lock: close the gap (`lock-pick.html`)
`.lock-pick-layout` holds two parts:
- `fieldset.lock-document.doc[aria-describedby=lock-pick-help]` > `legend.visually-hidden` + `.lock-document-head` (`h2.doc-title` + `p.doc-meta#lock-pick-help`) + `.lock-pick-options` > `label.lock-pick-option` > `input.lock-pick-check[type=checkbox]` + `span.lock-pick-label` + `span.lock-pick-amount.money.money-in`, with an optional `span.lock-pick-note` (side effects such as "Mood -2").
- `section.lock-pick-tally.doc.doc-receipt[aria-live=polite]`. Its `doc-table` shows "Short by" (-), "Your N picks" (+) and "Day 30" in the `tfoot` (`money-negative` while below zero, `money-in` with + at zero or above), then `p.lock-pick-status`.

The two parts sit side by side from 48rem. A checked option gets a ballpoint border, a wash and bold text. The hover wash shows only on devices that hover.

### Results (`results.html`)
`main.page.results` > `header.results-header` + `.results-top` > `section.results-ending[data-ending=broke|scraped|made-it|cushion]` (`h2.results-ending-title` + `p.results-ending-text`) + `section.results-hit` (`h2.results-hit-label`, `p.results-hit-what`, `p.results-hit-amount.money.money-out`). Then `article.results-receipt.doc.doc-receipt` > `.results-receipt-head` + `table.doc-table` + `p.results-receipt-foot`, and finally "Finish with 6 questions".
- Receipt rows: `tr.results-receipt-week > th[colspan=3]` per week. Item rows are `th` + `td.doc-amount` (the change, signed) + `td.results-receipt-balance` (the running cash, `money-negative` when below zero). The borrowing fee row is `tr.results-receipt-fee`.
- `tfoot`: cash, savings, left over, mood as a word.
- Ending border colour: red for broke, ballpoint for scraped, green for made-it and cushion. The title always says it in words.

### Reading (`reading.html`)
`main.page.reading` > eyebrow + `article.reading-article.doc` > `h1` + `p`… (`reading.title`, `reading.paragraphs`), then "I've read it".

### Thanks (`thanks.html`)
`main.page.thanks` > `header` > `h1`, then `section.thanks-save[data-state]` > `p.thanks-save-title` + `p` (what to do) + `button.button.button-block` "Try again" (error state only), then + `dl.thanks-scores` > `div.thanks-score` > `dt.thanks-score-label` + `dd.thanks-score-value` (+ `dd.thanks-score-change.money-in`, signed) + `section` > `h2` + `ol.thanks-answers` > `li.thanks-answer` (`p.thanks-answer-question`, right answer, `p.thanks-answer-mark.is-right|.is-wrong` in words) + `.thanks-actions` > `button.button.button-secondary` "Play again".
- `thanks-save` states:
  - `saving`: `role=status`, "Saving your answers…", no button.
  - `saved`: green border, "Saved. Thanks for helping."
  - `error`: `role=alert`, red border, title in red, "Try again" button. This is the state shown in the mockup.
- The reading group sees the same page without "Play again".

## Motion

| Motion | Where | Token | Reduced motion |
|---|---|---|---|
| Tear | `.payday-check.is-torn` | `--duration-tear` 950ms, `--ease-in` | 0ms: the check is gone at once |
| Count | `.meter-value` text, done in JS | `--duration-count` 700ms, ease-out cubic | 0ms: the final value is set at once |
| Flash | `.meter.is-up` / `.is-down` | `--duration-flash` 900ms | 0ms: no flash |
| Button press | `.button:active`, `.choice-option:active` | `--duration-quick` 120ms | 0ms |

## Contrast

Every text colour on every background it appears on. Ratios use the WCAG 2 formula and are computed from the hex values in `tokens.css`. The floor is 4.5:1 for all text, including large text.

| Text | Background | Ratio | Where |
|---|---|---|---|
| ballpoint `#14233B` | safety-paper `#DDEFE3` | 13.15:1 | body text, headings, amounts, buttons (secondary), selected statement line |
| ballpoint `#14233B` | safety-paper-deep `#C4E3D3` | 11.46:1 | body text, headings, amounts, buttons (secondary), selected statement line |
| ballpoint `#14233B` | paper-white `#FBFDFB` | 15.41:1 | body text, headings, amounts, buttons (secondary), selected statement line |
| ballpoint `#14233B` | highlighter `#FFE14D` | 12.10:1 | body text, headings, amounts, buttons (secondary), selected statement line |
| ballpoint `#14233B` | highlighter-wash `#FFF3B0` | 14.02:1 | body text, headings, amounts, buttons (secondary), selected statement line |
| ballpoint `#14233B` | payday-green-wash `#CCE6DC` | 11.94:1 | body text, headings, amounts, buttons (secondary), selected statement line |
| ballpoint `#14233B` | overdraft-red-wash `#F4D2D5` | 11.27:1 | body text, headings, amounts, buttons (secondary), selected statement line |
| ballpoint-soft `#4E5A6B` | safety-paper `#DDEFE3` | 5.85:1 | eyebrows, labels, document fine print, disabled choices, pick notes |
| ballpoint-soft `#4E5A6B` | safety-paper-deep `#C4E3D3` | 5.09:1 | eyebrows, labels, document fine print, disabled choices, pick notes |
| ballpoint-soft `#4E5A6B` | paper-white `#FBFDFB` | 6.85:1 | eyebrows, labels, document fine print, disabled choices, pick notes |
| ballpoint-soft `#4E5A6B` | highlighter-wash `#FFF3B0` | 6.24:1 | eyebrows, labels, document fine print, disabled choices, pick notes |
| payday-green-ink `#106B54` | safety-paper `#DDEFE3` | 5.39:1 | money in (+), cashed title, good save state |
| payday-green-ink `#106B54` | safety-paper-deep `#C4E3D3` | 4.70:1 | money in (+), cashed title, good save state |
| payday-green-ink `#106B54` | paper-white `#FBFDFB` | 6.32:1 | money in (+), cashed title, good save state |
| payday-green-ink `#106B54` | highlighter-wash `#FFF3B0` | 5.75:1 | money in (+), cashed title, good save state |
| payday-green-ink `#106B54` | payday-green-wash `#CCE6DC` | 4.89:1 | money in (+), cashed title, good save state |
| overdraft-red-ink `#B0253D` | safety-paper `#DDEFE3` | 5.52:1 | money out (-), balance below zero, wrong-answer and save-error text |
| overdraft-red-ink `#B0253D` | safety-paper-deep `#C4E3D3` | 4.81:1 | money out (-), balance below zero, wrong-answer and save-error text |
| overdraft-red-ink `#B0253D` | paper-white `#FBFDFB` | 6.46:1 | money out (-), balance below zero, wrong-answer and save-error text |
| overdraft-red-ink `#B0253D` | highlighter `#FFE14D` | 5.08:1 | money out (-), balance below zero, wrong-answer and save-error text |
| overdraft-red-ink `#B0253D` | highlighter-wash `#FFF3B0` | 5.88:1 | money out (-), balance below zero, wrong-answer and save-error text |
| overdraft-red-ink `#B0253D` | overdraft-red-wash `#F4D2D5` | 4.73:1 | money out (-), balance below zero, wrong-answer and save-error text |
| paper-white `#FBFDFB` | payday-green-ink `#106B54` | 6.32:1 | primary button text, normal and hover/pressed |
| paper-white `#FBFDFB` | payday-green-press `#0E5C48` | 7.77:1 | primary button text, normal and hover/pressed |

Not text, and so not in the table: the hatching, the check pattern (`safety-paper-line`), hairlines (`rule`), the mood bar and the highlighter edge on hints. The focus ring is a 3px Ballpoint outline over a 3px Highlighter halo. Its contrast against the page is 13:1.

## Known limits

- Firefox blocks fonts loaded from a parent folder when a page is opened from disk, so these mockups fall back to system fonts there. Chrome, Edge and ChromeOS load them. The real site is served over http, so it is not affected.
- Screenshots in `screenshots/` come from headless Chrome at 360px (mobile) and 1366px, full page height.
