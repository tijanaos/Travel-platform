package rs.ac.uns.ftn.soa.tours.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record UpdateTourPriceRequest(
        @NotNull
        @DecimalMin(value = "0.0")
        Double price
) {}
