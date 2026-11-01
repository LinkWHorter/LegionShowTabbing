// ==UserScript==
// @name         Animated Skill Progress Injector
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Анимация кирки по изменению баланса чешуек и дробной части с ускоренным таймером
// @author       CheSh1re Nvm
// @match        https://play.multidonate.ru/*
// @updateURL    https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/second-script.user.js
// @downloadURL  https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/second-script.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let lastKnownScales = null;
    let lastKnownFrac = null;
    let lastChangeTime = 0;
    const ANIMATION_DURATION_MS = 30000; // 30 секунд активного прыганья при изменении

    // Добавляем стили анимации для кирки
    const styleElem = document.createElement('style');
    styleElem.innerHTML = `
        @keyframes pickaxeJump {
            0% {
                transform: translateY(0px) rotate(0deg);
            }
            50% {
                transform: translateY(-6px) rotate(180deg);
            }
            100% {
                transform: translateY(0px) rotate(360deg);
            }
        }
        .animated-pickaxe {
            display: inline-block;
            margin: 0 4px;
            font-size: 0.9em;
            transform-origin: center center;
        }
        .animated-pickaxe.jumping {
            animation: pickaxeJump 1.5s infinite ease-in-out;
        }
    `;
    document.head.appendChild(styleElem);

    function updateProgress() {
        const xpContainer = document.querySelector('.mn-wg-r.mn-wg-xp');
        const scalesContainer = document.querySelector('.mn-wg-r.mn-wg-e .mb');
        const fracContainer = document.querySelector('.mn-wg-r.mn-wg-e .mn-frac');

        if (!xpContainer) return;

        const levelTag = xpContainer.querySelector('b');
        const fillBar = xpContainer.querySelector('.mn-wg-b > i');

        if (!levelTag || !fillBar) return;

        if (!levelTag.dataset.originalText) {
            let cleanText = levelTag.textContent.trim();
            const matchUr = cleanText.match(/(ур\.\s*\d+)/i);
            levelTag.dataset.originalText = matchUr ? matchUr[0] : cleanText;
        }

        const styleAttr = fillBar.getAttribute('style');
        if (!styleAttr) return;

        const widthMatch = styleAttr.match(/width:\s*([^;]+)/);
        if (!widthMatch) return;

        const percentStr = widthMatch[1].trim(); // например, "94.7%"
        const currentPercent = parseFloat(percentStr);
        if (isNaN(currentPercent)) return;

        const remainingPercent = +(100 - currentPercent).toFixed(1) + '%';
        const now = Date.now();

        // Отслеживаем как основные чешуйки, так и дробную часть (.mn-frac)
        const currentScales = scalesContainer ? scalesContainer.textContent.trim() : null;
        const currentFrac = fracContainer ? fracContainer.textContent.trim() : null;

        if (lastKnownScales === null && lastKnownFrac === null) {
            lastKnownScales = currentScales;
            lastKnownFrac = currentFrac;
            lastChangeTime = 0;
        } else if (
            (currentScales !== null && currentScales !== lastKnownScales) ||
            (currentFrac !== null && currentFrac !== lastKnownFrac)
        ) {
            // Если изменилось либо число чешуек, либо дробная доля — обновляем значения и запускаем таймер на 30 сек
            lastKnownScales = currentScales;
            lastKnownFrac = currentFrac;
            lastChangeTime = now;
        }

        // Прошло ли меньше 30 секунд с момента последнего изменения?
        const isActivelyMining = lastChangeTime > 0 && (now - lastChangeTime) < ANIMATION_DURATION_MS;

        let pickaxeSpan = levelTag.querySelector('.animated-pickaxe');

        if (!pickaxeSpan) {
            levelTag.innerHTML = `
                <span class="percent-curr">${percentStr}</span><span class="animated-pickaxe ${isActivelyMining ? 'jumping' : ''}">⛏</span><span class="percent-rem">${remainingPercent}</span> – ${levelTag.dataset.originalText}
            `;
        } else {
            const currSpan = levelTag.querySelector('.percent-curr');
            const remSpan = levelTag.querySelector('.percent-rem');

            if (currSpan && currSpan.textContent !== percentStr) currSpan.textContent = percentStr;
            if (remSpan && remSpan.textContent !== remainingPercent) remSpan.textContent = remainingPercent;

            if (isActivelyMining && !pickaxeSpan.classList.contains('jumping')) {
                pickaxeSpan.classList.add('jumping');
            } else if (!isActivelyMining && pickaxeSpan.classList.contains('jumping')) {
                pickaxeSpan.classList.remove('jumping');
            }
        }
    }

    setTimeout(updateProgress, 500);

    const observer = new MutationObserver(() => {
        updateProgress();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    // Периодическая проверка каждую секунду для своевременной остановки анимации
    setInterval(updateProgress, 1000);

})();
