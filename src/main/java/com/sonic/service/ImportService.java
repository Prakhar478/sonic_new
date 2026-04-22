package com.sonic.service;

import com.sonic.dto.SongDTO;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ImportService {

    private final SaavnService saavnService;

    public ImportService(SaavnService saavnService) {
        this.saavnService = saavnService;
    }

    public List<SongDTO> importFromText(List<String> rawLines) {
        List<SongDTO> matchedSongs = new ArrayList<>();

        if (rawLines == null || rawLines.isEmpty()) {
            return matchedSongs;
        }

        int limit = Math.min(rawLines.size(), 50);

        for (int i = 0; i < limit; i++) {
            String rawLine = rawLines.get(i);
            if (rawLine == null || rawLine.trim().isEmpty()) {
                continue;
            }

            String cleanedTitle = cleanTitle(rawLine);
            if (cleanedTitle.isEmpty()) continue;

            List<SongDTO> saavnResults = saavnService.searchSongs(cleanedTitle);
            if (!saavnResults.isEmpty()) {
                for (SongDTO s : saavnResults) {
                    if (s.getDownloadUrl() != null && !s.getDownloadUrl().trim().isEmpty() 
                        && s.getTitle() != null && !s.getTitle().equalsIgnoreCase("Untitled Track")) {
                        matchedSongs.add(s);
                        break;
                    }
                }
            }
        }

        return matchedSongs;
    }

    private String cleanTitle(String title) {
        String cleaned = title.toLowerCase();
        
        cleaned = cleaned.replaceAll("\\(.*?\\)", " ");
        cleaned = cleaned.replaceAll("\\[.*?\\]", " ");
        cleaned = cleaned.replaceAll("\\{.*?\\}", " ");
        
        String[] wordsToRemove = {
            "official music video", "official lyric video", "official video",
            "official audio", "lyric video", "lyrics", "hd", "4k", "hq", "audio", "video", "full song"
        };
        
        for (String word : wordsToRemove) {
            cleaned = cleaned.replace(word, " ");
        }
        
        cleaned = cleaned.replace("-", " ").replace("|", " ").replace("\"", " ").replace("'", " ");
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        
        return cleaned;
    }
}
