package com.sonic.service;

import com.sonic.dto.SongDTO;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * YouTubeLinkImportService
 * Fetches a public YouTube playlist page, extracts video titles from the
 * embedded ytInitialData JSON blob (no API key required), then maps each
 * title to a Saavn track via SaavnService.
 */
@Service
public class YouTubeLinkImportService {

    private final SaavnService saavnService;
    private final ImportService importService;

    public YouTubeLinkImportService(SaavnService saavnService, ImportService importService) {
        this.saavnService = saavnService;
        this.importService = importService;
    }

    /**
     * Extract playlist ID from a YouTube URL.
     * Supports both full URLs and raw IDs.
     */
    public String extractPlaylistId(String url) {
        if (url == null || url.isBlank()) return null;

        // Already a raw ID (no slashes, no dots)
        if (!url.contains("/") && !url.contains(".")) return url.trim();

        // ?list=XXXX or &list=XXXX
        Pattern p = Pattern.compile("[?&]list=([^&\\s#]+)");
        Matcher m = p.matcher(url);
        if (m.find()) return m.group(1);

        return null;
    }

    /**
     * Main entry point.
     * Returns empty list if playlist cannot be read — caller handles messaging.
     */
    public List<SongDTO> importFromYouTubeLink(String url) {
        String playlistId = extractPlaylistId(url);
        if (playlistId == null || playlistId.isBlank()) {
            return List.of();
        }

        List<String> titles = fetchTitlesFromPlaylistPage(playlistId);
        if (titles.isEmpty()) {
            return List.of();
        }

        // Reuse the existing ImportService title-cleaning + Saavn matching
        return importService.importFromText(titles);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private List<String> fetchTitlesFromPlaylistPage(String playlistId) {
        String pageUrl = "https://www.youtube.com/playlist?list=" + playlistId;

        try {
            HttpClient client = HttpClient.newBuilder()
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(pageUrl))
                    // Mimic a real browser enough to get the full page
                    .header("User-Agent",
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                            "AppleWebKit/537.36 (KHTML, like Gecko) " +
                            "Chrome/124.0.0.0 Safari/537.36")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.out.println("[YT Import] HTTP " + response.statusCode() + " for playlist " + playlistId);
                return List.of();
            }

            return parseTitlesFromPage(response.body());

        } catch (IOException | InterruptedException e) {
            System.out.println("[YT Import] Failed to fetch playlist page: " + e.getMessage());
            return List.of();
        }
    }

    /**
     * Extract video titles from YouTube's embedded ytInitialData JSON.
     * YouTube embeds JSON in a <script> tag as:
     *   var ytInitialData = { ... };
     * We extract the raw JSON then use regex to find all title "text" values
     * inside playlistVideoRenderer objects.
     */
    private List<String> parseTitlesFromPage(String html) {
        List<String> titles = new ArrayList<>();

        // Find the ytInitialData JSON blob
        int start = html.indexOf("var ytInitialData = ");
        if (start == -1) {
            start = html.indexOf("ytInitialData =");
            if (start == -1) {
                System.out.println("[YT Import] ytInitialData not found in page");
                return titles;
            }
        }

        // Find the opening brace
        int braceStart = html.indexOf('{', start);
        if (braceStart == -1) return titles;

        // Find the matching closing brace
        int braceEnd = findMatchingBrace(html, braceStart);
        if (braceEnd == -1) {
            // Fallback: take a large chunk and let regex do its best
            braceEnd = Math.min(braceStart + 500_000, html.length());
        }

        String json = html.substring(braceStart, braceEnd);

        // Pattern: "playlistVideoRenderer":{... "title":{"runs":[{"text":"TITLE HERE"...
        // We use a simpler approach: find all occurrences of the title pattern
        // near playlistVideoRenderer markers.
        Pattern titlePattern = Pattern.compile(
            "\"playlistVideoRenderer\":\\{.*?\"title\":\\{\"runs\":\\[\\{\"text\":\"(.*?)\"",
            Pattern.DOTALL
        );

        Matcher m = titlePattern.matcher(json);
        int count = 0;
        while (m.find() && count < 50) {
            String raw = m.group(1);
            // Unescape common JSON escapes
            raw = raw.replace("\\u0026", "&")
                     .replace("\\u003c", "<")
                     .replace("\\u003e", ">")
                     .replace("\\'", "'")
                     .replace("\\\"", "\"")
                     .replace("\\\\", "\\")
                     .replace("\\n", " ")
                     .trim();

            if (!raw.isBlank() && !raw.equalsIgnoreCase("[Deleted video]")
                    && !raw.equalsIgnoreCase("[Private video]")) {
                titles.add(raw);
                count++;
            }
        }

        System.out.println("[YT Import] Extracted " + titles.size() + " titles from playlist page.");
        return titles;
    }

    /** Simple brace-matching to isolate the JSON object. */
    private int findMatchingBrace(String s, int openPos) {
        int depth = 0;
        boolean inString = false;
        boolean escape = false;
        int limit = Math.min(openPos + 2_000_000, s.length());

        for (int i = openPos; i < limit; i++) {
            char c = s.charAt(i);
            if (escape) { escape = false; continue; }
            if (c == '\\' && inString) { escape = true; continue; }
            if (c == '"') { inString = !inString; continue; }
            if (inString) continue;
            if (c == '{') depth++;
            else if (c == '}') {
                depth--;
                if (depth == 0) return i + 1;
            }
        }
        return -1;
    }
}
