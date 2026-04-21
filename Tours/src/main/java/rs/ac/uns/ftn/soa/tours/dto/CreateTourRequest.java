package rs.ac.uns.ftn.soa.tours.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import rs.ac.uns.ftn.soa.tours.model.Tour.Difficulty;

import java.util.List;

public record CreateTourRequest(
        @NotBlank String name,
        String description,
        @NotNull Difficulty difficulty,
        List<String> tags
) {}
