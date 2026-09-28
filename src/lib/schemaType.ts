// Maps a listing's subcategory name to the most specific schema.org
// LocalBusiness subtype available, for the JSON-LD on its detail page
// (src/app/listing/[slug]/page.tsx). Matched by keyword against the
// subcategory names seeded in supabase/migrations/0002_category_hierarchy.sql
// rather than hardcoding every exact name, so a subcategory the admin adds
// later (from /admin/categories) still gets a reasonable type instead of
// silently falling through to the generic default. First match wins, so
// more specific keywords are listed before broader ones (e.g. "dentist"
// before the general "clinic"/"doctor" match).
const RULES: [RegExp, string][] = [
  [/dentist/i, "Dentist"],
  [/hospital/i, "Hospital"],
  [/pharmac|chemist/i, "Pharmacy"],
  [/veterinary|vet\b/i, "VeterinaryCare"],
  [/doctor|clinic|physiotherapy|diagnostic|eye care/i, "MedicalClinic"],
  [/restaurant/i, "Restaurant"],
  [/cafe/i, "CafeOrCoffeeShop"],
  [/bakery/i, "Bakery"],
  [/bar|pub/i, "BarOrPub"],
  [/fast food/i, "FastFoodRestaurant"],
  [/grocery|supermarket/i, "GroceryStore"],
  [/cloth|fashion/i, "ClothingStore"],
  [/footwear|shoe/i, "ShoeStore"],
  [/jewell/i, "JewelryStore"],
  [/electronics/i, "ElectronicsStore"],
  [/mobile/i, "MobilePhoneStore"],
  [/furniture/i, "FurnitureStore"],
  [/stationery|book/i, "BookStore"],
  [/gift|toy/i, "ToyStore"],
  [/optical|eyewear/i, "Optician"],
  [/pet /i, "PetStore"],
  [/sports goods/i, "SportingGoodsStore"],
  [/gym|fitness/i, "ExerciseGym"],
  [/yoga/i, "ExerciseGym"],
  [/school|preschool|daycare/i, "School"],
  [/salon|grooming|beauty/i, "BeautySalon"],
  [/spa\b/i, "DaySpa"],
  [/bank/i, "BankOrCreditUnion"],
  [/lawyer|legal/i, "LegalService"],
  [/real estate|property/i, "RealEstateAgent"],
  [/travel agency/i, "TravelAgency"],
  [/car wash/i, "AutoWash"],
  [/car service|car repair|bike.*service|tyres|battery/i, "AutoRepair"],
  [/car rental/i, "AutoRental"],
  [/driving school/i, "School"],
  [/event|decorator|caterer|wedding|banquet/i, "EventVenue"],
];

export function localBusinessType(subcategoryName: string | null | undefined): string {
  if (!subcategoryName) return "LocalBusiness";
  for (const [pattern, type] of RULES) {
    if (pattern.test(subcategoryName)) return type;
  }
  return "LocalBusiness";
}
