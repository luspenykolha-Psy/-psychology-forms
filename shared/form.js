/* ════════════════════════════════════════════════════════════
   form.js — Універсальна логіка для всіх форм
   Читає FORM_CONFIG з кожної HTML-сторінки.

   FORM_CONFIG структура:
   {
     questionnaire: 'PHQ-9',          // має збігатись з ключем у Apps Script
     scriptUrl: 'https://...',         // URL задеплоєного Apps Script
     psychologistName: 'Ольга ...',    // відображається у шапці
     title: 'PHQ-9 · Назва',          // заголовок форми
     instruction: 'Текст інструкції', // текст на вступному екрані
     scale: {
       values: [0,1,2,3],             // числові значення кнопок
       labels: ['Ніколи','...'],      // підписи під кнопками
       legendLeft:  'Ліва підпис',    // підпис легенди зліва
       legendRight: 'Права підпис',   // підпис легенди справа
     },
     blocks: [
       {
         tag:   'Блок 1',             // мітка (домен, розділ тощо)
         title: 'Назва блоку',        // заголовок блоку
         questions: [
           { n: 1, t: 'Текст питання' },
           ...
         ]
       },
       ...
     ]
   }
   ════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Стан ────────────────────────────────────────────────
  let currentBlock = 0;
  let answers      = {};   // { n: value }
  let clientData   = {};   // { name, fullName, dob }

  // ── Ініціалізація після завантаження DOM ────────────────
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof FORM_CONFIG === 'undefined') {
      console.error('FORM_CONFIG не знайдено на сторінці!');
      return;
    }

    buildIntroScreen();
    buildQuizShell();
    buildThankYouScreen();
  });

  // ════════════════════════════════════════════════════════
  // ВСТУПНИЙ ЕКРАН
  // ════════════════════════════════════════════════════════
  function buildIntroScreen() {
    const intro = document.getElementById('introScreen');
    if (!intro) return;

    // Підставляємо URL-параметр ?client= якщо є
    const urlParams  = new URLSearchParams(window.location.search);
    const clientId   = urlParams.get('client') || '';

    intro.innerHTML = `
      <div class="card" style="max-width:520px;margin:0 auto;">
        <div class="intro-logo">🧠</div>
        <div class="intro-title">${FORM_CONFIG.title}</div>
        <div class="intro-subtitle">${FORM_CONFIG.psychologistName || ''}</div>

        <div class="intro-instruction">${FORM_CONFIG.instruction || ''}</div>

        <div class="field-group">
          <label class="field-label">Ваше ім'я та прізвище *</label>
          <input id="fieldFullName" class="field-input" type="text"
                 placeholder="Наприклад: Марія Іванченко"
                 value="${clientId}" />
        </div>

        <div class="field-group">
          <label class="field-label">Дата народження *</label>
          <input id="fieldDob" class="field-input" type="date" />
        </div>

        <div class="field-group">
          <label class="field-label">Дата заповнення</label>
          <input id="fieldDate" class="field-input" type="date"
                 value="${todayISO()}" readonly />
        </div>

        <button class="btn btn-primary" style="width:100%;margin-top:8px;"
                onclick="FormApp.start()">
          Розпочати →
        </button>
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════
  // ОБОЛОНКА ТЕСТУ (шапка + прогрес + контейнер + навігація)
  // ════════════════════════════════════════════════════════
  function buildQuizShell() {
    const quiz = document.getElementById('quizScreen');
    if (!quiz) return;

    quiz.innerHTML = `
      <header class="app-header">
        <div>
          <div class="header-title" id="headerTitle"></div>
          <div class="header-sub">${FORM_CONFIG.psychologistName || ''}</div>
        </div>
        <div class="header-counter" id="headerCounter"></div>
      </header>

      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>

      <div class="container">
        <div class="block-tag"  id="blockTag"></div>
        <div class="block-title" id="blockTitle"></div>
        <div id="questionsList"></div>
      </div>

      <div class="nav-bar">
        <button class="btn btn-secondary" id="btnBack" onclick="FormApp.prev()">← Назад</button>
        <div class="nav-hint" id="navHint"></div>
        <button class="btn btn-primary"   id="btnNext" onclick="FormApp.next()">
          <span id="btnNextLabel">Далі →</span>
        </button>
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════
  // ЕКРАН ПОДЯКИ
  // ════════════════════════════════════════════════════════
  function buildThankYouScreen() {
    const ty = document.getElementById('thankYouScreen');
    if (!ty) return;

    ty.innerHTML = `
      <div class="card thankyou-card" style="max-width:520px;margin:40px auto;">
        <div class="thankyou-icon">✅</div>
        <div class="thankyou-title">Дякуємо!</div>
        <div class="thankyou-text">
          Ваші відповіді збережено. Психолог ознайомиться з результатами
          перед наступною сесією.
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════
  // РЕНДЕР БЛОКУ ПИТАНЬ
  // ════════════════════════════════════════════════════════
  function renderBlock(idx) {
    currentBlock = idx;
    const block  = FORM_CONFIG.blocks[idx];
    const total  = FORM_CONFIG.blocks.length;
    const scale  = FORM_CONFIG.scale;

    // Шапка
    document.getElementById('headerTitle').textContent  = FORM_CONFIG.title;
    document.getElementById('headerCounter').textContent = `Блок ${idx + 1} / ${total}`;
    document.getElementById('progressFill').style.width  = `${(idx / total) * 100}%`;
    document.getElementById('blockTag').textContent   = block.tag   || '';
    document.getElementById('blockTitle').textContent = block.title || '';

    // Кнопки навігації
    document.getElementById('btnBack').disabled     = idx === 0;
    document.getElementById('btnNextLabel').textContent = idx === total - 1 ? 'Завершити ✓' : 'Далі →';

    // Питання
    const list = document.getElementById('questionsList');
    list.innerHTML = '';

    block.questions.forEach(function (q, qi) {
      const card = document.createElement('div');
      card.className = 'q-card' + (answers[q.n] !== undefined ? ' answered' : '');
      card.id = `qcard-${q.n}`;
      card.style.animationDelay = `${qi * 0.04}s`;

      const btnsHTML = scale.values.map(function (v, i) {
        const label  = scale.labels[i] || v;
        const sel    = answers[q.n] === v ? ' selected' : '';
        return `
          <button class="scale-btn${sel}"
                  onclick="FormApp.select(${q.n}, ${v}, this)">
            <span class="scale-num">${v}</span>
            <span class="scale-label">${label}</span>
          </button>`;
      }).join('');

      card.innerHTML = `
        <div class="missed-label">⚠ Будь ласка, оберіть відповідь</div>
        <div class="q-num">Твердження ${q.n}</div>
        <div class="q-text">${q.t}</div>
        <div class="scale-row">${btnsHTML}</div>
        <div class="scale-legend">
          <span>${scale.legendLeft  || ''}</span>
          <span>${scale.legendRight || ''}</span>
        </div>`;

      list.appendChild(card);
    });

    updateNavHint();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ════════════════════════════════════════════════════════
  // ПІДКАЗКА НАВІГАЦІЇ
  // ════════════════════════════════════════════════════════
  function updateNavHint() {
    const block      = FORM_CONFIG.blocks[currentBlock];
    const total      = FORM_CONFIG.blocks.length;
    const allDone    = block.questions.every(q => answers[q.n] !== undefined);
    const isLast     = currentBlock === total - 1;

    document.getElementById('navHint').textContent = allDone
      ? (isLast ? 'Всі відповіді надано — можна завершити' : 'Можна переходити до наступного блоку')
      : 'Дайте відповідь на всі твердження цього блоку';
  }

  // ════════════════════════════════════════════════════════
  // ВІДПРАВКА ДАНИХ
  // ════════════════════════════════════════════════════════
  function submitResults() {
    // Збираємо всі відповіді у форматі { П1: v, П2: v, ... }
    const rawAnswers = {};
    FORM_CONFIG.blocks.forEach(function (block) {
      block.questions.forEach(function (q) {
        rawAnswers['П' + q.n] = answers[q.n];
      });
    });

    const payload = {
      questionnaire: FORM_CONFIG.questionnaire,
      timestamp:     new Date().toISOString(),
      name:          clientData.name     || '',
      fullName:      clientData.fullName || '',
      dob:           clientData.dob      || '',
      raw:           JSON.stringify(rawAnswers),
    };

    // Показуємо подяку одразу (не чекаємо відповіді скрипту)
    document.getElementById('quizScreen').classList.add('hidden');
    document.getElementById('thankYouScreen').classList.remove('hidden');

    // Надсилаємо через no-cors fetch
    const jsonStr = JSON.stringify(payload);

    fetch(FORM_CONFIG.scriptUrl + '?data=' + encodeURIComponent(jsonStr), {
      method: 'GET',
      mode:   'no-cors',
    }).catch(function() {});
  }

  // ════════════════════════════════════════════════════════
  // ПУБЛІЧНИЙ API (викликається з HTML через onclick)
  // ════════════════════════════════════════════════════════
  window.FormApp = {

    // Старт після вступного екрану
    start: function () {
      const fullName = document.getElementById('fieldFullName').value.trim();
      const dob      = document.getElementById('fieldDob').value;

      if (!fullName) {
        document.getElementById('fieldFullName').focus();
        document.getElementById('fieldFullName').style.borderColor = '#e53935';
        return;
      }

      clientData = {
        name:     fullName.split(' ')[0] || fullName,
        fullName: fullName,
        dob:      dob || '—',
      };

      document.getElementById('introScreen').classList.add('hidden');
      document.getElementById('quizScreen').classList.remove('hidden');
      renderBlock(0);
    },

    // Вибір відповіді
    select: function (qNum, val, btn) {
      answers[qNum] = val;
      btn.closest('.scale-row').querySelectorAll('.scale-btn').forEach(function (b) {
        b.classList.remove('selected');
      });
      btn.classList.add('selected');
      document.getElementById(`qcard-${qNum}`).classList.add('answered');
      updateNavHint();
    },

    // Наступний блок
    next: function () {
      const block  = FORM_CONFIG.blocks[currentBlock];
      const missed = block.questions.filter(q => answers[q.n] === undefined);

      if (missed.length > 0) {
        missed.forEach(function (q) {
          const card = document.getElementById(`qcard-${q.n}`);
          if (!card) return;
          card.classList.remove('missed');
          void card.offsetWidth; // reflow для повторної анімації
          card.classList.add('missed');
          setTimeout(() => card.classList.remove('missed'), 2500);
        });
        const first = document.getElementById(`qcard-${missed[0].n}`);
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (currentBlock < FORM_CONFIG.blocks.length - 1) {
        renderBlock(currentBlock + 1);
      } else {
        submitResults();
      }
    },

    // Попередній блок
    prev: function () {
      if (currentBlock > 0) renderBlock(currentBlock - 1);
    },
  };

  // ════════════════════════════════════════════════════════
  // ДОПОМІЖНІ ФУНКЦІЇ
  // ════════════════════════════════════════════════════════
  function todayISO() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

})();
