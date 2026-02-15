# ISC2 CC Practice Exam

Browser-based practice exam for the **ISC2 Certified in Cybersecurity (CC)** certification.

167 multiple-choice questions with timed tests, score tracking, and detailed review.

**[Live Demo](https://mintarasss.github.io/isc2-cc-practice-exam/)**

## Features

- **Configurable tests** — choose question count (5–167) and time limit
- **Quick presets** — 10/5min, 50/60min, 100/120min
- **Countdown timer** — with warning state at <5 minutes, auto-submit at 0
- **Question navigator** — jump to any question, see answered/unanswered/flagged at a glance
- **Keyboard shortcuts** — arrow keys to navigate, 1-4 to select answers, F to flag
- **Detailed results** — score with pass/fail (70% threshold), question-by-question review
- **Test history** — all attempts saved in localStorage with expandable details
- **Fully offline** — no backend, no dependencies, just HTML/CSS/JS

## Getting Started

```bash
# Clone the repo
git clone https://github.com/mintarasss/isc2-cc-practice-exam.git
cd isc2-cc-practice-exam

# Start local server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> A local server is needed so `fetch()` can load the question bank. `npm start` runs `npx serve -p 3000`.

## Screenshot

| Home | Quiz | Results |
|------|------|---------|
| Configure question count & time limit | Answer questions with timer & navigator | Score, pass/fail, full review |

## Tech Stack

- Vanilla HTML, CSS, JavaScript
- No frameworks, no build step
- [`serve`](https://www.npmjs.com/package/serve) for local dev server

## Project Structure

```
├── index.html        # Single-page app shell
├── css/style.css     # All styles
├── js/app.js         # All application logic
├── questions.json    # 167 practice questions
├── package.json      # npm start script
└── LICENSE
```

## License

[MIT](LICENSE)
