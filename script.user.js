// ==UserScript==
// @name         Toggle MN Panel Button
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Добавляет кнопку 📜 в блок .mn-tb перед кнопкой [i] для скрытия/показа панели .mn-panel.panel
// @author       CheSh1re Nvm
// @match        https://play.multidonate.ru/*
// @updateURL    https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/LinkWHorter/LegionShowTabbing/main/script.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function initScript() {
        // Проверяем, не создана ли кнопка уже
        if (document.querySelector('.mn-toggle-panel-btn')) return;

        // Ищем кнопку [i] (класс .mn-info) внутри блока .mn-tb
        const infoBtn = document.querySelector('.mn-tb .mn-info');
        if (!infoBtn) return;

        // Находим саму панель, которую нужно скрывать/показывать
        const panel = document.querySelector('aside.mn-panel.panel');
        if (!panel) return;

        // Создаем новую кнопку, копируя классы для сохранения оригинального стиля
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn ghost sm mn-toggle-panel-btn';
        toggleBtn.title = 'Переключить панель';
        toggleBtn.textContent = '📜';

        // Добавляем стили для корректного отображения иконки
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.fontSize = '14px';

        // Вешаем клик: меняем видимость панели и атрибут data-open
        toggleBtn.addEventListener('click', () => {
            const isHidden = panel.style.display === 'none' || getComputedStyle(panel).display === 'none';

            if (isHidden) {
                panel.style.display = '';
                panel.setAttribute('data-open', '1');
            } else {
                panel.style.display = 'none';
                panel.setAttribute('data-open', '0');
            }
        });

        // Вставляем кнопку в .mn-tb прямо перед кнопкой [i]
        infoBtn.parentNode.insertBefore(toggleBtn, infoBtn);
    }

    // Запускаем сразу, если элементы уже прогрузились
    initScript();

    // На случай, если элементы подгружаются динамически через JS (SPA), ставим наблюдатель
    const observer = new MutationObserver(() => {
        if (!document.querySelector('.mn-toggle-panel-btn') && document.querySelector('.mn-tb .mn-info')) {
            initScript();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
