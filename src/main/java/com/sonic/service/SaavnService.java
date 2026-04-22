package com.sonic.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.sonic.dto.SongDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class SaavnService {

    @Value("${saavn.api.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate;

    public SaavnService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<SongDTO> searchSongs(String query) {
        try {
            String url = baseUrl + "/api/search/songs?query=" + query;
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            return parseSongs(response.getBody());
        } catch (Exception e) {
            System.err.println("Error searching songs: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public List<SongDTO> getTrending() {
        try {
            String url = baseUrl + "/api/search/songs?query=top+hits";
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            return parseSongs(response.getBody());
        } catch (Exception e) {
            System.err.println("Error fetching trending/fallback: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public SongDTO getSongDetails(String id) {
        try {
            String url = baseUrl + "/api/songs/" + id;
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            JsonNode body = response.getBody();
            if (body != null) {
                JsonNode data = body.has("data") ? body.get("data") : body;
                if (data.isArray() && data.size() > 0) {
                    return parseSongNode(data.get(0));
                } else if (data.isObject() && data.has("id")) {
                    return parseSongNode(data);
                }
            }
        } catch (Exception e) {
            System.err.println("Error getting song details for ID " + id + ": " + e.getMessage());
        }
        return null;
    }

    private List<SongDTO> parseSongs(JsonNode root) {
        List<SongDTO> songs = new ArrayList<>();
        if (root == null) return songs;
        
        JsonNode dataNode = root.has("data") ? root.get("data") : root;
        JsonNode resultsNode = dataNode.has("results") ? dataNode.get("results") : dataNode;

        if (resultsNode.isArray()) {
            for (JsonNode node : resultsNode) {
                songs.add(parseSongNode(node));
            }
        }
        return songs;
    }

    private SongDTO parseSongNode(JsonNode node) {
        SongDTO song = new SongDTO();
        song.setId(node.has("id") ? node.get("id").asText() : "");
        
        // 1. Title Fallbacks
        String title = "";
        if (node.has("title")) title = node.get("title").asText();
        else if (node.has("name")) title = node.get("name").asText();
        
        title = cleanString(title);
        song.setTitle(title.isEmpty() ? "Untitled Track" : title);
        
        // 2. Artist Fallbacks (Extensive cascade)
        String artist = "";
        if (node.has("primaryArtists") && !node.get("primaryArtists").asText().trim().isEmpty()) {
            artist = node.get("primaryArtists").asText();
        } else if (node.has("artists") && node.get("artists").has("primary")) {
             JsonNode pNode = node.get("artists").get("primary");
             if (pNode.isArray() && pNode.size() > 0 && pNode.get(0).has("name")) {
                 artist = pNode.get(0).get("name").asText();
             }
        } else if (node.has("singers") && !node.get("singers").asText().trim().isEmpty()) {
            artist = node.get("singers").asText();
        } else if (node.has("artist") && !node.get("artist").asText().trim().isEmpty()) {
            artist = node.get("artist").asText();
        } else if (node.has("subtitle") && !node.get("subtitle").asText().trim().isEmpty()) {
            artist = node.get("subtitle").asText();
        } else if (node.has("album") && node.get("album").isObject() && node.get("album").has("artist") && !node.get("album").get("artist").asText().trim().isEmpty()) {
            artist = node.get("album").get("artist").asText();
        }
        
        artist = cleanString(artist);
        song.setArtist(artist.isEmpty() ? "" : artist); // Use empty string instead of Unknown Artist for cleaner UI

        // 3. Album Fallbacks
        String album = "";
        if (node.has("album")) {
            JsonNode albumNode = node.get("album");
            if (albumNode.isObject() && albumNode.has("name")) {
                album = albumNode.get("name").asText();
            } else if (albumNode.isTextual()) {
                album = albumNode.asText();
            }
        }
        album = cleanString(album);
        song.setAlbum(album.isEmpty() ? "Single" : album);

        // 4. Duration
        if (node.has("duration")) {
            song.setDuration(node.get("duration").asText());
        } else {
            song.setDuration("0");
        }

        // 5. Image Fallback
        if (node.has("image")) {
            song.setImage(extractHighestQualityLink(node.get("image")));
        } else {
            song.setImage("");
        }

        // 6. Download URL
        if (node.has("downloadUrl")) {
            song.setDownloadUrl(extractHighestQualityLink(node.get("downloadUrl")));
        } else if (node.has("media_url")) {
            song.setDownloadUrl(node.get("media_url").asText());
        } else {
             song.setDownloadUrl("");
        }

        return song;
    }

    private String extractHighestQualityLink(JsonNode node) {
        if (node == null) return "";
        if (node.isTextual()) {
            return node.asText().replace("&quot;", "");
        }
        if (node.isArray() && node.size() > 0) {
            JsonNode lastItem = node.get(node.size() - 1);
            if (lastItem.isObject()) {
                if (lastItem.has("link")) return lastItem.get("link").asText();
                if (lastItem.has("url")) return lastItem.get("url").asText();
            } else if (lastItem.isTextual()) {
                return lastItem.asText();
            }
        }
        return "";
    }

    private String cleanString(String input) {
        if (input == null) return "";
        return input.replace("&quot;", "\"")
                    .replace("&amp;", "&")
                    .replace("&#039;", "'")
                    .trim();
    }
}
