package rs.ac.uns.ftn.soa.tours.dto;

import rs.ac.uns.ftn.soa.tours.model.TransportTime;

public record AddTransportTimeRequest(TransportTime.TransportType type, Integer durationMinutes) {}
