-- DelhiDwarka: pre-fill sector coordinates from public sources, where
-- available, so you don't have to look every one up by hand.
--
-- Sources (checked 2026-09-23):
--  - Sectors 8, 9, 10, 11, 12, 13, 14, 21: Delhi Metro station coordinates,
--    Wikipedia (e.g. https://en.wikipedia.org/wiki/Dwarka_Sector_10_metro_station)
--  - Sectors 1, 4, 7, 18, 19, 23: geocoded locality coordinates from
--    findlatitudeandlongitude.com
--
-- Only fills a sector when it EXISTS in your table and has no coordinates
-- yet (latitude is null) — never overwrites anything you've already set
-- from /admin/sectors, whether manually or via the CSV importer.
--
-- Sectors 5 and 6 are NOT included here: no reliably-sourced coordinate
-- was found for either (searched Wikipedia, findlatitudeandlongitude.com,
-- 99acres, Square Yards). Rather than guess, fill those two in yourself
-- from /admin/sectors — Google Maps → right-click the sector's rough
-- centre → the lat/lng shown at the top of the context menu, ~10 seconds
-- each. Any other sector not listed below needs the same manual step.

update sectors set latitude = 28.594125, longitude = 77.073911 where id = 1  and latitude is null;
update sectors set latitude = 28.602920, longitude = 77.049250 where id = 4  and latitude is null;
update sectors set latitude = 28.584292, longitude = 77.071556 where id = 7  and latitude is null;
update sectors set latitude = 28.565620, longitude = 77.067030 where id = 8  and latitude is null;
update sectors set latitude = 28.574300, longitude = 77.065200 where id = 9  and latitude is null;
update sectors set latitude = 28.581099, longitude = 77.057422 where id = 10 and latitude is null;
update sectors set latitude = 28.586500, longitude = 77.049400 where id = 11 and latitude is null;
update sectors set latitude = 28.592303, longitude = 77.040682 where id = 12 and latitude is null;
update sectors set latitude = 28.597124, longitude = 77.033374 where id = 13 and latitude is null;
update sectors set latitude = 28.602300, longitude = 77.026000 where id = 14 and latitude is null;
update sectors set latitude = 28.587197, longitude = 77.034857 where id = 18 and latitude is null;
update sectors set latitude = 28.579390, longitude = 77.045268 where id = 19 and latitude is null;
update sectors set latitude = 28.552349, longitude = 77.058065 where id = 21 and latitude is null;
update sectors set latitude = 28.564927, longitude = 77.058425 where id = 23 and latitude is null;
