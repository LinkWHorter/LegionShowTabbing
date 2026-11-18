// ==UserScript==
// @name         Казинака — игра на совпадения
// @namespace    http://tampermonkey.net/
// @version      1.1.8
// @description  Мини-игра с эмодзи, виртуальными монетами, анимацией, плавной прогрессией, таймером и рекордом под цифрой баланса
// @author       CheSh1re Nvm
// @match        https://legiongame.gg/*
// @updateURL    https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/fouth-script.user.js
// @downloadURL  https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/fouth-script.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(() => {
    'use strict';

    const WIDGET_ID = 'kazinaka-widget';
    if (document.getElementById(WIDGET_ID)) return;

    const SYMBOLS = [
        ['🎄', 10], ['🍀', 16], ['🍒', 8], ['⭐', 23],
        ['🍋', 7], ['🍉', 9], ['🔔', 20], ['💎', 50],
        ['🍄', 14], ['🌙', 18], ['🦊', 26], ['🐸', 12],
        ['🎲', 29], ['🎁', 46], ['🌈', 34], ['🔥', 39]
    ];

    const SYMBOL_COSTS = Object.fromEntries(SYMBOLS);

    const STORE_KEY = 'kazinaka-points-v1';
    const WINS_STORE_KEY = 'kazinaka-wins-v1';
    const MAX_EARNED_KEY = 'kazinaka-max-earned-v1';

    const saved = Number(sessionStorage.getItem(STORE_KEY));
    let points = Number.isSafeInteger(saved) && saved >= 0 ? saved : 100;

    const savedWins = Number(sessionStorage.getItem(WINS_STORE_KEY));
    let winCount = Number.isSafeInteger(savedWins) && savedWins >= 0 ? savedWins : 0;

    const savedMax = Number(localStorage.getItem(MAX_EARNED_KEY));
    let maxEarned = Number.isSafeInteger(savedMax) && savedMax >= 0 ? savedMax : points;

    let rolling = false;
    let isGamblingTimeout = false;
    let audioContext = null;

    function formatNumber(num) {
        if (num < 1000) return String(num);
        const suffixes = ['', 'k', 'm', 'b', 't', 'q', 's', 'S', 'o', 'n', 'd'];
        const i = Math.floor(Math.log10(num) / 3);
        const shortValue = (num / Math.pow(10, i * 3)).toFixed(1);
        return shortValue.replace(/\.0$/, '') + suffixes[i];
    }

    function getCurrentCost() {
        if (winCount === 0) return 10;
        const smoothBonus = Math.round(Math.sin(winCount * 0.18) * (winCount * 0.4) + (winCount * 1.25));
        return Math.max(10, 10 + smoothBonus);
    }

    const css = document.createElement('style');
    css.textContent = `
        #${WIDGET_ID}.session-ore-section {
            display: block; position: relative; z-index: 20;
            width: fit-content; max-width: min(100%, 390px);
            margin: 0 0 12px; padding: 12px 14px;
            background: rgba(29,22,32,.94);
            border: 1px solid rgba(255,207,106,.2); border-radius: 16px;
            box-sizing: border-box; font-family: "Golos Text", Arial, sans-serif;
            color: #f3efe6; user-select: none;
        }
        #${WIDGET_ID} .session-ore-header {
            display: flex; align-items: center; justify-content: space-between;
            gap: 12px; margin-bottom: 10px; font-size: 12px; font-weight: bold;
            color: #ffcf6a; text-transform: uppercase; letter-spacing: .05em;
            cursor: grab; touch-action: none;
        }
        #${WIDGET_ID} .session-ore-header:active { cursor: grabbing; }
        #${WIDGET_ID} .kz-line { display: flex; align-items: center; gap: 8px; }
        #${WIDGET_ID} .kz-coin { width: 22px; height: 22px; border-radius: 50%;
            display: grid; place-items: center; flex: 0 0 auto;
            color: #795000; font-size: 14px; font-weight: 900;
            background: radial-gradient(circle at 30% 25%, #fff2a0, #ffcf45 55%, #bf7c05 100%);
            border: 2px solid #e8a91e; box-shadow: 0 1px 5px #0005; cursor: help; }
        #${WIDGET_ID} .kz-points-col { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; flex: 0 0 auto; }
        #${WIDGET_ID} .kz-points { min-width: 46px; font-weight: 800; font-size: 14px;
            color: #ffe49a; font-variant-numeric: tabular-nums; cursor: help; }
        #${WIDGET_ID} .kz-max-badge {
            font-size: 9px; font-weight: 700; color: #ffcf6a;
            background: rgba(255, 207, 106, 0.12); border: 1px solid rgba(255, 207, 106, 0.3);
            padding: 1px 5px; border-radius: 6px; white-space: nowrap; cursor: help;
            letter-spacing: 0.03em;
        }
        #${WIDGET_ID} .kz-slots { display: flex; gap: 4px; padding: 5px;
            border-radius: 19px; border: 1px solid #ffcf6a55;
            background: #100e16; box-shadow: inset 0 2px 8px #0008; }
        #${WIDGET_ID} .cy-sc.kz-slot { width: 42px; height: 48px; flex: 0 0 42px;
            display: grid; place-items: center; padding: 0; font-size: 25px;
            background: rgba(255,255,255,.045); border: 2px solid rgba(255,255,255,.1);
            border-radius: 13px; box-sizing: border-box; cursor: help; }
        #${WIDGET_ID} .kz-roll { border: 1px solid #ffcf6a55; color: #ffdf89;
            background: rgba(255,207,106,.10); border-radius: 12px;
            cursor: pointer; font-size: 20px; min-width: 45px; min-height: 43px;
            display: flex; align-items: center; justify-content: center; font-weight: bold; }
        #${WIDGET_ID} .kz-roll:hover:not(:disabled) { background: rgba(255,207,106,.22); }
        #${WIDGET_ID} .kz-roll:disabled { opacity: .5; cursor: default; }
        #${WIDGET_ID} .kz-message { min-height: 16px; margin-top: 8px;
            font-size: 11px; color: #bfaab7; }
        #${WIDGET_ID} .kz-message.win { color: #ffcf6a; }
        #${WIDGET_ID} .kz-message.danger { color: #ff6a6a; }
        @media (max-width: 440px) {
            #${WIDGET_ID} { padding: 10px !important; }
            #${WIDGET_ID} .kz-line { gap: 5px; }
            #${WIDGET_ID} .cy-sc.kz-slot { width: 35px; height: 42px; flex-basis: 35px; font-size: 21px; }
        }
    `;
    document.head.append(css);

    const widget = document.createElement('div');
    widget.id = WIDGET_ID;
    widget.className = 'session-ore-section';
    widget.innerHTML = `
        <div class="session-ore-header"><span>Казинака</span><span title="Мини-игра с плавной прогрессивной стоимостью">✦</span></div>
        <div class="kz-line">
          <span class="kz-coin" aria-label="Виртуальные монеты" title="Баланс монет">●</span>
          <div class="kz-points-col">
            <span class="kz-points" aria-live="polite" title="Баланс монет"></span>
            <span class="kz-max-badge" title="Максимум монет за всё время">Макс.: 0</span>
          </div>
          <div class="kz-slots" aria-label="Три ячейки с эмодзи">
            <span class="cy-sc kz-slot" title="Случ. символ">❔</span>
            <span class="cy-sc kz-slot" title="Случ. символ">❔</span>
            <span class="cy-sc kz-slot" title="Случ. символ">❔</span>
          </div>
          <button class="kz-roll" type="button" title="Запустить крутку" aria-label="Запустить комбинацию">👆</button>
        </div>
        <div class="kz-message"></div>
    `;

    const header = widget.querySelector('.session-ore-header');
    const coinIcon = widget.querySelector('.kz-coin');
    const maxBadge = widget.querySelector('.kz-max-badge');
    const counter = widget.querySelector('.kz-points');
    const slots = [...widget.querySelectorAll('.kz-slot')];
    const rollButton = widget.querySelector('.kz-roll');
    const message = widget.querySelector('.kz-message');

    function updateUI() {
        const formatted = formatNumber(points);
        counter.textContent = formatted;

        if (points > maxEarned) {
            maxEarned = points;
            localStorage.setItem(MAX_EARNED_KEY, String(maxEarned));
        }

        maxBadge.textContent = `Макс.: ${formatNumber(maxEarned)}`;

        const fullTitle = `Баланс: ${points.toLocaleString()} монет`;
        const fullMaxTitle = `Монет за всё время: ${maxEarned.toLocaleString()}`;
        counter.title = fullTitle;
        coinIcon.title = fullTitle;
        maxBadge.title = fullMaxTitle;

        if (!isGamblingTimeout && !rolling) {
            const cost = getCurrentCost();
            message.textContent = `Совпадение: 2 - ×2.5 / 3 - ×7.5 · Текущая цена: ${cost}`;
        }
    }
    updateUI();

    function mount() {
        if (widget.isConnected) return;
        const ore = document.querySelector('.session-ore-section:not(#kazinaka-widget)');
        if (ore?.parentNode) {
            ore.parentNode.insertBefore(widget, ore);
        } else {
            const anchor = document.querySelector('section.mn-wg');
            if (anchor?.parentNode) anchor.parentNode.insertBefore(widget, anchor.nextSibling);
        }
    }
    mount();

    const mountTimer = setInterval(() => {
        mount();
        if (widget.isConnected && document.querySelector('.session-ore-section:not(#kazinaka-widget)')) {
            const ore = document.querySelector('.session-ore-section:not(#kazinaka-widget)');
            if (widget.style.position !== 'fixed' && ore.parentNode === widget.parentNode &&
                (widget.compareDocumentPosition(ore) & Node.DOCUMENT_POSITION_PRECEDING)) {
                ore.before(widget);
            }
        }
    }, 2000);
    window.addEventListener('pagehide', () => clearInterval(mountTimer), { once: true });

    function pickIndex() {
        const limit = Math.floor(0x100000000 / SYMBOLS.length) * SYMBOLS.length;
        const bits = new Uint32Array(1);
        let n;
        do { crypto.getRandomValues(bits); n = bits[0]; } while (n >= limit);
        return n % SYMBOLS.length;
    }

    function setSlotSymbol(slot, symbol) {
        slot.textContent = symbol;
        const cost = SYMBOL_COSTS[symbol];
        if (cost !== undefined) {
            slot.title = `Символ ${symbol}: базовая стоимость - ${cost} монет`;
        } else {
            slot.title = 'Случ. символ';
        }
    }

    function coinSound() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            audioContext ||= new AC();
            if (audioContext.state === 'suspended') audioContext.resume();
            const now = audioContext.currentTime;
            for (let i = 0; i < 5; i++) {
                const start = now + i * 0.055;
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(950 + i * 110, start);
                oscillator.frequency.exponentialRampToValueAtTime(650 + i * 75, start + .09);
                gain.gain.setValueAtTime(0.0001, start);
                gain.gain.exponentialRampToValueAtTime(.035, start + .008);
                gain.gain.exponentialRampToValueAtTime(.0001, start + .095);
                oscillator.connect(gain).connect(audioContext.destination);
                oscillator.start(start);
                oscillator.stop(start + .1);
            }
        } catch (_) {}
    }

    function animatePoints(amount) {
        return new Promise(resolve => {
            if (amount <= 0) { updateUI(); resolve(); return; }
            counter.textContent = `+${amount}`;
            coinSound();
            const startValue = points;
            const targetValue = points + amount;
            const started = performance.now();
            const duration = Math.min(1700, Math.max(450, amount * 14));

            const tick = timestamp => {
                const progress = Math.min(1, (timestamp - started) / duration);
                const value = startValue + Math.floor(amount * (1 - (1 - progress) ** 3));
                counter.textContent = formatNumber(value);

                if (value > maxEarned) {
                    maxEarned = value;
                    localStorage.setItem(MAX_EARNED_KEY, String(maxEarned));
                    maxBadge.textContent = `Макс.: ${formatNumber(maxEarned)}`;
                    maxBadge.title = `Монет за всё время: ${maxEarned.toLocaleString()}`;
                }

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    points = targetValue;
                    sessionStorage.setItem(STORE_KEY, String(points));
                    updateUI();
                    resolve();
                }
            };
            setTimeout(() => requestAnimationFrame(tick), 550);
        });
    }

    function triggerGamblingTimer() {
        isGamblingTimeout = true;
        rollButton.disabled = true;
        message.classList.remove('win');
        message.classList.add('danger');

        let timeLeft = 35;
        rollButton.textContent = `${timeLeft}s`;
        message.textContent = `Баланс на нуле! Гемблинг-таймер активирован...`;

        const timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                rollButton.textContent = `${timeLeft}s`;
            } else {
                clearInterval(timerInterval);
                points = 100;
                winCount = 0;
                sessionStorage.setItem(STORE_KEY, String(points));
                sessionStorage.setItem(WINS_STORE_KEY, String(winCount));

                isGamblingTimeout = false;
                rollButton.disabled = false;
                rollButton.textContent = '👆';
                message.classList.remove('danger');
                message.textContent = 'Вам начислено 100 бонусных монет!';
                updateUI();
            }
        }, 1000);
    }

    rollButton.addEventListener('click', async () => {
        if (rolling || isGamblingTimeout) return;

        const currentCost = getCurrentCost();
        if (points < currentCost) {
            triggerGamblingTimer();
            return;
        }

        points -= currentCost;
        sessionStorage.setItem(STORE_KEY, String(points));
        updateUI();

        rolling = true;
        rollButton.disabled = true;
        message.classList.remove('win', 'danger');
        message.textContent = 'Подбираем комбинацию…';

        const chosen = Array.from({ length: 3 }, pickIndex);
        const started = performance.now();
        const durations = [850, 1150, 1450];

        await new Promise(resolve => {
            const spin = now => {
                slots.forEach((slot, index) => {
                    if (now - started < durations[index]) {
                        const randomSymbol = SYMBOLS[pickIndex()][0];
                        setSlotSymbol(slot, randomSymbol);
                    } else {
                        const finalSymbol = SYMBOLS[chosen[index]][0];
                        setSlotSymbol(slot, finalSymbol);
                    }
                });
                if (now - started < Math.max(...durations)) setTimeout(() => requestAnimationFrame(spin), 70);
                else resolve();
            };
            requestAnimationFrame(spin);
        });

        const counts = new Map();
        for (const id of chosen) counts.set(id, (counts.get(id) || 0) + 1);
        const match = [...counts].find(([, count]) => count >= 2);

        if (!match) {
            message.textContent = 'Все разные — попробуй ещё!';
        } else {
            const [id, count] = match;
            const multiplier = count === 3 ? 7.5 : 2.5;
            const reward = Math.round(SYMBOLS[id][1] * multiplier);

            winCount++;
            sessionStorage.setItem(WINS_STORE_KEY, String(winCount));

            message.textContent = `${SYMBOLS[id][0]} ×${count} · Выигрыш +${reward}`;
            message.classList.add('win');

            await animatePoints(reward);
        }

        rolling = false;

        if (points <= 0) {
            triggerGamblingTimer();
        } else {
            rollButton.disabled = false;
            updateUI();
        }
    });

    let drag = null;
    header.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        const rect = widget.getBoundingClientRect();
        widget.style.position = 'fixed';
        widget.style.left = `${rect.left}px`;
        widget.style.top = `${rect.top}px`;
        widget.style.margin = '0';
        drag = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
        header.setPointerCapture(e.pointerId);
    });
    header.addEventListener('pointermove', e => {
        if (!drag || drag.pointerId !== e.pointerId) return;
        const maxX = Math.max(0, innerWidth - widget.offsetWidth);
        const maxY = Math.max(0, innerHeight - widget.offsetHeight);
        widget.style.left = `${Math.max(0, Math.min(maxX, drag.left + e.clientX - drag.x))}px`;
        widget.style.top = `${Math.max(0, Math.min(maxY, drag.top + e.clientY - drag.y))}px`;
    });
    const stopDrag = e => {
        if (!drag || drag.pointerId !== e.pointerId) return;
        drag = null;
        if (header.hasPointerCapture(e.pointerId)) header.releasePointerCapture(e.pointerId);
    };
    header.addEventListener('pointerup', stopDrag);
    header.addEventListener('pointercancel', stopDrag);
    window.addEventListener('resize', () => {
        if (widget.style.position !== 'fixed') return;
        const rect = widget.getBoundingClientRect();
        widget.style.left = `${Math.max(0, Math.min(rect.left, innerWidth - widget.offsetWidth))}px`;
        widget.style.top = `${Math.max(0, Math.min(rect.top, innerHeight - widget.offsetHeight))}px`;
    });
})();
