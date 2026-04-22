/**
 * player.js — Sonic Global Music Player v3
 *
 * Fixed queue logic:
 *  - All matching uses song.id (string comparison), never object reference
 *  - next/prev/shuffle all work correctly
 *  - audio.onended → nextSong (autoplay)
 *  - Global wrappers exposed for onclick= in Thymeleaf templates
 */

(function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────
    var _audio = new Audio();
    var _queue = [];      // Array of SongDTO-like objects
    var _currentIndex = -1;
    var _isShuffle = false;
    var _isPlaying = false;

    // ── DOM refs (re-resolved on each call so they survive page init order)
    function el(id) { return document.getElementById(id); }

    // ── Audio wiring ──────────────────────────────────────────────────────
    _audio.addEventListener('timeupdate', function () {
        var seek = el('player-seek');
        var curr = el('player-current-time');
        if (!seek || !_audio.duration) return;
        seek.value = (_audio.currentTime / _audio.duration) * 100;
        if (curr) curr.textContent = _fmt(_audio.currentTime);
    });

    _audio.addEventListener('loadedmetadata', function () {
        var tot = el('player-total-time');
        var seek = el('player-seek');
        if (tot) tot.textContent = _fmt(_audio.duration);
        if (seek) { seek.value = 0; seek.max = 100; }
    });

    // ── AUTOPLAY: when a song ends, play next automatically ───────────────
    _audio.addEventListener('ended', function () {
        nextSong();
    });

    _audio.addEventListener('play', function () {
        _isPlaying = true;
        _setPlayIcon(true);
    });

    _audio.addEventListener('pause', function () {
        _isPlaying = false;
        _setPlayIcon(false);
    });

    // ── Core API ──────────────────────────────────────────────────────────

    /**
     * playSong(song, queue)
     * song  : { id, title, artist, album, image, downloadUrl }
     * queue : optional Array<song> — becomes the active queue
     */
    function playSong(song, queue) {
        if (!song || !song.downloadUrl) {
            console.warn('[Sonic] playSong: missing downloadUrl', song);
            return;
        }

        if (queue && Array.isArray(queue) && queue.length > 0) {
            _queue = queue;
            _currentIndex = _indexById(queue, song.id);
            if (_currentIndex < 0) _currentIndex = 0;
        } else {
            _queue = [song];
            _currentIndex = 0;
        }

        _loadAndPlay();
    }

    function togglePlay() {
        if (_currentIndex < 0 || _queue.length === 0) return;
        if (_audio.paused) {
            _audio.play().catch(function (e) { console.error(e); });
        } else {
            _audio.pause();
        }
    }

    function nextSong() {
        if (_queue.length === 0) return;

        var next;
        if (_isShuffle) {
            if (_queue.length === 1) {
                next = 0;
            } else {
                do { next = Math.floor(Math.random() * _queue.length); }
                while (next === _currentIndex);
            }
        } else {
            next = _currentIndex + 1;
            if (next >= _queue.length) next = 0; // wrap
        }

        _currentIndex = next;
        _loadAndPlay();
    }

    function prevSong() {
        if (_queue.length === 0) return;
        // If >3s in, restart current
        if (_audio.currentTime > 3) {
            _audio.currentTime = 0;
            return;
        }
        _currentIndex = (_currentIndex - 1 + _queue.length) % _queue.length;
        _loadAndPlay();
    }

    function toggleShuffle() {
        _isShuffle = !_isShuffle;
        var btn = el('btn-shuffle');
        if (btn) {
            btn.classList.toggle('active', _isShuffle);
            btn.title = _isShuffle ? 'Shuffle: ON' : 'Shuffle: OFF';
        }
    }

    function setQueue(queue, startIndex) {
        if (!queue || !queue.length) return;
        _queue = queue;
        _currentIndex = (startIndex !== undefined) ? startIndex : 0;
    }

    function getCurrentSong() {
        return _queue[_currentIndex] || null;
    }

    function updatePlayerUI(song) {
        if (!song) return;
        var art = el('player-art');
        var title = el('player-title');
        var artist = el('player-artist');
        if (art) art.src = song.image || '/images/default-art.png';
        if (title) title.textContent = song.title || 'Unknown Track';
        if (artist) artist.textContent = song.artist || '';
        _setPlayIcon(true);
        _updateMediaSession(song);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    function _loadAndPlay() {
        var song = _queue[_currentIndex];
        if (!song) return;

        _audio.src = song.downloadUrl;
        _audio.load();
        _audio.play().catch(function (e) { console.error('[Sonic] Play error:', e); });
        updatePlayerUI(song);

        // Make sure player bar is visible
        var bar = el('sonic-player-bar');
        if (bar) bar.style.display = 'flex';
    }

    function _indexById(arr, id) {
        for (var i = 0; i < arr.length; i++) {
            if (String(arr[i].id) === String(id)) return i;
        }
        return -1;
    }

    function _setPlayIcon(playing) {
        var icon = el('player-play-icon');
        if (!icon) return;
        icon.className = playing ? 'ph-fill ph-pause' : 'ph-fill ph-play';
    }

    function _fmt(s) {
        if (!s || isNaN(s)) return '0:00';
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function _updateMediaSession(song) {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title || '',
            artist: song.artist || '',
            artwork: [{ src: song.image || '/images/default-art.png', sizes: '512x512', type: 'image/jpeg' }]
        });
        navigator.mediaSession.setActionHandler('previoustrack', prevSong);
        navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        navigator.mediaSession.setActionHandler('play', function () { _audio.play(); });
        navigator.mediaSession.setActionHandler('pause', function () { _audio.pause(); });
    }

    // ── Bind DOM controls ─────────────────────────────────────────────────
    function _bindControls() {
        var btnPlay = el('btn-play-pause');
        var btnNext = el('btn-next');
        var btnPrev = el('btn-prev');
        var btnShuffle = el('btn-shuffle');
        var seek = el('player-seek');
        var volume = el('player-volume');

        if (btnPlay) btnPlay.addEventListener('click', togglePlay);
        if (btnNext) btnNext.addEventListener('click', nextSong);
        if (btnPrev) btnPrev.addEventListener('click', prevSong);
        if (btnShuffle) btnShuffle.addEventListener('click', toggleShuffle);

        if (seek) {
            seek.addEventListener('input', function () {
                if (_audio.duration) {
                    _audio.currentTime = (seek.value / 100) * _audio.duration;
                }
            });
        }

        if (volume) {
            volume.value = 80;
            _audio.volume = 0.8;
            volume.addEventListener('input', function () {
                _audio.volume = volume.value / 100;
                var icon = el('player-vol-icon');
                if (!icon) return;
                if (_audio.volume === 0) icon.className = 'ph-fill ph-speaker-none player-vol-icon';
                else if (_audio.volume < 0.5) icon.className = 'ph-fill ph-speaker-low  player-vol-icon';
                else icon.className = 'ph-fill ph-speaker-high player-vol-icon';
            });
        }
    }

    document.addEventListener('DOMContentLoaded', _bindControls);

    // ── Global object + flat wrappers ─────────────────────────────────────
    window.sonicPlayer = {
        playSong: playSong,
        togglePlay: togglePlay,
        nextSong: nextSong,
        prevSong: prevSong,
        toggleShuffle: toggleShuffle,
        setQueue: setQueue,
        updatePlayerUI: updatePlayerUI,
        getCurrentSong: getCurrentSong,
        getQueue: function () { return _queue; },
        getCurrentIndex: function () { return _currentIndex; }
    };

    // Flat globals for Thymeleaf onclick= attributes
    window.playSong = playSong;
    window.togglePlay = togglePlay;
    window.nextSong = nextSong;
    window.prevSong = prevSong;
    window.toggleShuffle = toggleShuffle;

    /**
     * playSongFromBtn(btn)
     * Reads data-* attributes from a button/card element.
     * Passes the best available queue context.
     */
    window.playSongFromBtn = function (btn) {
        var song = {
            id: btn.getAttribute('data-id') || '',
            title: btn.getAttribute('data-title') || 'Unknown',
            artist: btn.getAttribute('data-artist') || '',
            album: btn.getAttribute('data-album') || '',
            image: btn.getAttribute('data-image') || '/images/default-art.png',
            downloadUrl: btn.getAttribute('data-url') || ''
        };
        var ctx = window.__pageQueue || null;
        playSong(song, ctx);
    };

    // Backward compat alias
    window.playSongFromDetail = window.playSongFromBtn;

}());
