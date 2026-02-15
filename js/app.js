(function () {
  'use strict';

  // ─── DOM refs ───
  const $ = (id) => document.getElementById(id);
  const views = {
    home: $('view-home'),
    quiz: $('view-quiz'),
    results: $('view-results'),
    history: $('view-history'),
  };

  // Home
  const questionCountSlider = $('question-count');
  const questionCountDisplay = $('question-count-display');
  const timeLimitInput = $('time-limit');
  const btnStart = $('btn-start');
  const btnViewHistory = $('btn-view-history');

  // Quiz
  const timerEl = $('timer');
  const progressEl = $('progress');
  const btnSubmitTest = $('btn-submit-test');
  const questionNumberEl = $('question-number');
  const questionTextEl = $('question-text');
  const optionsListEl = $('options-list');
  const btnPrev = $('btn-prev');
  const btnNext = $('btn-next');
  const btnFlag = $('btn-flag');
  const navGridEl = $('nav-grid');

  // Results
  const resultScore = $('result-score');
  const resultPercentage = $('result-percentage');
  const resultBadge = $('result-badge');
  const statCorrect = $('stat-correct');
  const statIncorrect = $('stat-incorrect');
  const statUnanswered = $('stat-unanswered');
  const statTime = $('stat-time');
  const btnNewTest = $('btn-new-test');
  const btnResultsHistory = $('btn-results-history');
  const reviewList = $('review-list');

  // History
  const btnHistoryHome = $('btn-history-home');
  const btnClearHistory = $('btn-clear-history');
  const historyListEl = $('history-list');

  // Modal
  const modalOverlay = $('modal-overlay');
  const modalTitle = $('modal-title');
  const modalMessage = $('modal-message');
  const modalCancel = $('modal-cancel');
  const modalConfirm = $('modal-confirm');

  // ─── State ───
  let allQuestions = [];
  let quizQuestions = []; // shuffled subset for current quiz
  let userAnswers = [];   // index or null per question
  let flagged = [];       // boolean per question
  let currentIndex = 0;
  let timerInterval = null;
  let quizStartTime = null;
  let timeLimitMs = 0;
  let quizEndTime = null;

  const STORAGE_KEY = 'isc2cc_history';
  const PASS_THRESHOLD = 70;

  // ─── View switching ───
  function showView(name) {
    Object.values(views).forEach((v) => v.classList.remove('active'));
    views[name].classList.add('active');
  }

  // ─── Load questions ───
  async function loadQuestions() {
    try {
      const res = await fetch('questions.json');
      const data = await res.json();
      allQuestions = data.questions;
      questionCountSlider.max = allQuestions.length;
    } catch (e) {
      alert('Failed to load questions. Make sure you run the app via a local server (npm start).');
    }
  }

  // ─── Fisher-Yates shuffle ───
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ─── Format time ───
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function formatTimeFull(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  }

  // ─── Home ───
  questionCountSlider.addEventListener('input', () => {
    questionCountDisplay.textContent = questionCountSlider.value;
  });

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      questionCountSlider.value = btn.dataset.count;
      questionCountDisplay.textContent = btn.dataset.count;
      timeLimitInput.value = btn.dataset.time;
    });
  });

  btnStart.addEventListener('click', startQuiz);
  btnViewHistory.addEventListener('click', () => {
    renderHistory();
    showView('history');
  });

  // ─── Start Quiz ───
  function startQuiz() {
    if (allQuestions.length === 0) {
      alert('Questions not loaded yet. Please wait.');
      return;
    }

    const count = parseInt(questionCountSlider.value, 10);
    const timeMinutes = parseInt(timeLimitInput.value, 10) || 0;

    quizQuestions = shuffle(allQuestions).slice(0, count);
    userAnswers = new Array(count).fill(null);
    flagged = new Array(count).fill(false);
    currentIndex = 0;

    quizStartTime = Date.now();
    timeLimitMs = timeMinutes * 60 * 1000;
    quizEndTime = timeLimitMs > 0 ? quizStartTime + timeLimitMs : null;

    buildNavigator();
    renderQuestion();
    startTimer();
    showView('quiz');
  }

  // ─── Timer ───
  function startTimer() {
    clearInterval(timerInterval);

    if (!quizEndTime) {
      // Unlimited - count up
      timerEl.textContent = '0:00';
      timerEl.classList.remove('warning');
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
        timerEl.textContent = formatTime(elapsed);
      }, 1000);
      return;
    }

    updateTimerDisplay();
    timerInterval = setInterval(() => {
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    const remaining = Math.max(0, Math.ceil((quizEndTime - Date.now()) / 1000));
    timerEl.textContent = formatTime(remaining);

    if (remaining <= 300 && remaining > 0) {
      timerEl.classList.add('warning');
    } else {
      timerEl.classList.remove('warning');
    }

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerEl.textContent = '0:00';
      submitQuiz();
    }
  }

  // ─── Render question ───
  function renderQuestion() {
    const q = quizQuestions[currentIndex];
    questionNumberEl.textContent = `Question ${currentIndex + 1}`;
    questionTextEl.textContent = q.question;
    progressEl.textContent = `${currentIndex + 1} / ${quizQuestions.length}`;

    // Flag button
    btnFlag.classList.toggle('flagged', flagged[currentIndex]);
    btnFlag.textContent = flagged[currentIndex] ? 'Unflag' : 'Flag';

    // Options
    const letters = ['A', 'B', 'C', 'D'];
    optionsListEl.innerHTML = q.options
      .map((opt, i) => {
        const selected = userAnswers[currentIndex] === i ? ' selected' : '';
        return `
          <div class="option-card${selected}" data-index="${i}">
            <span class="option-letter">${letters[i]}</span>
            <span class="option-text">${opt}</span>
          </div>`;
      })
      .join('');

    // Option click handlers
    optionsListEl.querySelectorAll('.option-card').forEach((card) => {
      card.addEventListener('click', () => {
        userAnswers[currentIndex] = parseInt(card.dataset.index, 10);
        renderQuestion();
        updateNavigator();
      });
    });

    // Nav buttons
    btnPrev.disabled = currentIndex === 0;
    btnNext.disabled = currentIndex === quizQuestions.length - 1;

    updateNavigator();
  }

  // ─── Navigator ───
  function buildNavigator() {
    navGridEl.innerHTML = quizQuestions
      .map((_, i) => `<div class="nav-cell unanswered" data-nav="${i}">${i + 1}</div>`)
      .join('');

    navGridEl.querySelectorAll('.nav-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        currentIndex = parseInt(cell.dataset.nav, 10);
        renderQuestion();
      });
    });
  }

  function updateNavigator() {
    navGridEl.querySelectorAll('.nav-cell').forEach((cell, i) => {
      cell.className = 'nav-cell';
      if (flagged[i]) {
        cell.classList.add('flagged');
      } else if (userAnswers[i] !== null) {
        cell.classList.add('answered');
      } else {
        cell.classList.add('unanswered');
      }
      if (i === currentIndex) cell.classList.add('current');
    });
  }

  // ─── Navigation buttons ───
  btnPrev.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderQuestion();
    }
  });

  btnNext.addEventListener('click', () => {
    if (currentIndex < quizQuestions.length - 1) {
      currentIndex++;
      renderQuestion();
    }
  });

  btnFlag.addEventListener('click', () => {
    flagged[currentIndex] = !flagged[currentIndex];
    renderQuestion();
  });

  // ─── Submit ───
  btnSubmitTest.addEventListener('click', () => {
    const unansweredCount = userAnswers.filter((a) => a === null).length;
    let msg = 'Are you sure you want to submit your test?';
    if (unansweredCount > 0) {
      msg += ` You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}.`;
    }
    showModal('Submit Test?', msg, submitQuiz);
  });

  function submitQuiz() {
    clearInterval(timerInterval);
    const timeTakenSeconds = Math.floor((Date.now() - quizStartTime) / 1000);
    calculateResults(timeTakenSeconds);
  }

  // ─── Results ───
  function calculateResults(timeTakenSeconds) {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    const questionResults = quizQuestions.map((q, i) => {
      const userAnswer = userAnswers[i];
      const isCorrect = userAnswer === q.answer;
      if (userAnswer === null) unanswered++;
      else if (isCorrect) correct++;
      else incorrect++;

      return {
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.answer,
        userAnswer: userAnswer,
        isCorrect: userAnswer !== null && isCorrect,
      };
    });

    const total = quizQuestions.length;
    const percentage = Math.round((correct / total) * 100);
    const passed = percentage >= PASS_THRESHOLD;
    const timeLimitMinutes = Math.round(timeLimitMs / 60000);

    // Display
    resultScore.textContent = `${correct} / ${total}`;
    resultPercentage.textContent = `(${percentage}%)`;
    resultBadge.textContent = passed ? 'PASS' : 'FAIL';
    resultBadge.className = `badge ${passed ? 'pass' : 'fail'}`;

    statCorrect.textContent = correct;
    statIncorrect.textContent = incorrect;
    statUnanswered.textContent = unanswered;
    statTime.textContent = formatTimeFull(timeTakenSeconds);

    // Review
    renderReview(questionResults);

    // Save to history
    const result = {
      id: String(Date.now()),
      date: new Date().toISOString(),
      questionCount: total,
      timeLimitMinutes: timeLimitMinutes,
      timeTakenSeconds: timeTakenSeconds,
      score: correct,
      percentage: percentage,
      passed: passed,
      questions: questionResults,
    };
    saveToHistory(result);

    showView('results');
  }

  function renderReview(questions) {
    const letters = ['A', 'B', 'C', 'D'];
    reviewList.innerHTML = questions
      .map((q, i) => {
        let statusClass, statusText;
        if (q.userAnswer === null) {
          statusClass = 'skipped';
          statusText = 'Unanswered';
        } else if (q.isCorrect) {
          statusClass = 'correct';
          statusText = 'Correct';
        } else {
          statusClass = 'incorrect';
          statusText = 'Incorrect';
        }

        const optionsHtml = q.options
          .map((opt, oi) => {
            let cls = '';
            if (oi === q.correctAnswer) cls = 'correct-answer';
            if (oi === q.userAnswer && !q.isCorrect) cls = 'wrong-pick';
            return `<div class="review-option ${cls}">
              <span class="opt-letter">${letters[oi]}.</span>
              <span>${opt}</span>
            </div>`;
          })
          .join('');

        return `
          <div class="review-item">
            <div class="review-q">
              <span class="review-q-number">Q${i + 1}.</span> ${q.question}
            </div>
            <span class="review-status ${statusClass}">${statusText}</span>
            ${optionsHtml}
          </div>`;
      })
      .join('');
  }

  // ─── History ───
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveToHistory(result) {
    const history = getHistory();
    history.unshift(result);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  function deleteFromHistory(id) {
    const history = getHistory().filter((h) => h.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory();
  }

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();

    if (history.length === 0) {
      historyListEl.innerHTML = `
        <div class="history-empty">
          <p>No test history yet.</p>
          <button class="btn btn-primary" id="btn-empty-start">Start a Test</button>
        </div>`;
      const emptyBtn = $('btn-empty-start');
      if (emptyBtn) emptyBtn.addEventListener('click', () => showView('home'));
      return;
    }

    historyListEl.innerHTML = history
      .map((h) => {
        const date = new Date(h.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const badgeCls = h.passed ? 'pass' : 'fail';
        const badgeText = h.passed ? 'PASS' : 'FAIL';

        return `
          <div class="history-item" data-history-id="${h.id}">
            <div class="history-summary">
              <div>
                <div class="history-date">${date}</div>
                <div class="history-meta">
                  <span>${h.questionCount} questions</span>
                  <span>${h.timeLimitMinutes > 0 ? h.timeLimitMinutes + ' min limit' : 'No time limit'}</span>
                  <span>${formatTimeFull(h.timeTakenSeconds)} taken</span>
                </div>
              </div>
              <div>
                <span class="history-score">${h.score}/${h.questionCount} (${h.percentage}%)</span>
                <span class="badge ${badgeCls}" style="margin-left:8px">${badgeText}</span>
              </div>
            </div>
            <div class="history-detail" id="detail-${h.id}">
              <div class="stats-grid">
                <div class="stat-card correct">
                  <div class="stat-value">${h.score}</div>
                  <div class="stat-label">Correct</div>
                </div>
                <div class="stat-card incorrect">
                  <div class="stat-value">${h.questionCount - h.score - (h.questions ? h.questions.filter(q => q.userAnswer === null).length : 0)}</div>
                  <div class="stat-label">Incorrect</div>
                </div>
                <div class="stat-card unanswered">
                  <div class="stat-value">${h.questions ? h.questions.filter(q => q.userAnswer === null).length : 0}</div>
                  <div class="stat-label">Unanswered</div>
                </div>
              </div>
              <div class="history-detail-actions">
                <button class="btn btn-danger btn-sm btn-delete-history" data-id="${h.id}">Delete</button>
              </div>
            </div>
          </div>`;
      })
      .join('');

    // Toggle detail
    historyListEl.querySelectorAll('.history-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-history')) return;
        const id = item.dataset.historyId;
        const detail = $(`detail-${id}`);
        detail.classList.toggle('open');
      });
    });

    // Delete buttons
    historyListEl.querySelectorAll('.btn-delete-history').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        showModal('Delete Result?', 'Are you sure you want to delete this test result?', () => {
          deleteFromHistory(id);
        });
      });
    });
  }

  btnHistoryHome.addEventListener('click', () => showView('home'));
  btnClearHistory.addEventListener('click', () => {
    showModal('Clear All History?', 'This will permanently delete all test results.', clearHistory);
  });
  btnNewTest.addEventListener('click', () => showView('home'));
  btnResultsHistory.addEventListener('click', () => {
    renderHistory();
    showView('history');
  });

  // ─── Modal ───
  let modalCallback = null;

  function showModal(title, message, onConfirm) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalCallback = onConfirm;
    modalOverlay.classList.add('active');
  }

  function hideModal() {
    modalOverlay.classList.remove('active');
    modalCallback = null;
  }

  modalCancel.addEventListener('click', hideModal);
  modalConfirm.addEventListener('click', () => {
    if (modalCallback) modalCallback();
    hideModal();
  });
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideModal();
  });

  // ─── Keyboard shortcuts ───
  document.addEventListener('keydown', (e) => {
    // Only in quiz view
    if (!views.quiz.classList.contains('active')) return;

    switch (e.key) {
      case 'ArrowLeft':
        if (currentIndex > 0) { currentIndex--; renderQuestion(); }
        break;
      case 'ArrowRight':
        if (currentIndex < quizQuestions.length - 1) { currentIndex++; renderQuestion(); }
        break;
      case '1': case '2': case '3': case '4':
        const idx = parseInt(e.key, 10) - 1;
        if (idx < quizQuestions[currentIndex].options.length) {
          userAnswers[currentIndex] = idx;
          renderQuestion();
          updateNavigator();
        }
        break;
      case 'f':
        flagged[currentIndex] = !flagged[currentIndex];
        renderQuestion();
        break;
    }
  });

  // ─── Init ───
  loadQuestions();
})();
