// import.js - Handles Text-based Playlist Import

document.addEventListener('DOMContentLoaded', () => {
    initTextImport();
});

function initTextImport() {
    const importBtn = document.getElementById('btn-import');
    const inputArea = document.getElementById('text-playlist-input');
    const statusMsg = document.getElementById('import-status');
    const playlistArea = document.getElementById('imported-playlist-area');
    const tracksList = document.getElementById('imported-tracks-list');
    const titleDisplay = document.getElementById('imported-title');

    if (!importBtn) return;

    importBtn.addEventListener('click', async () => {
        const text = inputArea.value;
        if (!text || text.trim() === '') {
            alert("Please paste some songs first.");
            return;
        }

        const lines = text.split('\n')
                          .map(line => line.trim())
                          .filter(line => line.length > 0);

        if (lines.length === 0) {
            alert("No valid lines found.");
            return;
        }

        statusMsg.style.display = 'block';
        playlistArea.style.display = 'none';
        importBtn.disabled = true;

        try {
            const response = await fetch('/api/import/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(lines)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Import failed");
            }

            const songs = await response.json(); // List<SongDTO>
            
            if (songs && songs.length > 0) {
                renderImportedPlaylist("Imported Playlist", songs, tracksList, titleDisplay);
                playlistArea.style.display = 'block';
                inputArea.value = ''; // clear textarea on success
            } else {
                alert("No matchable songs found from the provided text. Please try refining the titles.");
            }

        } catch (error) {
            console.error(error);
            alert("Error importing playlist: " + error.message);
        } finally {
            statusMsg.style.display = 'none';
            importBtn.disabled = false;
        }
    });
}

function renderImportedPlaylist(name, songs, container, titleEl) {
    titleEl.textContent = name;
    container.innerHTML = '';

    window.currentImportedPlaylist = songs;

    songs.forEach(song => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        const imgUrl = song.image || '/images/default-art.png';
        
        item.innerHTML = `
            <img src="${imgUrl}" class="list-art" alt="Cover">
            <div class="list-info">
                <div class="list-title pixel-font">${song.title}</div>
                <div class="list-artist">${song.artist}</div>
            </div>
            <button class="list-play-btn"
                    data-id="${song.id}" data-title="${song.title}" 
                    data-artist="${song.artist}" data-image="${song.image}" 
                    data-url="${song.downloadUrl}">
                <i class="ph-fill ph-play"></i>
            </button>
        `;

        item.addEventListener('click', () => {
            const btn = item.querySelector('.list-play-btn');
            window.playSongFromDetail(btn);
        });

        const btn = item.querySelector('.list-play-btn');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.playSongFromDetail(btn);
        });

        container.appendChild(item);
    });

    const playAllBtn = document.getElementById('btn-play-all');
    if (playAllBtn) {
        playAllBtn.onclick = () => {
            if (window.currentImportedPlaylist && window.currentImportedPlaylist.length > 0) {
                const first = window.currentImportedPlaylist[0];
                const pseudoBtn = document.createElement('button');
                pseudoBtn.dataset.id = first.id;
                pseudoBtn.dataset.title = first.title;
                pseudoBtn.dataset.artist = first.artist;
                pseudoBtn.dataset.image = first.image;
                pseudoBtn.dataset.url = first.downloadUrl;
                window.playSongFromDetail(pseudoBtn);
            }
        };
    }
}
