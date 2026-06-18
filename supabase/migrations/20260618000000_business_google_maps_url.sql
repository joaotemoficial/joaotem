-- Adds an optional Google Maps place URL to businesses. The owner pastes a full
-- Maps "place" link; the app derives a turn-by-turn directions deep link from it.
alter table public.businesses
  add column google_maps_url text
  check (google_maps_url is null or char_length(google_maps_url) <= 2000);
