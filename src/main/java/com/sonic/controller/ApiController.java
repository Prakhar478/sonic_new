package com.sonic.controller;

import com.sonic.dto.SearchResponseDTO;
import com.sonic.dto.SongDTO;
import com.sonic.service.ImportService;
import com.sonic.service.SaavnService;
import com.sonic.service.YouTubeLinkImportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final SaavnService saavnService;
    private final ImportService importService;
    private final YouTubeLinkImportService youtubeLinkImportService;

    public ApiController(SaavnService saavnService,
                         ImportService importService,
                         YouTubeLinkImportService youtubeLinkImportService) {
        this.saavnService = saavnService;
        this.importService = importService;
        this.youtubeLinkImportService = youtubeLinkImportService;
    }

    @GetMapping("/search")
    public ResponseEntity<SearchResponseDTO> search(
            @RequestParam(name = "q", defaultValue = "") String query) {
        if (query.trim().isEmpty()) {
            return ResponseEntity.ok(new SearchResponseDTO(List.of()));
        }
        return ResponseEntity.ok(new SearchResponseDTO(saavnService.searchSongs(query)));
    }

    @GetMapping("/trending")
    public ResponseEntity<SearchResponseDTO> trending() {
        return ResponseEntity.ok(new SearchResponseDTO(saavnService.getTrending()));
    }

    @GetMapping("/song/{id}")
    public ResponseEntity<SongDTO> getSong(@PathVariable String id) {
        SongDTO song = saavnService.getSongDetails(id);
        return song != null ? ResponseEntity.ok(song) : ResponseEntity.notFound().build();
    }

    /** Text-based playlist import — accepts a JSON array of raw title strings */
    @PostMapping("/import/text")
    public ResponseEntity<?> importText(@RequestBody List<String> lines) {
        try {
            return ResponseEntity.ok(importService.importFromText(lines));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * YouTube playlist link import.
     * Body: { "url": "https://www.youtube.com/playlist?list=..." }
     * Returns List<SongDTO> on success, or an error map on failure.
     */
    @PostMapping("/import/youtube-link")
    public ResponseEntity<?> importYouTubeLink(@RequestBody Map<String, String> body) {
        try {
            String url = body.getOrDefault("url", "").trim();
            if (url.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        Map.of("error", "No URL provided."));
            }

            List<SongDTO> songs = youtubeLinkImportService.importFromYouTubeLink(url);

            if (songs.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Could not automatically read this YouTube playlist. " +
                                   "Paste the track titles one per line instead."));
            }

            return ResponseEntity.ok(Map.of("success", true, "songs", songs));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
