const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// Realistic curated images from Unsplash
const IMAGES = {
  // Breakfast & Breads
  dal: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop',
  dal_vegetable: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop',
  vegetable: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop',
  paratha: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop',
  omelete: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&auto=format&fit=crop',

  // Snacks
  singara: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop',
  cutlet: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&auto=format&fit=crop',
  club_sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop',
  chicken_sandwich: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&auto=format&fit=crop',
  chicken_roll: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
  irani_roll: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop',
  patties: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
  shawarma: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&auto=format&fit=crop',
  shawarma_sandwich: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=600&auto=format&fit=crop',
  twister: 'https://images.unsplash.com/photo-1626777553635-be456d6f5c88?w=600&auto=format&fit=crop',
  chicken_chop: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop',
  doner_kebab_roll: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop',
  jilapi: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
  puri: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop',
  pastry: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop',
  chola: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop',

  // Thai / Chinese
  bbq_wings: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop',
  chili_onion: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&auto=format&fit=crop',
  chicken_fry: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&auto=format&fit=crop',
  chinese_veg: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop',
  tandoori: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&auto=format&fit=crop',
  tangri_kebab: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop',
  shashlik: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop',
  szechuan_chicken: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop',
  fried_rice: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop',
  lazu_chicken: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&auto=format&fit=crop',
  boti_kebab: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&auto=format&fit=crop',
  jali_kebab: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&auto=format&fit=crop',
  bbq_chicken: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop',

  // Lunch
  plain_rice: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&auto=format&fit=crop',
  polao: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop',
  khichuri: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop',
  tehari: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop',
  chicken_vuna: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop',
  chicken_roast: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&auto=format&fit=crop',
  egg_korma: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop',
  egg_curry: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop',
  boiled_egg: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop',
  fish: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop',
  thin_dal: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600&auto=format&fit=crop',
  vhorta: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop',

  // Fast Food
  sausage_pizza: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop',
  slice_pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop',
  cheese_burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop',
  bbq_burger: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop',
  noodles: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop',
  meat_loaf: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop',
  hot_dog: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop',
  croissant: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=600&auto=format&fit=crop',

  // Desserts
  firni: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop',
  plain_cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop',
  brownie: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop',
  pudding: 'https://images.unsplash.com/photo-1517427294546-5aa121f68e8a?w=600&auto=format&fit=crop',

  // Drinks
  fresh_juice: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop',
  lassi: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&auto=format&fit=crop',
  soft_drink: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop',
  mineral_water: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop',
  raw_tea: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop',
  milk_tea: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop',
  powder_milk_tea: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop',
  coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop',
  ice_cream: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&auto=format&fit=crop'
};

