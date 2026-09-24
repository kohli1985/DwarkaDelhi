-- DelhiDwarka: two-level category taxonomy (L1 -> L2), replacing the flat
-- v1 list of 8 categories with the 13-category / ~99-subcategory taxonomy
-- supplied by Gaurav (dwarka_category_master_2_level.csv).
--
-- This WIPES existing listings and categories — done deliberately, by
-- request, because only test data existed under the old flat taxonomy at
-- the time this migration was written. If real listings exist when you run
-- this later, back them up first (this migration does not attempt to
-- remap old categories to new ones).

-- ---------------------------------------------------------------------------
-- 1. Add hierarchy support to categories
-- ---------------------------------------------------------------------------
alter table categories add column if not exists parent_id uuid references categories(id) on delete cascade;
alter table categories add column if not exists level smallint not null default 1;

create index if not exists categories_parent_idx on categories(parent_id);

comment on column categories.parent_id is 'null for an L1 (top-level) category; set to the parent L1''s id for an L2 (subcategory)';
comment on column categories.level is '1 = top-level category, 2 = subcategory';

-- ---------------------------------------------------------------------------
-- 2. Wipe existing test data (listings first — FK from listings.category_id)
-- ---------------------------------------------------------------------------
truncate table listings;
delete from categories;

-- ---------------------------------------------------------------------------
-- 3. Seed L1 categories
-- ---------------------------------------------------------------------------
insert into categories (slug, name, emoji, sort_order, level) values
  ('food-dining', 'Food & Dining', '🍽️', 1, 1),
  ('retail-shopping', 'Retail & Shopping', '🛍️', 2, 1),
  ('healthcare', 'Healthcare', '🩺', 3, 1),
  ('home-repair-services', 'Home & Repair Services', '🔧', 4, 1),
  ('personal-care', 'Personal Care', '💇', 5, 1),
  ('education-kids', 'Education & Kids', '📚', 6, 1),
  ('fitness-sports', 'Fitness & Sports', '🏋️', 7, 1),
  ('professional-business-services', 'Professional & Business Services', '💼', 8, 1),
  ('finance', 'Finance', '🏦', 9, 1),
  ('government-civic', 'Government & Civic', '🏛️', 10, 1),
  ('events-vendors', 'Events & Vendors', '🎉', 11, 1),
  ('automotive-transport', 'Automotive & Transport', '🚗', 12, 1),
  ('pets-animals', 'Pets & Animals', '🐾', 13, 1);

