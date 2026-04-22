/**
 * library.js — Sonic Library Page (Enhanced v2)
 * Loads saved playlists from localStorage (key: sonic_playlists).
 * Renders playlist cards and a detail view with full management.
 */

(function () {
    'use strict';

    var STORAGE_KEY = 'sonic_playlists';
    var currentPlaylistName = null;
    var currentPlaylistSongs = [];

    function init() {
        var grid = document.getElementById('playlists-grid');
        if (!grid) return; // not on library page

        renderGrid();
    }

    // ─── Load & Render All Playlists ─────────────────────────────────────

    function loadPlaylists() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function savePlaylists(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function renderGrid() {
        var grid    = document.getElementById('playlists-grid');
        var emptyEl = document.getElementById('library-empty');
        if (!grid) return;

        var playlists = loadPlaylists();
        var names = Object.keys(playlists);

        grid.innerHTML = '';

        if (names.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        names.forEach(function (name) {
            var songs  = playlists[name] || [];
            var cover  = (songs.length > 0 && songs[0].image) ? songs[0].image : '/images/default-art.png';

            var card = document.createElement('div');
            card.className = 'media-card library-card';
            card.innerHTML =
                '<div class="media-art-wrapper">' +
                    '<img class="media-art" src="' + escHtml(cover) + '" alt="cover" onerror="this.src=\'/images/default-art.png\'">' +
                    '<div class="media-gradient">' +
                        '<button type="button" class="media-play-btn lib-quick-play" title="Play All"><i class="ph-fill ph-play"></i></button>' +
                    '</div>' +
                '</div>' +
                '<div class="media-info">' +
                    '<div class="media-title">' + escHtml(name) + '</div>' +
                    '<div class="media-artist">' + songs.length + ' tracks</div>' +
                '</div>';

            // Quick play button
            card.querySelector('.lib-quick-play').addEventListener('click', function (e) {
                e.stopPropagation();
                if (songs.length > 0) window.sonicPlayer.playSong(songs[0], songs);
            });

            // Click card → open detail
            card.addEventListener('click', function () {
                openDetail(name, songs);
            });

            grid.appendChild(card);
        });
    }

    // ─── Detail View ──────────────────────────────────────────────────────

    function openDetail(name, songs) {
        currentPlaylistName  = name;
        currentPlaylistSongs = songs;

        var detail   = document.getElementById('playlist-detail');
        var titleEl  = document.getElementById('detail-playlist-title');
        var listEl   = document.getElementById('detail-tracks-list');
        var countEl  = document.getElementById('detail-track-count');

        if (!detail) return;

        if (titleEl) titleEl.textContent = name;
        if (countEl) countEl.textContent = songs.length + ' tracks';

        renderDetailSongs(songs, listEl);
        detail.style.display = 'block';
        detail.scrollIntoView({ behavior: 'smooth' });

        // Wire detail buttons
        var btnPlayAll = document.getElementById('detail-btn-play-all');
        var btnShuffle = document.getElementById('detail-btn-shuffle');
        var btnDelete  = document.getElementById('detail-btn-delete');
        var btnBack    = document.getElementById('detail-btn-back');

        if (btnPlayAll) {
            btnPlayAll.onclick = function () {
                if (songs.length > 0) window.sonicPlayer.playSong(songs[0], songs);
            };
        }
        if (btnShuffle) {
            btnShuffle.onclick = function () {
                if (songs.length > 0) {
                    var shuffled = [].concat(songs).sort(function() { return 0.5 - Math.random(); });
                    window.sonicPlayer.playSong(shuffled[0], shuffled);
                }
            };
        }
        if (btnDelete) {
            btnDelete.onclick = function () {
                if (!confirm('Delete playlist "' + name + '"?')) return;
                var data = loadPlaylists();
                delete data[name];
                savePlaylists(data);
                detail.style.display = 'none';
                renderGrid();
            };
        }
        if (btnBack) {
            btnBack.onclick = function () {
                detail.style.display = 'none';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        }
    }

    function renderDetailSongs(songs, container) {
        if (!container) return;
        container.innerHTML = '';

        if (songs.length === 0) {
            container.innerHTML = '<p class="empty-list-text">No tracks in this playlist.</p>';
            return;
        }

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
                    '<button type="button" class="list-btn btn-remove-track" title="Remove"><i class="ph ph-trash"></i></button>' +
                    '<button type="button" class="list-btn btn-play-track" title="Play"><i class="ph-fill ph-play"></i></button>' +
                '</div>';

            var playBtn = row.querySelector('.btn-play-track');
            var removeBtn = row.querySelector('.btn-remove-track');

            playBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                window.sonicPlayer.playSong(song, songs);
            });

            removeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                removeTrack(idx);
            });

            row.addEventListener('click', function () {
                window.sonicPlayer.playSong(song, songs);
            });

            container.appendChild(row);
        });
    }

    function removeTrack(index) {
        if (currentPlaylistName === null) return;
        
        var data = loadPlaylists();
        var playlist = data[currentPlaylistName];
        
        if (!playlist) return;
        
        playlist.splice(index, 1);
        data[currentPlaylistName] = playlist;
        savePlaylists(data);
        
        // Refresh view
        currentPlaylistSongs = playlist;
        var listEl = document.getElementById('detail-tracks-list');
        var countEl = document.getElementById('detail-track-count');
        if (countEl) countEl.textContent = playlist.length + ' tracks';
        renderDetailSongs(playlist, listEl);
        
        // Refresh grid in background
        renderGrid();
    }

    // ─── Utilities ────────────────────────────────────────────────────────

    function escHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ─── Expose init ─────────────────────────────────────────────────────
    window.initLibrary = init;
    document.addEventListener('DOMContentLoaded', init);

}());
