// ==UserScript==
// @name         Session Ore & Items Widget Injected & Draggable (Bounded)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Плашка добычи за сессию с ограничением выхода за границы экрана при перетаскивании
// @author       CheSh1re Nvm
// @match        https://play.multidonate.ru/*
// @updateURL    https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/third-cript.user.js
// @downloadURL  https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/third-script.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let baseline = new Map();
    let baselineReady = false;
    let sessionGains = new Map();
    const itemTemplates = new Map();

    const styleElem = document.createElement('style');
    styleElem.innerHTML = `
        .session-ore-section {
            position: relative;
            z-index: 1;
            background: rgba(29, 22, 32, 0.94);
            border: 1px solid rgba(255, 207, 106, 0.2);
            border-radius: 16px;
            padding: 12px 14px;
            margin-top: 12px;
            box-sizing: border-box;
            font-family: "Golos Text", Arial, sans-serif;
            color: #f3efe6;
            display: none;
            width: fit-content;
            max-width: 100%;
        }
        .session-ore-section.visible {
            display: block;
        }
        .session-ore-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            font-size: 12px;
            font-weight: bold;
            color: #ffcf6a;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: grab;
            user-select: none;
            touch-action: none;
        }
        .session-ore-header:active {
            cursor: grabbing;
        }
        .session-ore-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .session-ore-section .cy-sc {
            flex: 0 0 56px;
            width: 56px;
            height: 56px;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.04);
            border: 2px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 2px;
            box-sizing: border-box;
        }
        .session-ore-section .cy-sc[data-r="epic"] { border-color: #c084fc; }
        .session-ore-section .cy-sc[data-r="rare"] { border-color: #38bdf8; }
        .session-ore-section .cy-sc[data-r="uncommon"] { border-color: #4ade80; }
        .session-ore-section .cy-sc[data-r="common"] { border-color: rgba(255,255,255,0.15); }

        .session-ore-section .cy-gi {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .session-ore-section .cy-gi svg {
            width: 100%;
            height: 100%;
        }
        .session-ore-section .cy-sc .n {
            font-size: 10px;
            font-weight: 700;
            color: #fff;
            font-style: normal;
            margin-top: 2px;
            background: rgba(0,0,0,0.4);
            padding: 1px 3px;
            border-radius: 4px;
        }
        .session-ore-reset {
            background: transparent;
            border: none;
            color: #bfaab7;
            cursor: pointer;
            font-size: 10px;
            padding: 2px 6px;
        }
        .session-ore-reset:hover {
            color: #ffcf6a;
        }
    `;
    document.head.appendChild(styleElem);

    const widgetSection = document.createElement('div');
    widgetSection.className = 'session-ore-section';
    widgetSection.innerHTML = `
        <div class="session-ore-header">
            <span class="session-ore-title">Добыто за сессию</span>
            <button class="session-ore-reset" title="Сбросить сессию">Сбросить</button>
        </div>
        <div class="session-ore-grid"></div>
    `;

    widgetSection.querySelector('.session-ore-reset').addEventListener('click', () => {
        sessionGains.clear();
        baselineReady = false;
        renderWidget();
    });

    // Логика перетаскивания с проверкой границ экрана
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const headerElem = widgetSection.querySelector('.session-ore-header');

    headerElem.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button')) return;
        isDragging = true;

        const rect = widgetSection.getBoundingClientRect();
        widgetSection.style.position = 'fixed';
        widgetSection.style.left = `${rect.left}px`;
        widgetSection.style.top = `${rect.top}px`;
        widgetSection.style.margin = '0';

        dragStartX = event.clientX;
        dragStartY = event.clientY;
        initialLeft = rect.left;
        initialTop = rect.top;

        try {
            headerElem.setPointerCapture(event.pointerId);
        } catch (_) {}
    });

    headerElem.addEventListener('pointermove', (event) => {
        if (!isDragging) return;
        const deltaX = event.clientX - dragStartX;
        const deltaY = event.clientY - dragStartY;

        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;

        // Вычисляем границы экрана с учетом размеров самой плашки
        const maxX = window.innerWidth - widgetSection.offsetWidth - 10;
        const maxY = window.innerHeight - widgetSection.offsetHeight - 10;

        // Жестко ограничиваем координаты в пределах видимой зоны окна
        newLeft = Math.max(10, Math.min(newLeft, Math.max(10, maxX)));
        newTop = Math.max(10, Math.min(newTop, Math.max(10, maxY)));

        widgetSection.style.left = `${newLeft}px`;
        widgetSection.style.top = `${newTop}px`;
    });

    const stopDrag = (event) => {
        if (!isDragging) return;
        isDragging = false;
        try {
            headerElem.releasePointerCapture(event.pointerId);
        } catch (_) {}
    };

    headerElem.addEventListener('pointerup', stopDrag);
    headerElem.addEventListener('pointercancel', stopDrag);

    // Автоматическая корректировка позиции при изменении размера окна, если плашку уже таскали
    window.addEventListener('resize', () => {
        if (widgetSection.style.position === 'fixed') {
            const rect = widgetSection.getBoundingClientRect();
            const maxX = window.innerWidth - widgetSection.offsetWidth - 10;
            const maxY = window.innerHeight - widgetSection.offsetHeight - 10;

            if (rect.left > maxX || rect.top > maxY) {
                widgetSection.style.left = `${Math.max(10, Math.min(rect.left, maxX))}px`;
                widgetSection.style.top = `${Math.max(10, Math.min(rect.top, maxY))}px`;
            }
        }
    });

    function parseItemsBag() {
        const itemButtons = document.querySelectorAll('.cy-sc[data-k], .cy-sc[data-lgi-pin]');
        const currentTotals = new Map();

        itemButtons.forEach(btn => {
            const dataK = btn.getAttribute('data-k');
            const pinType = btn.getAttribute('data-lgi-pin');
            if (!dataK && !pinType) return;

            let resourceKey = '';
            let rarity = btn.getAttribute('data-r') || 'common';

            if (pinType) {
                resourceKey = `pin_${pinType}`;
            } else if (dataK.startsWith('pin#')) {
                const parts = dataK.split('#');
                resourceKey = `pin_${parts[1] || 'item'}`;
            } else {
                const parts = dataK.split('|');
                if (parts.length >= 8) {
                    resourceKey = parts[1];
                    rarity = parts[2];
                }
            }

            if (!resourceKey) return;

            const nElem = btn.querySelector('.n');
            let totalValue = 0;
            if (nElem) {
                const rawText = nElem.textContent.replace(',', '.');
                if (rawText.includes('.')) {
                    totalValue = Math.round(parseFloat(rawText) * 100);
                } else {
                    totalValue = parseInt(rawText, 10) || 0;
                }
            }

            if (!itemTemplates.has(resourceKey)) {
                itemTemplates.set(resourceKey, {
                    html: btn.innerHTML,
                    rarity: rarity,
                    isInteger: pinType || (nElem && !nElem.textContent.includes(','))
                });
            }

            currentTotals.set(resourceKey, totalValue);
        });

        return currentTotals;
    }

    function checkItems() {
        const targetSection = document.querySelector('section.mn-wg');
        if (targetSection && !document.body.contains(widgetSection)) {
            targetSection.parentNode.insertBefore(widgetSection, targetSection.nextSibling);
        }

        const totals = parseItemsBag();
        if (totals.size === 0) return;

        if (!baselineReady) {
            baseline = new Map(totals);
            baselineReady = true;
            return;
        }

        totals.forEach((currVal, key) => {
            const baseVal = baseline.get(key) || 0;
            const diff = currVal - baseVal;
            if (diff > 0) {
                const currentGain = sessionGains.get(key) || 0;
                sessionGains.set(key, currentGain + diff);
                baseline.set(key, currVal);
            } else if (currVal < baseVal) {
                baseline.set(key, currVal);
            }
        });

        renderWidget();
    }

    function renderWidget() {
        const grid = widgetSection.querySelector('.session-ore-grid');
        grid.innerHTML = '';

        let totalItemsCount = 0;

        sessionGains.forEach((value, key) => {
            if (value <= 0) return;
            totalItemsCount++;

            const template = itemTemplates.get(key);
            const rarity = template ? template.rarity : 'common';
            const svgContent = template ? template.html : '';

            const cell = document.div ? document.createElement('div') : document.createElement('div');
            cell.className = 'cy-sc';
            cell.setAttribute('data-r', rarity);
            cell.innerHTML = svgContent;

            const nTag = cell.querySelector('.n');
            if (nTag) {
                if (template && template.isInteger) {
                    nTag.textContent = value;
                } else {
                    nTag.textContent = (value / 100).toFixed(2).replace('.', ',');
                }
            }
            const noTag = cell.querySelector('.no');
            if (noTag) noTag.remove();

            grid.appendChild(cell);
        });

        if (totalItemsCount > 0) {
            widgetSection.classList.add('visible');
        } else {
            widgetSection.classList.remove('visible');
        }
    }

    setInterval(checkItems, 1000);

})();
