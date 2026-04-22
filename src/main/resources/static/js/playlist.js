/**
 * playlist.js — Sonic Playlist Modal & Management
 * Handles showing the modal, creating playlists, and adding songs.
 */

(function () {
    'use strict';

    var STORAGE_KEY = 'sonic_playlists';
    var currentSongToSave = null;

    function init() {
        var modal = document.getElementById('playlist-modal');
        var closeBtn = document.getElementById('close-playlist-modal');
        var createBtn = document.getElementById('btn-create-playlist');

        if (!modal) return;

        closeBtn.addEventListener('click', hideModal);
        createBtn.addEventListener('click', createAndAdd);

        // Global click handler to close modal on overlay click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) hideModal();
        });

        // Initialize any "Add to Playlist" buttons already on the page
        bindAddButtons();
    }

    function bindAddButtons() {
        document.querySelectorAll('.btn-add-playlist').forEach(function(btn) {
            btn.onclick = function(e) {
                e.stopPropagation();
                var song = {
                    id: btn.getAttribute('data-id'),
                    title: btn.getAttribute('data-title'),
                    artist: btn.getAttribute('data-artist'),
                    album: btn.getAttribute('data-album'),
                    image: btn.getAttribute('data-image'),
                    duration: btn.getAttribute('data-duration'),
                    downloadUrl: btn.getAttribute('data-url')
                };
                showModal(song);
            };
        });
    }

    function showModal(song) {
        currentSongToSave = song;
        var modal = document.getElementById('playlist-modal');
        var list = document.getElementById('modal-existing-playlists');
        
        if (!modal || !list) return;

        // Load and render existing playlists
        var playlists = _loadPlaylists();
        var names = Object.keys(playlists);

        list.innerHTML = '';
        if (names.length === 0) {
            list.innerHTML = '<p class="modal-empty-text">No playlists yet.</p>';
        } else {
            names.forEach(function(name) {
                var item = document.createElement('div');
                item.className = 'modal-playlist-item';
                item.innerHTML = '<span>' + _esc(name) + '</span><span class="count">' + playlists[name].length + ' tracks</span>';
                item.onclick = function() {
                    addToPlaylist(name);
                };
                list.appendChild(item);
            });
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function hideModal() {
        var modal = document.getElementById('playlist-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        currentSongToSave = null;
        var nameInput = document.getElementById('new-playlist-name');
        if (nameInput) nameInput.value = '';
    }

    function addToPlaylist(name) {
        if (!currentSongToSave) return;

        var playlists = _loadPlaylists();
        if (!playlists[name]) playlists[name] = [];

        // Check for duplicates
        var exists = playlists[name].some(function(s) {
            return String(s.id) === String(currentSongToSave.id);
        });

        if (exists) {
            alert('Song already in playlist "' + name + '"');
            return;
        }

        playlists[name].push(currentSongToSave);
        _savePlaylists(playlists);
        
        alert('Added to "' + name + '"');
        hideModal();
    }

    function createAndAdd() {
        var input = document.getElementById('new-playlist-name');
        var name = input ? input.value.trim() : '';
        
        if (!name) return;
        
        var playlists = _loadPlaylists();
        if (playlists[name]) {
            alert('A playlist with this name already exists.');
            return;
        }

        addToPlaylist(name);
    }

    // ─── LocalStorage Helpers ─────────────────────────────────────────────

    function _loadPlaylists() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function _savePlaylists(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function _esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ─── Expose Globals ───────────────────────────────────────────────────

    window.sonicPlaylist = {
        init: init,
        showModal: showModal,
        hideModal: hideModal,
        bindAddButtons: bindAddButtons
    };

    document.addEventListener('DOMContentLoaded', init);

}());
