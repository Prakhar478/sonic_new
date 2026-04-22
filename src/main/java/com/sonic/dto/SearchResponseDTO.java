package com.sonic.dto;

import java.util.List;

public class SearchResponseDTO {
    private List<SongDTO> results;

    public SearchResponseDTO() {}

    public SearchResponseDTO(List<SongDTO> results) {
        this.results = results;
    }

    public List<SongDTO> getResults() { return results; }
    public void setResults(List<SongDTO> results) { this.results = results; }
}
