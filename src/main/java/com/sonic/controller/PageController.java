package com.sonic.controller;

import com.sonic.dto.SongDTO;
import com.sonic.service.SaavnService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Controller
public class PageController {

    private final SaavnService saavnService;

    public PageController(SaavnService saavnService) {
        this.saavnService = saavnService;
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("currentPage", "home");
        List<SongDTO> trending = saavnService.getTrending();
        model.addAttribute("trending", trending);
        return "index";
    }

    @GetMapping("/search")
    public String search(@RequestParam(name = "q", required = false) String query, Model model) {
        model.addAttribute("currentPage", "search");
        if (query != null && !query.trim().isEmpty()) {
            List<SongDTO> results = saavnService.searchSongs(query);
            model.addAttribute("results", results);
            model.addAttribute("query", query);
        }
        return "search";
    }

    @GetMapping("/song/{id}")
    public String songDetail(@PathVariable String id, Model model) {
        model.addAttribute("currentPage", "song");
        SongDTO song = saavnService.getSongDetails(id);
        if (song == null) {
            return "redirect:/"; // Or a custom 404 page
        }
        model.addAttribute("song", song);
        return "song";
    }

    @GetMapping("/youtube")
    public String importPlaylist(Model model) {
        model.addAttribute("currentPage", "youtube");
        return "youtube";
    }

    @GetMapping("/library")
    public String library(Model model) {
        model.addAttribute("currentPage", "library");
        return "library";
    }
}