// Standard 61 items for Khan's Kitchen & Olympia Palace
const standard61Items = [
  // Breakfast
  { name: 'Dal', desc: 'Classic Bengali spiced yellow lentil daal', price: 20.00, img: IMAGES.dal, prep: 3 },
  { name: 'Dal+ Vegetable', desc: 'Comforting combination of yellow lentils with seasonal vegetables', price: 25.00, img: IMAGES.dal_vegetable, prep: 3 },
  { name: 'Vegetable', desc: 'Mixed seasonal vegetables cooked with light cumin and turmeric spices', price: 25.00, img: IMAGES.vegetable, prep: 3 },
  { name: 'Paratha', desc: 'Freshly made hot layered crispy flatbread', price: 10.00, img: IMAGES.paratha, prep: 5 },

  // Light Snacks
  { name: 'Singara', desc: 'Crispy fried triangular pastry packed with spiced potato filling', price: 10.00, img: IMAGES.singara, prep: 3 },
  { name: 'Egg Potato Cutlet', desc: 'Golden crumb-coated spiced egg and potato patty', price: 30.00, img: IMAGES.cutlet, prep: 5 },
  { name: 'Club Sandwich', desc: 'Double-decker toasted sandwich with spiced chicken, egg and creamy sauce', price: 50.00, img: IMAGES.club_sandwich, prep: 8 },
  { name: 'Chicken Sandwich', desc: 'Tender seasoned shredded chicken stuffed in fresh white bread', price: 35.00, img: IMAGES.chicken_sandwich, prep: 6 },
  { name: 'Chicken Roll', desc: 'Crispy pan-fried paratha rolled with seasoned chicken and onions', price: 40.00, img: IMAGES.chicken_roll, prep: 7 },
  { name: 'Irani Roll', desc: 'Flaky pastry roll filled with savory minced chicken and herbs', price: 50.00, img: IMAGES.irani_roll, prep: 7 },
  { name: 'Chicken Patties', desc: 'Bakery fresh golden puff pastry stuffed with chicken mince', price: 40.00, img: IMAGES.patties, prep: 3 },
  { name: 'Chicken Shawarma', desc: 'Soft pita bread wrap loaded with roasted spiced chicken and garlic mayo', price: 60.00, img: IMAGES.shawarma, prep: 8 },
  { name: 'Shawarma Sandwich', desc: 'Toasted bread loaded with signature shawarma chicken and mayo', price: 40.00, img: IMAGES.shawarma_sandwich, prep: 8 },
  { name: 'Twister Shawarma', desc: 'Crispy fried chicken strips wrapped with lettuce, pickles, and sauce', price: 75.00, img: IMAGES.twister, prep: 10 },
  { name: 'Chicken Chop', desc: 'Breaded and deep-fried savory spiced chicken cutlet', price: 40.00, img: IMAGES.chicken_chop, prep: 6 },
  { name: 'Doner Kebab Roll', desc: 'Generous Turkish-style sliced chicken doner roll with special house dressing', price: 125.00, img: IMAGES.doner_kebab_roll, prep: 10 },

  // Thai/ Chinese Food
  { name: 'BBQ Chicken Wings', desc: 'Crispy chicken wings glazed in sticky smoky barbecue sauce', price: 55.00, img: IMAGES.bbq_wings, prep: 12 },
  { name: 'Chicken Chili Onion', desc: 'Indo-Chinese wok chicken tossed with fiery green chilies and onions', price: 60.00, img: IMAGES.chili_onion, prep: 12 },
  { name: 'Chicken Fry', desc: 'Crispy golden spiced fried chicken piece', price: 50.00, img: IMAGES.chicken_fry, prep: 10 },
  { name: 'Chines Vegetable', desc: 'Healthy wok-tossed mixed vegetables in savory clear sauce', price: 40.00, img: IMAGES.chinese_veg, prep: 8 },
  { name: 'Tandoori Chicken', desc: 'Tender chicken quarter marinated in yogurt and traditional tandoori spices', price: 120.00, img: IMAGES.tandoori, prep: 15 },
  { name: 'Tangri Kebab', desc: 'Juicy chicken drumstick roasted with herbs and tandoor spices', price: 70.00, img: IMAGES.tangri_kebab, prep: 14 },
  { name: 'Chicken Shashlik', desc: 'Skewered marinated chicken cubes grilled with capsicum and onions', price: 70.00, img: IMAGES.shashlik, prep: 12 },
  { name: 'Szechuan Chicken(2Pcs)', desc: 'Two pieces of chicken cooked in spicy authentic Szechuan sauce', price: 70.00, img: IMAGES.szechuan_chicken, prep: 12 },
  { name: 'Egg Fried Rice', desc: 'Classic wok-fried rice with scrambled eggs, scallions and green peas', price: 45.00, img: IMAGES.fried_rice, prep: 10 },
  { name: 'Lazu Chicken', desc: 'Crispy chicken chunks stir-fried with fragrant dried red chilies', price: 80.00, img: IMAGES.lazu_chicken, prep: 14 },
  { name: 'Boti Kebab', desc: 'Tender boneless meat cubes grilled over charcoal with royal spices', price: 100.00, img: IMAGES.boti_kebab, prep: 15 },
  { name: 'Jali Kebab', desc: 'Minced meat patty coated in delicate lacy egg batter and shallow fried', price: 40.00, img: IMAGES.jali_kebab, prep: 8 },
  { name: 'BBQ Chicken', desc: 'Succulent barbecue grilled chicken piece basted in smokey sauce', price: 90.00, img: IMAGES.bbq_chicken, prep: 15 },

  // Lunch
  { name: 'Plain Rice', desc: 'Warm and fluffy freshly steamed aromatic white rice', price: 25.00, img: IMAGES.plain_rice, prep: 3 },
  { name: 'Polao', desc: 'Fragrant Chinigura rice ghee polao cooked with cardamoms and cloves', price: 45.00, img: IMAGES.polao, prep: 4 },
  { name: 'Khichuri', desc: 'Comforting bhuna khichuri slow-cooked with aromatic rice and lentils', price: 40.00, img: IMAGES.khichuri, prep: 4 },
  { name: 'Chicken Tehari', desc: 'Authentic Old Dhaka mustard oil tehari with spiced tender chicken', price: 120.00, img: IMAGES.tehari, prep: 5 },
  { name: 'Chicken Vuna', desc: 'Rich chicken curry braised in a thick caramelized onion gravy', price: 40.00, img: IMAGES.chicken_vuna, prep: 5 },
  { name: 'Chicken Roast ( Broiler 1/8)', desc: 'Traditional sweet-and-savory caramelized wedding feast chicken roast', price: 70.00, img: IMAGES.chicken_roast, prep: 5 },
  { name: 'Egg Korma', desc: 'Hard-boiled egg cooked in a velvety mild yogurt and onion korma sauce', price: 35.00, img: IMAGES.egg_korma, prep: 5 },
  { name: 'Egg Curry', desc: 'Traditional Bengali egg curry simmered in savory tomato gravy', price: 20.00, img: IMAGES.egg_curry, prep: 5 },
  { name: 'Fish', desc: 'Fresh fish steak cooked in rich Bengali mustard and onion gravy', price: 75.00, img: IMAGES.fish, prep: 6 },
  { name: 'Plain Daal', desc: 'Everyday yellow lentil soup tempered with garlic, cumin, and cilantro', price: 10.00, img: IMAGES.thin_dal, prep: 2 },
  { name: 'Vhorta', desc: 'Traditional Bengali mashed potato (Aloo Bhorta) with mustard oil and fried chili', price: 20.00, img: IMAGES.vhorta, prep: 2 },

  // Fast Food
  { name: 'Sausage Pizza', desc: 'Personal pizza loaded with chicken sausage, rich tomato sauce, and melted cheese', price: 90.00, img: IMAGES.sausage_pizza, prep: 15 },
  { name: 'Slice Pizza', desc: 'Hot oven-baked slice of chicken and melted cheese pizza', price: 70.00, img: IMAGES.slice_pizza, prep: 5 },
  { name: 'Chicken Cheese Burger', desc: 'Grilled chicken patty topped with melted cheese, lettuce, and secret burger sauce', price: 120.00, img: IMAGES.cheese_burger, prep: 12 },
  { name: 'BBQ Chicken Burger', desc: 'Juicy chicken burger basted with sweet smoky barbecue sauce', price: 50.00, img: IMAGES.bbq_burger, prep: 10 },
  { name: 'Noodles', desc: 'Stir-fried street-style chow mein noodles with egg and fresh vegetables', price: 40.00, img: IMAGES.noodles, prep: 8 },
  { name: 'Meat Loaf', desc: 'Baked slice of savory seasoned meatloaf served piping hot', price: 60.00, img: IMAGES.meat_loaf, prep: 6 },
  { name: 'Hot Dog', desc: 'Juicy grilled chicken frankfurter in a toasted soft bun with mustard & ketchup', price: 70.00, img: IMAGES.hot_dog, prep: 6 },
  { name: 'Croissant Sandwich', desc: 'Flaky buttery croissant stuffed with creamy chicken salad and cheese', price: 90.00, img: IMAGES.croissant, prep: 8 },

  // Desserts
  { name: 'Firni/ Jorda', desc: 'Classic sweet cardamom rice firni garnished with nuts and raisins', price: 40.00, img: IMAGES.firni, prep: 2 },
  { name: 'Plain Cake', desc: 'Soft and spongy vanilla tea cake slice', price: 20.00, img: IMAGES.plain_cake, prep: 2 },
  { name: 'Brownie', desc: 'Fudgy and decadent dark chocolate brownie square', price: 45.00, img: IMAGES.brownie, prep: 2 },
  { name: 'Pudding', desc: 'Silky smooth caramel egg custard pudding slice', price: 35.00, img: IMAGES.pudding, prep: 2 },

  // Drinks / Beverage
  { name: 'Fresh Juice', desc: 'Chilled freshly squeezed seasonal fruit juice', price: 45.00, img: IMAGES.fresh_juice, prep: 5 },
  { name: 'Lassi', desc: 'Cool and refreshing sweet whipped yogurt lassi', price: 40.00, img: IMAGES.lassi, prep: 4 },
  { name: 'Pepsi/ Coke/ Dew', desc: 'Chilled 250ml canned/bottled soft drink (MRP)', price: 25.00, img: IMAGES.soft_drink, prep: 1 },
  { name: 'Mineral Water', desc: '500ml sealed bottle of purified drinking water (MRP)', price: 15.00, img: IMAGES.mineral_water, prep: 1 },
  { name: 'Raw Tea', desc: 'Freshly brewed aromatic black liquor tea (Lal Cha)', price: 8.00, img: IMAGES.raw_tea, prep: 3 },
  { name: 'Milk Tea', desc: 'Traditional creamy brewed milk tea (Dudh Cha)', price: 10.00, img: IMAGES.milk_tea, prep: 3 },
  { name: 'Powder Milk Tea', desc: 'Rich full-cream powder milk tea prepared hot and sweet', price: 12.00, img: IMAGES.powder_milk_tea, prep: 3 },
  { name: 'Coffee', desc: 'Hot brewed milk coffee with rich foam', price: 20.00, img: IMAGES.coffee, prep: 4 },
  { name: 'Ice-Cream', desc: 'Chilled assorted ice cream cup or cone (MRP)', price: 30.00, img: IMAGES.ice_cream, prep: 1 }
];

