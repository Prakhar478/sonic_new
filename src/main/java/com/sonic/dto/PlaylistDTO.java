package com.sonic.dto;

import java.util.List;

public class PlaylistDTO {
    private String name;
    private List<SongDTO> songs;

    public PlaylistDTO() {}

    public PlaylistDTO(String name, List<SongDTO> songs) {
        this.name = name;
        this.songs = songs;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public List<SongDTO> getSongs() { return songs; }
    public void setSongs(List<SongDTO> songs) { this.songs = songs; }
}