-- ---------------------------------------------------------------------------
-- 4. Seed L2 subcategories, linked to their L1 parent by slug
-- ---------------------------------------------------------------------------
with l2_data (parent_slug, name, sort_order) as (
  values
    ('food-dining', 'Restaurants', 1),
    ('food-dining', 'Cafes', 2),
    ('food-dining', 'Bakeries', 3),
    ('food-dining', 'Sweets & Mithai', 4),
    ('food-dining', 'Fast Food', 5),
    ('food-dining', 'Cloud Kitchens', 6),
    ('food-dining', 'Bars & Pubs', 7),
    ('food-dining', 'Catering', 8),

    ('retail-shopping', 'Grocery & Supermarket', 1),
    ('retail-shopping', 'Fashion & Clothing', 2),
    ('retail-shopping', 'Footwear', 3),
    ('retail-shopping', 'Jewellery', 4),
    ('retail-shopping', 'Electronics', 5),
    ('retail-shopping', 'Mobile & Accessories', 6),
    ('retail-shopping', 'Furniture & Home Decor', 7),
    ('retail-shopping', 'Stationery & Books', 8),
    ('retail-shopping', 'Gifts & Toys', 9),
    ('retail-shopping', 'Optical & Eyewear', 10),
    ('retail-shopping', 'Pet Supplies', 11),
    ('retail-shopping', 'Sports Goods', 12),

    ('healthcare', 'Pharmacy / Chemist', 1),
    ('healthcare', 'Doctor / Clinic', 2),
    ('healthcare', 'Dentist', 3),
    ('healthcare', 'Diagnostic Centre', 4),
    ('healthcare', 'Physiotherapy', 5),
    ('healthcare', 'Eye Care', 6),
    ('healthcare', 'Hospital', 7),
    ('healthcare', 'Veterinary / Pet Clinic', 8),

    ('home-repair-services', 'Electrician', 1),
    ('home-repair-services', 'Plumber', 2),
    ('home-repair-services', 'Carpenter', 3),
    ('home-repair-services', 'AC Repair', 4),
    ('home-repair-services', 'Refrigerator Repair', 5),
    ('home-repair-services', 'Washing Machine Repair', 6),
    ('home-repair-services', 'Appliance Repair', 7),
    ('home-repair-services', 'RO / Water Purifier', 8),
    ('home-repair-services', 'Pest Control', 9),
    ('home-repair-services', 'Cleaning Services', 10),
    ('home-repair-services', 'Packers & Movers', 11),
    ('home-repair-services', 'Interior / Home Improvement', 12),

    ('personal-care', 'Salon', 1),
    ('personal-care', 'Beauty Parlour', 2),
    ('personal-care', 'Spa', 3),
    ('personal-care', 'Men''s Grooming', 4),
    ('personal-care', 'Women''s Salon', 5),
    ('personal-care', 'Makeup Artist', 6),

    ('education-kids', 'School', 1),
    ('education-kids', 'Classes & Tuitions', 2),
    ('education-kids', 'Competitive Exam Coaching', 3),
    ('education-kids', 'Preschool / Daycare', 4),
    ('education-kids', 'Kids Activities', 5),
    ('education-kids', 'Music / Dance Classes', 6),
    ('education-kids', 'Art & Hobby Classes', 7),
    ('education-kids', 'Special Education', 8),

    ('fitness-sports', 'Gym', 1),
    ('fitness-sports', 'Yoga', 2),
    ('fitness-sports', 'Fitness Studio', 3),
    ('fitness-sports', 'Martial Arts', 4),
    ('fitness-sports', 'Sports Academy', 5),
    ('fitness-sports', 'Dance / Fitness', 6),

    ('professional-business-services', 'CA / Accounting', 1),
    ('professional-business-services', 'Lawyers / Legal', 2),
    ('professional-business-services', 'Insurance', 3),
    ('professional-business-services', 'Real Estate / Property', 4),
    ('professional-business-services', 'Travel Agency', 5),
    ('professional-business-services', 'Digital / IT Services', 6),
    ('professional-business-services', 'Printing', 7),
    ('professional-business-services', 'Photography', 8),
    ('professional-business-services', 'Recruitment / HR', 9),
    ('professional-business-services', 'Advertising / Marketing', 10),

    ('finance', 'Banks', 1),
    ('finance', 'ATMs', 2),
    ('finance', 'Insurance', 3),
    ('finance', 'Loans / Financial Services', 4),
    ('finance', 'Investment / Tax Services', 5),

    ('government-civic', 'Government Offices', 1),
    ('government-civic', 'Police', 2),
    ('government-civic', 'Post Office', 3),
    ('government-civic', 'Civic Services', 4),
    ('government-civic', 'Public Utilities', 5),

    ('events-vendors', 'Event Planners', 1),
    ('events-vendors', 'Decorators', 2),
    ('events-vendors', 'Caterers', 3),
    ('events-vendors', 'Wedding Vendors', 4),
    ('events-vendors', 'Photographers', 5),
    ('events-vendors', 'Party Supplies', 6),
    ('events-vendors', 'Banquet Halls', 7),

    ('automotive-transport', 'Car Service / Repair', 1),
    ('automotive-transport', 'Bike / Scooter Service', 2),
    ('automotive-transport', 'Car Wash', 3),
    ('automotive-transport', 'Tyres', 4),
    ('automotive-transport', 'Battery', 5),
    ('automotive-transport', 'Driving School', 6),
    ('automotive-transport', 'Car Rental', 7),
    ('automotive-transport', 'Cab / Transport', 8),

    ('pets-animals', 'Pet Shop', 1),
    ('pets-animals', 'Pet Grooming', 2),
    ('pets-animals', 'Veterinary', 3),
    ('pets-animals', 'Pet Boarding', 4)
)
insert into categories (slug, name, parent_id, level, sort_order)
select
  d.parent_slug || '-' ||
    trim(both '-' from regexp_replace(lower(d.name), '[^a-z0-9]+', '-', 'g')),
  d.name,
  c.id,
  2,
  d.sort_order
from l2_data d
join categories c on c.slug = d.parent_slug;

-- ---------------------------------------------------------------------------
-- 5. Enforce that a listing's category is always a leaf (L2) subcategory,
--    never an L1 top-level category — keeps search filtering and the admin
--    picker's "L1 for browsing, L2 for tagging" model consistent at the DB
--    level, not just in the UI.
-- ---------------------------------------------------------------------------
create or replace function check_listing_category_is_leaf()
returns trigger language plpgsql as $$
declare
  cat_level smallint;
begin
  select level into cat_level from categories where id = new.category_id;
  if cat_level is null then
    raise exception 'category_id % does not exist', new.category_id;
  end if;
  if cat_level <> 2 then
    raise exception 'listings.category_id must reference a subcategory (level 2), not a top-level category (level %)', cat_level;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_category_is_leaf on listings;
create trigger listings_category_is_leaf
  before insert or update of category_id on listings
  for each row execute function check_listing_category_is_leaf();
