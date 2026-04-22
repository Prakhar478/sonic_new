/**
 * app.js — Sonic global utilities
 * - Theme toggle
 * - NO PJAX: standard full-page navigation only
 *   (eliminates broken binding issues that were caused by PJAX)
 */

(function () {
    'use strict';

    function initTheme() {
        var saved = localStorage.getItem('sonic-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);

        var btn  = document.getElementById('theme-toggle-btn');
        var icon = document.getElementById('theme-icon');

        function applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('sonic-theme', theme);
            if (icon) icon.className = theme === 'dark' ? 'ph-fill ph-moon' : 'ph-fill ph-sun';
        }

        applyTheme(saved);

        if (btn) {
            btn.addEventListener('click', function () {
                var cur  = document.documentElement.getAttribute('data-theme');
                applyTheme(cur === 'dark' ? 'light' : 'dark');
            });
        }
    }

    document.addEventListener('DOMContentLoaded', initTheme);

}());
