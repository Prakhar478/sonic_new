/**
 * youtube.js — Sonic Import Playlist Page (Enhanced v2)
 * Handles text-based import AND YouTube link import.
 * Supports individual Add to Playlist and bulk Save to Playlist.
 */

(function () {
    'use strict';

    var importedSongs = []; // holds the last successful import result

    function init() {
        var btnImport  = document.getElementById('btn-import');
        var btnPlayAll = document.getElementById('btn-play-all');
        var btnSave    = document.getElementById('btn-save-playlist');

        if (!btnImport) return; // not on the import page

        btnImport.addEventListener('click', handleImport);
        if (btnPlayAll) btnPlayAll.addEventListener('click', handlePlayAll);
        if (btnSave)    btnSave.addEventListener('click',    handleSave);
    }

    // ─── Import Handler ──────────────────────────────────────────────────

    async function handleImport() {
        var textarea   = document.getElementById('text-playlist-input');
        var statusEl   = document.getElementById('import-status');
        var resultArea = document.getElementById('imported-playlist-area');
        var listEl     = document.getElementById('imported-tracks-list');
        var countEl    = document.getElementById('imported-count');

        if (!textarea) return;
        var raw = textarea.value.trim();

        if (!raw) {
            showStatus(statusEl, 'warning', 'Please paste some song titles or a YouTube link first.');
            return;
        }

        // ── YouTube link check ────────────────────────────────────────────
        var isYouTube = raw.includes('youtube.com/playlist') || raw.includes('list=') || raw.includes('youtu.be');
        
        var btnImport = document.getElementById('btn-import');
        if (btnImport) btnImport.disabled = true;

        if (isYouTube) {
            // Extract the URL (take the first line if multiple)
            var url = raw.split('\n')[0].trim();
            showStatus(statusEl, 'loading', 'Extracting tracks from YouTube playlist... please wait.');
            if (resultArea) resultArea.style.display = 'none';

            try {
                var res = await fetch('/api/import/youtube-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url })
                });

                var data = await res.json();

                if (!data.success) {
                    showStatus(statusEl, 'warning', data.message || 'Could not read this YouTube playlist.');
                    return;
                }

                processResults(data.songs, statusEl, resultArea, listEl, countEl);

            } catch (err) {
                showStatus(statusEl, 'error', 'Import failed: ' + err.message);
            } finally {
                if (btnImport) btnImport.disabled = false;
            }
        } else {
            // ── Standard Text Import ──────────────────────────────────────────────
            var lines = raw.split('\n')
                .map(function (l) { return l.trim(); })
                .filter(function (l) { return l.length > 0; });

            if (lines.length === 0) {
                showStatus(statusEl, 'warning', 'No valid track titles found.');
                if (btnImport) btnImport.disabled = false;
                return;
            }

            showStatus(statusEl, 'loading', 'Matching ' + lines.length + ' track(s) with Saavn... please wait.');
            if (resultArea) resultArea.style.display = 'none';

            try {
                var res = await fetch('/api/import/text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(lines)
                });

                if (!res.ok) throw new Error('Server error: ' + res.status);

                var songs = await res.json();
                processResults(songs, statusEl, resultArea, listEl, countEl);

            } catch (err) {
                showStatus(statusEl, 'error', 'Import failed: ' + err.message);
            } finally {
                if (btnImport) btnImport.disabled = false;
            }
        }
    }

    function processResults(songs, statusEl, resultArea, listEl, countEl) {
        if (!songs || songs.length === 0) {
            showStatus(statusEl, 'warning', 'No songs could be matched. Try simpler titles.');
            return;
        }

        importedSongs = songs;
        showStatus(statusEl, 'success', 'Imported ' + songs.length + ' song(s) successfully.');
        renderSongs(songs, listEl, countEl);
        if (resultArea) resultArea.style.display = 'block';
    }

    // ─── Render Imported Songs ────────────────────────────────────────────

    function renderSongs(songs, container, countEl) {
        if (!container) return;
        container.innerHTML = '';

        if (countEl) countEl.textContent = songs.length + ' songs';

        songs.forEach(function (song, idx) {
            var row = document.createElement('div');
            row.className = 'list-item';
            row.innerHTML =
                '<span class="list-num">' + (idx + 1) + '</span>' +
                '<img class="list-art" src="' + (song.image || '/images/default-art.png') + '" alt="art" onerror="this.src=\'/images/default-art.png\'">' +
                '<div class="list-info">' +
                    '<div class="list-title">' + escHtml(song.title)  + '</div>' +
                    '<div class="list-artist">' + escHtml(song.artist) + '</div>' +
                '</div>' +
                '<span class="list-duration">' + (song.duration || '') + '</span>' +
                '<div class="list-actions">' +
                    '<button type="button" class="list-btn btn-add-one" title="Add to Playlist"><i class="ph ph-plus"></i></button>' +
                    '<button type="button" class="list-btn btn-play-one" title="Play"><i class="ph-fill ph-play"></i></button>' +
                '</div>';

            var playBtn = row.querySelector('.btn-play-one');
            var addBtn = row.querySelector('.btn-add-one');

            playBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                window.sonicPlayer.playSong(song, importedSongs);
            });

            addBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (window.sonicPlaylist) {
                    window.sonicPlaylist.showModal(song);
                }
            });

            row.addEventListener('click', function () {
                window.sonicPlayer.playSong(song, importedSongs);
            });

            container.appendChild(row);
        });
    }

    // ─── Play All ─────────────────────────────────────────────────────────

    function handlePlayAll() {
        if (!importedSongs.length) return;
        window.sonicPlayer.playSong(importedSongs[0], importedSongs);
    }

    // ─── Save Playlist (Bulk) ────────────────────────────────────────────────

    function handleSave() {
        if (!importedSongs.length) {
            alert('Import some songs first before saving.');
            return;
        }
        var name = prompt('Enter a name for this playlist:', 'My Playlist');
        if (!name || !name.trim()) return;

        name = name.trim();
        var key = 'sonic_playlists';
        var stored = {};
        try { stored = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}

        if (stored[name]) {
            var choice = confirm('Playlist "' + name + '" already exists. \n\nClick OK to APPEND these songs, or Cancel to REPLACE the playlist.');
            if (choice) {
                // Append and dedup
                var existingIds = stored[name].map(function(s) { return String(s.id); });
                importedSongs.forEach(function(s) {
                    if (!existingIds.includes(String(s.id))) {
                        stored[name].push(s);
                    }
                });
            } else {
                // Replace
                stored[name] = importedSongs;
            }
        } else {
            stored[name] = importedSongs;
        }

        localStorage.setItem(key, JSON.stringify(stored));
        alert('Saved to Library under "' + name + '"');
    }

    // ─── Utilities ────────────────────────────────────────────────────────

    function showStatus(el, type, msg) {
        if (!el) return;
        el.textContent = msg;
        el.className = 'import-status import-status--' + type;
        el.style.display = 'block';
    }

    function escHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ─── Expose init ─────────────────────────────────────────────────────
    window.initTextImport = init;
    document.addEventListener('DOMContentLoaded', init);

}());
