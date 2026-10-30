/* Shared plan data and logic: used by the page, the service worker and Node.
   Workouts mirror Baki_Hanma_6_Week_Program.xlsx; menus follow Baki_Hanma_Diet_Plan.xlsx
   plus an extra vegetable at dinner. */
(function (root) {
  const TOTAL_DAYS = 42;
  const PHASE = { 1: 'Foundation', 2: 'Foundation', 3: 'Build', 4: 'Build', 5: 'Peak (Ogre Mode)', 6: 'Deload + Hanma Test' };
  const MULT = { 1: 1.0, 2: 1.15, 3: 1.3, 4: 1.45, 5: 1.6, 6: 0.7 };
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Python's round() (banker's rounding) so numbers match the spreadsheet exactly.
  const pyRound = (x) => {
    const f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  };
  const r = (base, w) => (base >= 20 ? pyRound((base * MULT[w]) / 5) * 5 : Math.max(1, pyRound(base * MULT[w])));
  const sets = (base, w) => base + (w === 3 || w === 4 ? 1 : w === 5 ? 2 : w === 6 ? -1 : 0);
  const rpe = (w) => ({ 1: '7', 2: '7-8', 3: '8', 4: '8-9', 5: '9-10', 6: '6-7' })[w];
  const mins = (base, w) => `${pyRound(base * MULT[w])} min`;
  const ex = (name, sets, reps, rest, note) => ({ name, sets, reps: String(reps), rest, note });

  const WORKOUTS = [
    (w) => ['Upper Strength & Grip - "Demon Back"', [
      ex('Weighted Pull-Ups', sets(5, w), Math.max(3, 8 - Math.floor(w / 2)), '2-3 min', 'Add load weekly; full dead hang to chin over bar'),
      ex('Weighted Dips', sets(4, w), Math.max(5, 10 - Math.floor(w / 2)), '2 min', 'Chest-forward lean, deep stretch'),
      ex('Pendlay Rows', sets(4, w), '8', '90 s', 'Explode off the floor every rep'),
      ex('Archer Push-Ups', sets(3, w), `${r(8, w)}/side`, '60 s', 'Progressing toward one-arm push-ups'),
      ex('Fingertip Push-Ups', sets(3, w), r(15, w), '60 s', 'Finger and hand strength'),
      ex('Dead Hang (max)', 3, w < 6 ? `${45 + 15 * Math.min(w, 5)} s` : '45 s', '60 s', 'Grip is life. Towel hang from Wk 4'),
      ex('Rice Bucket Grip Work', 1, mins(5, w), '-', 'Open/close, twist, claw'),
    ]],
    (w) => {
      const rounds = { 1: 6, 2: 8, 3: 10, 4: 10, 5: 12, 6: 6 }[w];
      return ['Striking & Conditioning - "Shadow Fight"', [
        ex('Jump Rope Warm-Up', 1, mins(10, w), '-', 'Alternate footwork patterns'),
        ex('Shadowboxing vs. Imaginary Opponent', rounds, '3 min', '1 min', 'Visualize a real opponent attacking you'),
        ex('Heavy Bag Power Rounds', Math.floor(rounds / 2) + 1, '3 min', '1 min', 'Last 30 s of each round = all-out flurry'),
        ex('Sprint Intervals', { 1: 8, 2: 10, 3: 12, 4: 12, 5: 15, 6: 6 }[w], '30 s on / 30 s off', '-', '95%+ effort every sprint'),
        ex('Burpee Sprawls', 5, r(15, w), '45 s', 'Fast hip drop, explode up'),
        ex('Neck Bridges (front + back)', 3, '30-60 s', '60 s', "Wrestler's bridge; build slowly"),
      ]];
    },
    (w) => ['Lower Body & Explosive - "Ogre Legs"', [
      ex('Back Squat', sets(5, w), { 1: '5', 2: '5', 3: '4', 4: '3', 5: '2-3', 6: '5 @ 70%' }[w], '3 min', 'Heavy, controlled descent'),
      ex('Box Jumps', 5, '5', '90 s', 'Max height, step down'),
      ex('Romanian Deadlift', sets(4, w), '8', '2 min', 'Hamstrings and posterior chain'),
      ex('Bulgarian Split Squat', 3, `${r(10, w)}/leg`, '90 s', 'Hold DBs; deep stretch'),
      ex('Pistol Squat Progression', 3, `${r(5, w)}/leg`, '60 s', 'Assisted if needed'),
      ex('Standing Calf Raises', 4, r(25, w), '45 s', 'Full ROM, 2 s pause at top'),
      ex('Tibialis Raises', 3, r(20, w), '45 s', 'Knee and shin armor'),
    ]],
    (w) => ['Calisthenics Volume - "Prison Cell"', [
      ex('Push-Ups (total, any sets)', 1, `${r(200, w)} total`, 'as needed', 'Break them up however you must'),
      ex('Pull-Ups (total)', 1, `${r(50, w)} total`, 'as needed', 'Chin-ups OK after the halfway mark'),
      ex('Bodyweight Squats (total)', 1, `${r(300, w)} total`, 'as needed', 'Training-arc volume'),
      ex('Sit-Ups (total)', 1, `${r(200, w)} total`, 'as needed', 'Hands behind head, controlled'),
      ex('Handstand Push-Up Progression', 4, Math.max(3, r(5, w)), '90 s', 'Pike > wall HSPU > freestanding'),
      ex('Hanging Leg Raises', 4, r(12, w), '60 s', 'Toes to bar if able'),
      ex('Plank (max)', 3, w < 6 ? `${60 + 15 * Math.min(w, 5)} s` : '60 s', '45 s', 'Squeeze everything'),
    ]],
    (w) => (w === 6
      ? ['HANMA TEST DAY - Benchmarks', [
        ex('Warm-Up: Rope + Dynamic Mobility', 1, '15 min', '-', 'Fully warm before testing'),
        ex('Max Push-Ups (1 set)', 1, 'max', '5 min', 'Log it in Progress'),
        ex('Max Pull-Ups (1 set)', 1, 'max', '5 min', 'Log it in Progress'),
        ex('Max Dead Hang', 1, 'max', '5 min', 'Log it in Progress'),
        ex('Max Plank', 1, 'max', '5 min', 'Log it in Progress'),
        ex('1-Mile Run for Time', 1, '1 mile', '-', 'Log it in Progress'),
      ]]
      : ['Full-Body Power + Core & Neck - "Ogre Blood"', [
        ex('Deadlift', sets(5, w), { 1: '5', 2: '5', 3: '3', 4: '3', 5: '1-2' }[w], '3 min', 'Brace hard; this is your raw power'),
        ex('Power Cleans', 5, '3', '2 min', 'Fast bar, crisp catch'),
        ex('Medicine Ball Slams', 4, r(12, w), '60 s', 'Rotational + overhead'),
        ex('Landmine Rotations', 3, `${r(10, w)}/side`, '60 s', 'Punch-power transfer'),
        ex('Neck Harness Extensions', 3, r(15, w), '60 s', 'Light weight, slow tempo'),
        ex('Dragon Flags', 4, Math.max(3, r(5, w)), '90 s', 'Negatives if needed'),
        ex("Farmer's Walk (heavy)", 4, '40 m', '90 s', 'Crush the handles'),
      ]]),
    (w) => ['Fight Endurance - "Underground Arena"', [
      ex('Hill / Stair Sprints', { 1: 8, 2: 10, 3: 12, 4: 14, 5: 16, 6: 6 }[w], '20-30 s', 'walk down', 'Max effort uphill'),
      ex('Pad Work / Heavy Bag Combos', { 1: 5, 2: 6, 3: 6, 4: 8, 5: 8, 6: 4 }[w], '3 min', '1 min', 'Combos + defense + footwork'),
      ex('Sandbag Carry', 5, '50 m', '90 s', 'Odd-object strength'),
      ex('Bear Crawl', 4, '30 m', '60 s', 'Low hips, fast'),
      ex('Kettlebell Swings', 5, r(20, w), '60 s', 'Hip snap, heavy bell'),
      ex('Steady-State Run', 1, mins(25, w), '-', 'Zone 2 - conversational pace'),
    ]],
    () => ['Active Recovery - "Rest Like a Warrior"', [
      ex('Long Walk / Light Swim', 1, '30-45 min', '-', 'Easy pace'),
      ex('Full-Body Mobility Flow', 1, '20 min', '-', 'Hips, T-spine, shoulders, ankles'),
      ex('Deep Stretching / Splits Work', 1, '15 min', '-', 'Hold each stretch 60-90 s'),
      ex('Breathing / Meditation', 1, '10 min', '-', 'Box breathing - calm the ogre'),
    ]],
  ];

  // name: [serving, kcal, protein, carbs, fat]  (approx. USDA FoodData Central)
  const FOODS = {
    'Whole Eggs': ['1 large egg', 72, 6.3, 0.4, 4.8],
    'Egg Whites': ['1 cup (243 g)', 126, 26, 1.8, 0.4],
    'Chicken Breast': ['6 oz cooked', 280, 53, 0, 6],
    'Lean Ground Beef 90/10': ['6 oz cooked', 368, 44, 0, 20],
    'Sirloin Steak': ['6 oz cooked', 320, 50, 0, 13],
    'Salmon': ['6 oz cooked', 350, 38, 0, 21],
    'Tuna (canned in water)': ['1 can drained', 130, 29, 0, 1],
    'Greek Yogurt (nonfat)': ['1 cup (227 g)', 133, 23, 8, 0.7],
    'Cottage Cheese (2%)': ['1 cup', 183, 24, 10, 5],
    'Whole Milk': ['1 cup', 150, 8, 12, 8],
    'Whey Protein': ['1 scoop (30 g)', 120, 24, 3, 1.5],
    'Rolled Oats': ['1/2 cup dry (40 g)', 150, 5, 27, 3],
    'White Rice': ['1 cup cooked', 205, 4.3, 45, 0.4],
    'Pasta': ['1 cup cooked', 220, 8, 43, 1.3],
    'Sweet Potato': ['1 medium (150 g)', 135, 3, 31, 0.2],
    'White Potato': ['1 medium (173 g)', 160, 4.3, 37, 0.2],
    'Bagel (plain)': ['1 medium', 277, 11, 55, 1.4],
    'Whole-Wheat Bread': ['1 slice', 80, 4, 14, 1],
    'Black Beans': ['1 cup cooked', 227, 15, 41, 0.9],
    'Banana': ['1 medium', 105, 1.3, 27, 0.4],
    'Blueberries': ['1 cup', 85, 1.1, 21, 0.5],
    'Apple': ['1 medium', 95, 0.5, 25, 0.3],
    'Honey': ['1 tbsp', 64, 0, 17, 0],
    'Broccoli': ['1 cup cooked', 55, 3.7, 11, 0.6],
    'Spinach (raw)': ['2 cups', 14, 1.7, 2.2, 0.2],
    'Mixed Vegetables (frozen)': ['1 cup cooked', 118, 5.2, 24, 0.3],
    'Green Beans (frozen)': ['1 cup cooked', 38, 2, 8.5, 0.3],
    'Almonds': ['1 oz (23 nuts)', 164, 6, 6, 14],
    'Peanut Butter': ['2 tbsp', 190, 7, 7, 16],
    'Avocado': ['1/2 fruit', 120, 1.5, 6.4, 11],
    'Olive Oil': ['1 tbsp', 120, 0, 0, 14],
  };

  // How each food is bought: category, shopping unit, amount of that unit per serving,
  // store pack (name, size in the same unit), estimated pack price at Aldi and Publix,
  // the recommended store, and why. Raw meat ≈ 8 oz per 6 oz cooked serving.
  // Prices are Oct 2026 estimates: Aldi from 2026 price surveys; Publix meat/seafood
  // from recent listings and weekly-ad sale prices, Publix staples estimated.
  const CATEGORIES = ['Meat & Fish', 'Dairy & Eggs', 'Produce', 'Frozen', 'Bakery', 'Pantry'];
  const STORES = {
    Aldi: [['Produce', 'Produce (by the entrance)'], ['Bakery', 'Bread'], ['Pantry', 'Center aisles'],
      ['Dairy & Eggs', 'Dairy cooler'], ['Meat & Fish', 'Meat cooler'], ['Frozen', 'Freezers']],
    Publix: [['Produce', 'Produce'], ['Bakery', 'Bakery'], ['Meat & Fish', 'Seafood counter & meat (back)'],
      ['Pantry', 'Center aisles'], ['Dairy & Eggs', 'Dairy (back wall)'], ['Frozen', 'Frozen']],
  };
  const item = (category, unit, per, pack, size, aldi, publix, store, why) => ({ category, unit, per, pack, size, price: { Aldi: aldi, Publix: publix }, store, why });
  const SHOP = {
    'Whole Eggs': item('Dairy & Eggs', 'eggs', 1, 'dozen', 12, 2.05, 3.99, 'Aldi', 'Same grade A eggs for about half the price'),
    'Egg Whites': item('Dairy & Eggs', 'cups', 1, '32 oz carton', 4, 3.49, 5.49, 'Aldi', 'Cheaper, same product'),
    'Chicken Breast': item('Meat & Fish', 'lb raw', 0.5, 'lb', 1, 3.29, 5.53, 'Aldi', 'Kirkwood family packs are a fraction of Publix; Never Any! if you want antibiotic-free'),
    'Lean Ground Beef 90/10': item('Meat & Fish', 'lb raw', 0.5, 'lb', 1, 5.79, 8.49, 'Aldi', 'Store ground beef runs about 2x at Publix'),
    'Sirloin Steak': item('Meat & Fish', 'lb raw', 0.5, 'lb', 1, 8.99, 9.99, 'Publix', 'USDA Choice, better trimmed. Price assumes a sale: buy on weekly-ad or BOGO weeks (regular ~$15/lb)'),
    'Salmon': item('Meat & Fish', 'lb raw', 0.47, 'lb', 1, 9.99, 12.99, 'Publix', 'Fresh from the seafood counter, and they will skin it for you'),
    'Tuna (canned in water)': item('Pantry', 'cans', 1, '5 oz can', 1, 0.85, 1.79, 'Aldi', 'Same canned tuna, half the price'),
    'Greek Yogurt (nonfat)': item('Dairy & Eggs', 'cups', 1, '32 oz tub', 4, 3.65, 5.99, 'Aldi', 'Friendly Farms tub is the best value'),
    'Cottage Cheese (2%)': item('Dairy & Eggs', 'cups', 1, '24 oz tub', 3, 2.99, 4.99, 'Aldi', 'Cheaper, same macros'),
    'Whole Milk': item('Dairy & Eggs', 'cups', 1, 'half gallon', 8, 1.79, 3.29, 'Aldi', 'Cheaper, same product'),
    'Whey Protein': item('Pantry', 'scoops', 1, '2 lb tub (~30 scoops)', 30, 19.99, 29.99, 'Aldi', 'Elevation whey is a bargain. If it is out of stock, try Publix or order online'),
    'Rolled Oats': item('Pantry', 'cups dry', 0.5, '42 oz canister (~15 cups)', 15, 3.49, 5.29, 'Aldi', 'Same oats for less'),
    'White Rice': item('Pantry', 'lb dry', 0.14, '5 lb bag', 5, 3.79, 6.49, 'Aldi', 'Same rice, much cheaper in the 5 lb bag'),
    'Pasta': item('Pantry', 'oz dry', 2, '16 oz box', 16, 0.95, 1.89, 'Aldi', 'Under $1 a box'),
    'Sweet Potato': item('Produce', 'medium', 1, 'each', 1, 0.35, 0.6, 'Aldi', 'Hardy produce; Aldi quality is fine and much cheaper'),
    'White Potato': item('Produce', 'medium', 1, '5 lb bag (~10)', 10, 3.59, 5.49, 'Aldi', 'Hardy produce; Aldi quality is fine and much cheaper'),
    'Bagel (plain)': item('Bakery', 'bagels', 1, '6-pack', 6, 2.29, 3.99, 'Aldi', 'Cheaper packaged bagels'),
    'Whole-Wheat Bread': item('Bakery', 'slices', 1, 'loaf (~20 slices)', 20, 2.49, 3.79, 'Aldi', 'Cheaper; freeze half the loaf so it stays fresh'),
    'Black Beans': item('Pantry', 'cups', 1, '15 oz can (~1.5 cups)', 1.5, 0.72, 1.29, 'Aldi', 'Under $1 a can'),
    'Banana': item('Produce', 'bananas', 1, 'each', 1, 0.17, 0.25, 'Aldi', 'Cheapest anywhere; buy some green so they last the week'),
    'Blueberries': item('Produce', 'cups', 1, 'pint (~2 cups)', 2, 3.29, 4.49, 'Publix', 'Berries are more consistent here. Budget swap: Aldi frozen blueberries'),
    'Apple': item('Produce', 'apples', 1, '3 lb bag (~7)', 7, 4.29, 5.99, 'Aldi', 'Bagged apples are cheaper per apple'),
    'Honey': item('Pantry', 'tbsp', 1, '12 oz bottle (~17 tbsp)', 17, 3.49, 5.49, 'Aldi', 'Cheaper, same product'),
    'Broccoli': item('Produce', 'lb', 0.33, 'lb', 1, 1.99, 2.99, 'Aldi', 'Crowns hold up well; Aldi is cheaper'),
    'Spinach (raw)': item('Produce', 'oz', 2, '10 oz bag', 10, 2.99, 4.29, 'Publix', 'Delicate greens: pick the bag with the latest date'),
    'Mixed Vegetables (frozen)': item('Frozen', 'cups', 1, '12 oz bag (~2.5 cups)', 2.5, 1.19, 1.99, 'Aldi', 'Frozen veg is as nutritious as fresh and keeps for weeks'),
    'Green Beans (frozen)': item('Frozen', 'cups', 1, '12 oz bag (~2.5 cups)', 2.5, 1.19, 1.99, 'Aldi', 'Frozen veg is as nutritious as fresh and keeps for weeks'),
    'Almonds': item('Pantry', 'oz', 1, '16 oz bag', 16, 5.49, 8.99, 'Aldi', 'Southern Grove nuts are a big saving'),
    'Peanut Butter': item('Pantry', 'tbsp', 2, '16 oz jar (~28 tbsp)', 28, 2.09, 3.49, 'Aldi', 'About $2 a jar'),
    'Avocado': item('Produce', 'avocados', 0.5, 'each', 1, 0.89, 1.5, 'Publix', 'Easier to find ripe ones; Aldi bags are often rock-hard'),
    'Olive Oil': item('Pantry', 'tbsp', 1, '25 oz bottle (~50 tbsp)', 50, 6.39, 9.99, 'Aldi', 'Same oil for a lot less'),
  };

  const meal = (name, time, items) => ({ name, time, items: items.map(([food, s]) => ({ food, base: s })) });
  const BED = meal('Before Bed', '21:30', [['Cottage Cheese (2%)', 1]]);
  const MENU_A = [
    meal('Breakfast', '7:00', [['Whole Eggs', 3], ['Rolled Oats', 2], ['Banana', 1], ['Honey', 1]]),
    meal('Snack', '10:00', [['Greek Yogurt (nonfat)', 1], ['Blueberries', 1], ['Almonds', 1]]),
    meal('Lunch', '13:00', [['Chicken Breast', 1], ['White Rice', 2.5], ['Broccoli', 1]]),
    meal('Pre-Workout', '16:00', [['Bagel (plain)', 1], ['Peanut Butter', 0.5], ['Honey', 1]]),
    meal('Post-Workout', '18:30', [['Whey Protein', 1], ['Banana', 1]]),
    meal('Dinner', '20:00', [['Lean Ground Beef 90/10', 1], ['Sweet Potato', 2], ['Spinach (raw)', 1], ['Green Beans (frozen)', 1]]),
    BED,
  ];
  const MENU_B = [
    meal('Breakfast', '7:00', [['Whole Eggs', 3], ['Whole-Wheat Bread', 2], ['Banana', 1], ['Honey', 1]]),
    meal('Snack', '10:00', [['Whey Protein', 1], ['Rolled Oats', 2], ['Banana', 1]]),
    meal('Lunch', '13:00', [['Lean Ground Beef 90/10', 1], ['Pasta', 2.5], ['Broccoli', 1]]),
    meal('Pre-Workout', '16:00', [['Apple', 1], ['Whole Milk', 1]]),
    meal('Post-Workout', '18:30', [['Whey Protein', 1], ['Bagel (plain)', 1], ['Honey', 1]]),
    meal('Dinner', '20:00', [['Salmon', 1], ['White Potato', 2], ['Spinach (raw)', 1], ['Broccoli', 1]]),
    BED,
  ];
  const MENU_C = [
    meal('Breakfast', '7:00', [['Rolled Oats', 2], ['Whole Milk', 1], ['Blueberries', 1], ['Peanut Butter', 0.5]]),
    meal('Snack', '10:00', [['Whole Eggs', 3], ['Whole-Wheat Bread', 2]]),
    meal('Lunch', '13:00', [['Chicken Breast', 1], ['Black Beans', 1], ['White Rice', 1.5], ['Avocado', 1], ['Broccoli', 1]]),
    meal('Pre-Workout', '16:00', [['Banana', 1], ['Bagel (plain)', 1], ['Honey', 1]]),
    meal('Post-Workout', '18:30', [['Whey Protein', 1], ['White Rice', 1]]),
    meal('Dinner', '20:00', [['Sirloin Steak', 1], ['White Potato', 2], ['Spinach (raw)', 1], ['Mixed Vegetables (frozen)', 1], ['Olive Oil', 0.5]]),
    BED,
  ];
  const MENU_REST = [
    meal('Breakfast', '8:00', [['Whole Eggs', 4], ['Whole-Wheat Bread', 2], ['Avocado', 1], ['Blueberries', 1]]),
    meal('Lunch', '12:30', [['Tuna (canned in water)', 1], ['Sweet Potato', 2], ['Spinach (raw)', 1], ['Olive Oil', 0.5]]),
    meal('Snack', '15:30', [['Greek Yogurt (nonfat)', 1], ['Almonds', 1], ['Apple', 1]]),
    meal('Dinner', '19:00', [['Chicken Breast', 1], ['White Rice', 2.5], ['Broccoli', 1], ['Mixed Vegetables (frozen)', 1]]),
    meal('Before Bed', '21:30', [['Cottage Cheese (2%)', 1], ['Honey', 1]]),
  ];
  const WEEK_MENUS = [MENU_A, MENU_B, MENU_C, MENU_A, MENU_B, MENU_C, MENU_REST];

  // Supplement checklist. `days` picks which program days each one shows on.
  const SUPP_DAYS = { daily: 'Every day', training: 'Training days', conditioning: 'Tue & Sat (sweaty days)' };
  const DEFAULT_SUPPLEMENTS = [
    { id: 'creatine', name: 'Creatine monohydrate (5 g)', when: 'Any time, every day', days: 'daily' },
    { id: 'vitdk', name: 'Vitamin D + K', when: 'With breakfast', days: 'daily' },
    { id: 'vitb', name: 'Vitamin B complex', when: 'With breakfast', days: 'daily' },
    { id: 'zinc', name: 'Zinc (keep it ≤25 mg)', when: 'With dinner', days: 'daily' },
    { id: 'lytes', name: 'Electrolytes (500-1,000 mg sodium)', when: 'During the workout', days: 'conditioning' },
  ];
  function supplementsFor(settings, d) {
    const list = (settings && settings.supplements) || DEFAULT_SUPPLEMENTS;
    return list.filter((s) => s.days === 'daily'
      || (s.days === 'training' && d.dayType === 'Training')
      || (s.days === 'conditioning' && (d.wd === 1 || d.wd === 5)));
  }

  const GOALS = { 'Cut': -400, 'Maintain': 0, 'Lean Bulk': 250, 'Bulk': 500 };
  const KCAL_PER_LB = { Training: 16, Rest: 14 };

  function targets(settings, dayType) {
    const bw = Number(settings.bodyweight) || 180;
    const kcal = Math.round((bw * KCAL_PER_LB[dayType] + (GOALS[settings.goal] ?? 0)) / 10) * 10;
    const protein = Math.round(bw * 1.0);
    const fat = Math.round(bw * 0.4);
    return { kcal, protein, fat, carbs: Math.round((kcal - protein * 4 - fat * 9) / 4) };
  }

  function macrosFor(food, servings) {
    const f = FOODS[food];
    if (!f) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    return { kcal: f[1] * servings, protein: f[2] * servings, carbs: f[3] * servings, fat: f[4] * servings };
  }

  // Scale a day's menu so it lands on that day's calorie target (same as the spreadsheet).
  function scaledMeals(menu, target) {
    const baseKcal = menu.reduce((t, m) => t + m.items.reduce((s, i) => s + FOODS[i.food][1] * i.base, 0), 0);
    const factor = baseKcal ? target / baseKcal : 1;
    return menu.map((m) => {
      const items = m.items.map((i) => {
        const servings = Math.round(i.base * factor * 10) / 10;
        return { food: i.food, serving: FOODS[i.food][0], servings, ...macrosFor(i.food, servings) };
      });
      const sum = (k) => items.reduce((t, i) => t + i[k], 0);
      return { name: m.name, time: m.time, items, kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') };
    });
  }

  function getDay(n, settings) {
    const week = Math.ceil(n / 7), wd = (n - 1) % 7;
    const [focus, exercises] = WORKOUTS[wd](week);
    const dayType = wd === 6 ? 'Rest' : 'Training';
    const t = targets(settings || {}, dayType);
    return {
      n, week, wd, phase: PHASE[week], dayName: DAY_NAMES[wd], focus,
      focusShort: focus.split(' - ')[0], nickname: (focus.split(' - ')[1] || '').replace(/"/g, ''),
      rpe: wd === 6 ? '3-4' : rpe(week), dayType, exercises, targets: t,
      meals: scaledMeals(WEEK_MENUS[wd], t.kcal), isTest: focus.startsWith('HANMA TEST'),
    };
  }

  // One week of planned meals, totalled and converted to store units. Every program
  // week eats the same menus, so this list only changes when bodyweight or goal does.
  // storeFor(food) lets the person override the recommended store per item.
  function weeklyGroceries(settings, storeFor = () => null) {
    const servings = {};
    for (let n = 1; n <= 7; n++) {
      for (const m of getDay(n, settings).meals) {
        for (const it of m.items) servings[it.food] = (servings[it.food] || 0) + it.servings;
      }
    }
    const items = Object.entries(servings).map(([food, s]) => {
      const sh = SHOP[food];
      const amount = s * sh.per;
      const store = storeFor(food) || sh.store;
      // Meat is bought by weight (to the nearest 1/4 lb); everything else by whole packs.
      const byWeight = sh.pack === 'lb';
      const qty = byWeight ? Math.ceil(amount * 4) / 4 : Math.max(1, Math.ceil(amount / sh.size - 1e-9));
      const cost = (s2) => qty * sh.price[s2];
      return {
        food, category: sh.category, unit: sh.unit, amount, pack: sh.pack, byWeight, qty, why: sh.why,
        store, recommended: sh.store, cost: cost(store), costAt: { Aldi: cost('Aldi'), Publix: cost('Publix') },
        weeklyCost: (amount / sh.size) * sh.price[store],
        weeksCovered: byWeight ? 1 : (qty * sh.size) / amount,
      };
    });
    const byName = (a, b) => a.food.localeCompare(b.food);
    const categories = CATEGORIES.map((c) => ({ name: c, items: items.filter((i) => i.category === c).sort(byName) })).filter((g) => g.items.length);
    const stores = Object.entries(STORES).map(([name, zones]) => {
      const mine = items.filter((i) => i.store === name);
      return {
        name, total: mine.reduce((t, i) => t + i.cost, 0),
        zones: zones.map(([c, label]) => ({ name: label, items: mine.filter((i) => i.category === c).sort(byName) })).filter((z) => z.items.length),
      };
    }).filter((s) => s.zones.length);
    const sum = (f) => items.reduce((t, i) => t + f(i), 0);
    return {
      items, categories, stores,
      trip: sum((i) => i.cost), perWeek: sum((i) => i.weeklyCost), allPublix: sum((i) => i.costAt.Publix),
    };
  }

  // Dates are handled as 'YYYY-MM-DD' strings in local time.
  const pad = (x) => String(x).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toUTC = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const dayNumber = (startIso, iso) => Math.floor((toUTC(iso) - toUTC(startIso)) / 86400000) + 1;
  const addDays = (iso, k) => { const d = new Date(toUTC(iso) + k * 86400000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const nextMonday = (iso) => { const dow = new Date(toUTC(iso)).getUTCDay(); return addDays(iso, (8 - dow) % 7); };

  const fmtNum = (x) => Math.round(x).toLocaleString('en-US');

  // Notification text, built on the device from the person's own settings and logs.
  function compose(state, type, now) {
    const s = (state && state.settings) || {};
    if (!s.startDate) return { title: 'Hanma Training', body: 'Open the app to set your start date.' };
    const n = dayNumber(s.startDate, isoDate(now));
    if (n < 1) return { title: 'Hanma Training', body: `Program starts in ${1 - n} day${1 - n === 1 ? '' : 's'}. Rest up and stock the fridge.` };
    if (n > TOTAL_DAYS) return { title: 'Program complete', body: '42 days done. Log your Hanma Test results and pick your next challenge.' };
    const d = getDay(n, s);
    if (type === 'evening') {
      const log = (state.logs || {})[n] || {};
      const exDone = d.exercises.filter((_, i) => log.ex && log.ex[i] && log.ex[i].done).length;
      const mealsDone = d.meals.filter((_, i) => log.meals && log.meals[i]).length;
      const supps = supplementsFor(s, d);
      const suppsDone = supps.filter((x) => log.supps && log.supps[x.id]).length;
      if (exDone === d.exercises.length && mealsDone === d.meals.length && suppsDone === supps.length) {
        return { title: 'Hanma approved', body: `Day ${n} fully logged. Sleep 8+ hours and come back stronger.` };
      }
      const suppText = supps.length ? `, ${suppsDone}/${supps.length} supplements` : '';
      return { title: `Day ${n} check-in`, body: `${exDone}/${d.exercises.length} exercises, ${mealsDone}/${d.meals.length} meals${suppText} logged. Finish your log before bed.` };
    }
    const top = d.exercises.slice(0, 3).map((e) => `${e.name.replace(/\s*\(.*?\)/, '')} ${e.sets > 1 ? e.sets + '×' : ''}${e.reps}`).join(', ');
    const more = d.exercises.length > 3 ? ` +${d.exercises.length - 3} more` : '';
    const first = d.meals[0];
    const restock = d.dayType === 'Rest' && n < TOTAL_DAYS ? ' Restock today: open the Grocery list.' : '';
    return {
      title: `Day ${n}/${TOTAL_DAYS} · ${d.focusShort}`,
      body: `${top}${more}. Eat ${fmtNum(d.targets.kcal)} kcal, ${d.targets.protein} g protein. ${first.name}: ${first.items.map((i) => `${i.servings} ${i.food}`).join(', ')}.${restock}`,
    };
  }

  const api = { TOTAL_DAYS, PHASE, GOALS, FOODS, SUPP_DAYS, DEFAULT_SUPPLEMENTS, supplementsFor, getDay, targets, macrosFor, compose, weeklyGroceries, isoDate, dayNumber, addDays, nextMonday, fmtNum };
  root.BakiPlan = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