// 17 items for Cafe Neptune UIU
const neptuneItems = [
  // Breakfast Items
  { name: 'Parata', desc: 'Hot crispy flaky paratha (1 pc)', price: 10.00, img: IMAGES.paratha, prep: 5 },
  { name: 'Daal', desc: 'Warm savory lentil curry (1 bowl/pc)', price: 20.00, img: IMAGES.dal, prep: 3 },
  { name: 'Mixed Vegetable', desc: 'Freshly cooked morning mixed vegetable curry (1 pc)', price: 25.00, img: IMAGES.vegetable, prep: 3 },
  { name: 'Egg Omelete/ Mummelett', desc: 'Hot pan-fried egg omelet with onions and chilies (1 pc)', price: 20.00, img: IMAGES.omelete, prep: 5 },

  // Snacks Items
  { name: 'Singara', desc: 'Crispy deep-fried savory potato pastry (1 pc)', price: 10.00, img: IMAGES.singara, prep: 3 },
  { name: 'Jilapi', desc: 'Crisp golden spiral sweet jalebi dipped in syrup (1 pc)', price: 10.00, img: IMAGES.jilapi, prep: 3 },
  { name: 'Puri', desc: 'Hot puffed deep-fried dal puri (1 pc)', price: 10.00, img: IMAGES.puri, prep: 4 },
  { name: 'Pastry', desc: 'Sweet multi-layer cream bakery pastry slice (1 pc)', price: 40.00, img: IMAGES.pastry, prep: 2 },
  { name: 'Chola', desc: 'Spiced chickpeas bhuna cooked with ginger and green chili (120 gms)', price: 20.00, img: IMAGES.chola, prep: 3 },

  // Bangla Lunch Items
  { name: 'Chicken Tehari', desc: 'Aromatic mustard oil rice cooked with tender chicken pieces (270-300 gms)', price: 120.00, img: IMAGES.tehari, prep: 5 },
  { name: 'Khichuri', desc: 'Traditional yellow rice and lentil bhuna khichuri (270-300 gms)', price: 40.00, img: IMAGES.khichuri, prep: 4 },
  { name: 'Plain Rice', desc: 'Freshly steamed warm white rice (270-300 gms)', price: 25.00, img: IMAGES.plain_rice, prep: 3 },
  { name: 'Chicken (boiler) Curry', desc: 'Desi spiced broiler chicken curry in onion gravy (1 pc)', price: 40.00, img: IMAGES.chicken_vuna, prep: 5 },
  { name: 'Egg Curry', desc: 'Hard-boiled egg cooked in savory Bengali gravy (1 pc)', price: 20.00, img: IMAGES.egg_curry, prep: 4 },
  { name: 'Boiled Egg', desc: 'Fresh hard-boiled egg (1 pc)', price: 15.00, img: IMAGES.boiled_egg, prep: 2 },
  { name: 'Mashed Potatoes', desc: 'Authentic Aloo Bhorta mashed with mustard oil and fried onions (1 pc)', price: 10.00, img: IMAGES.vhorta, prep: 2 },
  { name: 'Thin Dal', desc: 'Everyday light comforting yellow lentil soup (1 portion)', price: 10.00, img: IMAGES.thin_dal, prep: 2 }
];

