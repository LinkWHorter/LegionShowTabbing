// ==UserScript==
// @name         Toggle MN Panel Button
// @namespace    http://tampermonkey.net/
// @version      1.5.3
// @description  Кнопка 📜 / 🏆 / 👜, перетаскивание окна инвентаря, строгий приоритет сумки и фоновый детект квестов.
// @author       CheSh1re Nvm
// @match        https://play.multidonate.ru/*
// @updateURL    https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/script.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        @keyframes mnBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
        }
        .mn-toggle-panel-btn.has-ready-quest .icon-inner {
            display: inline-block;
            animation: mnBounce 0.6s ease infinite;
        }
    `;
    document.head.appendChild(style);

    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let inBagMode = false;

    function initScript() {
        if (document.querySelector('.mn-toggle-panel-btn')) return;

        const infoBtn = document.querySelector('.mn-tb .mn-info');
        if (!infoBtn) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn ghost sm mn-toggle-panel-btn';
        toggleBtn.title = 'Переключить панель / инвентарь';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon-inner';
        iconSpan.textContent = '📜';
        toggleBtn.appendChild(iconSpan);

        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.fontSize = '14px';

        toggleBtn.addEventListener('click', () => {
            const invWindow = document.querySelector('.mn-inv2-w');

            if (inBagMode && invWindow) {
                const isHidden = invWindow.style.display === 'none' || getComputedStyle(invWindow).display === 'none';
                invWindow.style.display = isHidden ? '' : 'none';
                return;
            }

            const currentPanel = document.querySelector('aside.mn-panel.panel');
            if (!currentPanel) return;

            const isHidden = currentPanel.style.display === 'none' || getComputedStyle(currentPanel).display === 'none';
            currentPanel.style.display = isHidden ? '' : 'none';
            currentPanel.setAttribute('data-open', isHidden ? '1' : '0');
        });

        infoBtn.parentNode.insertBefore(toggleBtn, infoBtn);
    }

    function setupDragAndDrop() {
        const invWindow = document.querySelector('.mn-inv2-w');
        if (!invWindow || invWindow.dataset.dragInitialized) return;

        const header = invWindow.querySelector('.lgi-h');
        if (!header) return;

        invWindow.dataset.dragInitialized = 'true';
        header.style.cursor = 'grab';

        header.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            header.style.cursor = 'grabbing';

            const rect = invWindow.getBoundingClientRect();
            if (!invWindow.style.left) {
                invWindow.style.left = rect.left + 'px';
                invWindow.style.top = rect.top + 'px';
                invWindow.style.transform = 'none';
            }

            dragOffsetX = e.clientX - parseFloat(invWindow.style.left);
            dragOffsetY = e.clientY - parseFloat(invWindow.style.top);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !invWindow) return;
            invWindow.style.left = (e.clientX - dragOffsetX) + 'px';
            invWindow.style.top = (e.clientY - dragOffsetY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                if (header) header.style.cursor = 'grab';
            }
        });
    }

    function updateButtonState() {
        const toggleBtn = document.querySelector('.mn-toggle-panel-btn');
        if (!toggleBtn) return;

        const iconSpan = toggleBtn.querySelector('.icon-inner');
        if (!iconSpan) return;

        const panel = document.querySelector('aside.mn-panel.panel');
        const invWindow = document.querySelector('.mn-inv2-w');

        if (panel && getComputedStyle(panel).display !== 'none') {
            inBagMode = false;
        }

        if (invWindow && getComputedStyle(invWindow).display !== 'none') {
            inBagMode = true;
        }

        let targetEmoji = '📜';
        let shouldBounce = false;

        if (inBagMode) {
            targetEmoji = '👜';
        } else {
            // Ищем готовый квест в DOM независимо от видимости панели или свернутости блоков
            const readyQuest = document.querySelector('li.mn-qr.done .mn-qx b.mn-qp');
            const isReady = readyQuest && readyQuest.textContent.trim().toLowerCase() === 'готово';
            if (isReady) {
                targetEmoji = '🏆';
                shouldBounce = true;
            }
        }

        if (iconSpan.textContent !== targetEmoji) {
            iconSpan.textContent = targetEmoji;
        }

        if (shouldBounce) {
            toggleBtn.classList.add('has-ready-quest');
        } else {
            toggleBtn.classList.remove('has-ready-quest');
        }
    }

    initScript();

    const observer = new MutationObserver(() => {
        if (!document.querySelector('.mn-toggle-panel-btn') && document.querySelector('.mn-tb .mn-info')) {
            initScript();
        }
        setupDragAndDrop();
        updateButtonState();
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