async function seedCanteensAndMenus() {
  console.log('=== Starting Canteen & Menu Seeding ===');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Define and Upsert Canteens
    console.log('[1/4] Upserting Canteens: Khan\'s Kitchen, Olympia Palace, Cafe Neptune...');
    const canteensToInsert = [
      { name: "Khan's Kitchen", location: "UIU Cafeteria, Ground Floor" },
      { name: "Olympia Palace", location: "UIU Cafeteria, 1st Floor" },
      { name: "Cafe Neptune", location: "UIU Campus" }
    ];

    const canteenMap = {};

    for (const c of canteensToInsert) {
      const [existing] = await conn.query('SELECT id, name FROM canteens WHERE name = ?', [c.name]);
      let canteenId;
      if (existing.length > 0) {
        canteenId = existing[0].id;
        await conn.query('UPDATE canteens SET location = ? WHERE id = ?', [c.location, canteenId]);
      } else {
        const [result] = await conn.query('INSERT INTO canteens (name, location) VALUES (?, ?)', [c.name, c.location]);
        canteenId = result.insertId;
      }
      canteenMap[c.name] = canteenId;
      console.log(`  -> Canteen "${c.name}" registered with ID: ${canteenId}`);
    }

    // 2. Provision Local Admins with short forms
    console.log('\n[2/4] Provisioning Local Admin accounts with short forms...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const adminsToProvision = [
      {
        name: "Khan's Kitchen Admin",
        email: "kk@ca.com", // Short form: kk
        canteenId: canteenMap["Khan's Kitchen"]
      },
      {
        name: "Olympia Palace Admin",
        email: "op@ca.com", // Short form: op
        canteenId: canteenMap["Olympia Palace"]
      },
      {
        name: "Olympia Palace Admin",
        email: "olympia@ca.com", // Also link olympia@ca.com if present
        canteenId: canteenMap["Olympia Palace"]
      },
      {
        name: "Cafe Neptune Admin",
        email: "cn@ca.com", // Short form: cn
        canteenId: canteenMap["Cafe Neptune"]
      }
    ];

    for (const admin of adminsToProvision) {
      const [existing] = await conn.query('SELECT id, password_hash FROM users WHERE email = ?', [admin.email]);
      if (existing.length > 0) {
        // Update canteen_id and role, keep existing password if set or update
        await conn.query(
          `UPDATE users SET role = 'local_admin', canteen_id = ?, name = ? WHERE email = ?`,
          [admin.canteenId, admin.name, admin.email]
        );
        console.log(`  -> Updated existing user "${admin.email}" to local_admin for Canteen ID: ${admin.canteenId}`);
      } else {
        await conn.query(
          `INSERT INTO users (name, email, password_hash, role, canteen_id)
           VALUES (?, ?, ?, 'local_admin', ?)`,
          [admin.name, admin.email, passwordHash, admin.canteenId]
        );
        console.log(`  -> Created new user "${admin.email}" (local_admin) for Canteen ID: ${admin.canteenId}`);
      }
    }

    // Also provision kitchen staff for each canteen with short forms
    const staffToProvision = [
      { name: "KK Kitchen Staff", email: "staff.kk@ca.com", canteenId: canteenMap["Khan's Kitchen"] },
      { name: "OP Kitchen Staff", email: "staff.op@ca.com", canteenId: canteenMap["Olympia Palace"] },
      { name: "CN Kitchen Staff", email: "staff.cn@ca.com", canteenId: canteenMap["Cafe Neptune"] }
    ];

    for (const staff of staffToProvision) {
      const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [staff.email]);
      if (existing.length > 0) {
        await conn.query('UPDATE users SET role = "kitchen_staff", canteen_id = ? WHERE email = ?', [staff.canteenId, staff.email]);
      } else {
        await conn.query(
          `INSERT INTO users (name, email, password_hash, role, canteen_id)
           VALUES (?, ?, ?, 'kitchen_staff', ?)`,
          [staff.name, staff.email, passwordHash, staff.canteenId]
        );
      }
    }

    // 3. Insert/Upsert Menu Items for each canteen
    console.log('\n[3/4] Seeding Menu Items for each kitchen...');

    const seedCanteenItems = async (canteenId, canteenName, items) => {
      console.log(`  Seeding ${items.length} items for "${canteenName}" (ID: ${canteenId})...`);
      let insertedCount = 0;
      let updatedCount = 0;

      for (const item of items) {
        const [existing] = await conn.query(
          'SELECT id FROM menu_items WHERE canteen_id = ? AND name = ?',
          [canteenId, item.name]
        );

        if (existing.length > 0) {
          await conn.query(
            `UPDATE menu_items 
             SET description = ?, price = ?, image_url = ?, est_prep_time_mins = ?, is_available = TRUE
             WHERE id = ?`,
            [item.desc, item.price, item.img, item.prep, existing[0].id]
          );
          updatedCount++;
        } else {
          await conn.query(
            `INSERT INTO menu_items (canteen_id, name, description, price, image_url, est_prep_time_mins, is_available)
             VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
            [canteenId, item.name, item.desc, item.price, item.img, item.prep]
          );
          insertedCount++;
        }
      }
      console.log(`  Finished "${canteenName}": ${insertedCount} inserted, ${updatedCount} updated.`);
    };

    // Khan's Kitchen (61 items)
    await seedCanteenItems(canteenMap["Khan's Kitchen"], "Khan's Kitchen", standard61Items);

    // Olympia Palace (61 items)
    await seedCanteenItems(canteenMap["Olympia Palace"], "Olympia Palace", standard61Items);

    // Cafe Neptune (17 items)
    await seedCanteenItems(canteenMap["Cafe Neptune"], "Cafe Neptune", neptuneItems);

    await conn.commit();
    console.log('\n[4/4] Commit successful! All canteens, admins, and menus are active.');

    // Print summary
    const [finalCounts] = await conn.query(`
      SELECT c.id, c.name, COUNT(m.id) as item_count
      FROM canteens c
      LEFT JOIN menu_items m ON c.id = m.canteen_id
      GROUP BY c.id, c.name
    `);
    console.log('\n=== Summary of Canteens & Menu Item Counts ===');
    console.table(finalCounts);

    const [adminList] = await conn.query(`
      SELECT u.id, u.name, u.email, u.role, u.canteen_id, c.name as canteen_name
      FROM users u
      LEFT JOIN canteens c ON u.canteen_id = c.id
      WHERE u.role IN ('local_admin', 'kitchen_staff')
    `);
    console.log('\n=== Provisioned Local Admins & Kitchen Staff ===');
    console.table(adminList);

  } catch (err) {
    await conn.rollback();
    console.error('Seeding error occurred:', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seedCanteensAndMenus()
    .then(() => {
      console.log('\nCompleted successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}

module.exports = { seedCanteensAndMenus };
