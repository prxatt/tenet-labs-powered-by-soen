/** Built-in recipe library + helpers. User recipes merge in from PlanState. */
import type { Recipe } from './types';

export const RECIPES: Recipe[] = [
  /* ---- breakfast ---- */
  { c: 'Breakfast', n: 'Greek Yogurt Power Bowl', tag: 'Breakfast · 3 min', mac: '~420 kcal · 35g P', ing: ['250g Greek yogurt (2%)', '1 scoop PB2 or honey', 'Berries + banana coins', 'Walnuts + chia', 'Granola crunch (small handful)'], st: ['Whisk PB2 into yogurt.', 'Layer fruit, nuts, chia, granola.', 'Eat before the first deep-work block.'] },
  { c: 'Breakfast', n: 'Protein Oats + Berries', tag: 'Breakfast · 6 min', mac: '~460 kcal · 32g P', ing: ['60g oats + 300ml milk', '½ scoop protein or PB2 (off heat)', 'Berries + cinnamon', '1 tbsp almond butter'], st: ['Simmer oats 4 min.', 'Off heat, stir in protein.', 'Top berries + almond butter.'] },
  { c: 'Breakfast', n: 'Three-Egg Scramble + Toast', tag: 'Breakfast · 8 min', mac: '~480 kcal · 34g P', ing: ['3 eggs + splash of milk', '30g cheese', '2 slices whole-grain toast', 'Spinach handful', 'Hot sauce'], st: ['Wilt spinach 1 min.', 'Low-heat scramble, cheese at the end.', 'Pile on toast.'] },
  { c: 'Breakfast', n: 'Cottage Cheese Toast', tag: 'Breakfast · 5 min', mac: '~380 kcal · 28g P', ing: ['2 slices whole-grain toast', '200g cottage cheese', 'Honey+walnuts OR everything spice+hot sauce'], st: ['Toast. Pile. Season.'] },
  { c: 'Breakfast', n: 'Shakshuka + Beans', tag: 'Breakfast · 20 min', mac: '~560 kcal · 36g P', ing: ['3 eggs', 'Tomato-pepper sauce', '1 cup white beans', 'Feta + bread'], st: ['Simmer sauce + beans 5.', 'Eggs in wells, lid 5–6.', 'Feta, dip.'] },
  /* ---- lunch ---- */
  { c: 'Lunch', n: 'Chicken Burrito Bowl', tag: 'Lunch · 15 min', mac: '~680 kcal · 52g P', ing: ['180g grilled chicken thigh (Sunday prep)', '1 cup rice + ½ cup black beans', 'Greek yogurt + lime crema', 'Corn, salsa, cilantro', '60g cheese'], st: ['Warm rice, beans, chicken 3 min.', 'Layer bowl, crema on top.', 'Hot sauce. Done.'] },
  { c: 'Lunch', n: 'Grilled Chicken Poke Bowl', tag: 'Lunch · 15 min', mac: '~640 kcal · 48g P', ing: ['170g grilled chicken, cubed', '1 cup rice + 1 cup edamame', '½ avocado', 'Soy-sesame-vinegar + sriracha-yogurt', 'Cucumber, sesame'], st: ['Toss chicken in the sauce 5 min.', 'Assemble over rice + edamame.', 'Drizzle, sesame, eat.'] },
  { c: 'Lunch', n: 'Chicken Tikka Wrap', tag: 'Lunch · 20 min', mac: '~700 kcal · 50g P', ing: ['180g chicken breast, strips', 'Yogurt + tikka marinade (10 min)', 'Whole-wheat wrap', 'Cucumber-mint raita', 'Onion, peppers'], st: ['Marinate 10 min while peppers char.', 'Sear chicken 3 min/side till 165°F.', 'Wrap with raita + veg.'] },
  { c: 'Lunch', n: 'Chicken Fried Rice+', tag: 'Lunch · 12 min', mac: '~650 kcal · 46g P', ing: ['1.5 cups day-old rice', '150g chicken, diced', '1 egg + 2 whites', 'Edamame, peas, scallion', 'Soy + sesame oil'], st: ['Sear chicken hard 3 min, set aside.', 'Scramble eggs, then fry rice + veg 3 min.', 'Everything back in, soy around the rim.'] },
  { c: 'Lunch', n: 'Chicken Caesar Power Bowl', tag: 'Lunch · 10 min', mac: '~620 kcal · 54g P', ing: ['180g grilled chicken', 'Romaine + kale', 'Greek-yogurt caesar (yogurt, parm, lemon, anchovy paste, garlic)', 'Crispy chickpeas instead of croutons', 'Extra parmesan'], st: ['Whisk the yogurt caesar 1 min.', 'Toss greens, top chicken warm.', 'Chickpea crunch over everything.'] },
  { c: 'Lunch', n: 'Paneer Tikka Wrap', tag: 'Lunch · 20 min', mac: '~680 kcal · 42g P', ing: ['180g paneer', 'Yogurt + tikka marinade', 'Whole-wheat wrap', 'Cucumber-mint raita', 'Onion, peppers'], st: ['Marinate 10 min.', 'Sear paneer + peppers till charred.', 'Wrap with raita.'] },
  { c: 'Lunch', n: 'Lentil–Halloumi Bowl', tag: 'Lunch · 15 min', mac: '~620 kcal · 38g P', ing: ['1 cup lentils', '100g halloumi', 'Roast veg from prep', 'Couscous', "Lemon-za'atar dressing"], st: ['Dry-pan halloumi 2 min/side.', 'Warm lentils + veg.', 'Assemble, dress.'] },
  /* ---- dinner ---- */
  { c: 'Dinner', n: 'Chicken Tikka Masala', tag: 'Dinner · 30 min', mac: '~720 kcal · 52g P', ing: ['200g chicken thigh, chunks', 'Yogurt + garam masala marinade', 'Tomato-cream sauce (light cream or yogurt)', 'Basmati + cauliflower', 'Cilantro'], st: ['Marinate while sauce simmers 10 min.', 'Char chicken under broiler 8 min.', 'Fold into sauce 5 min, over basmati.'] },
  { c: 'Dinner', n: 'Ginger-Garlic Chicken Stir-fry', tag: 'Dinner · 15 min', mac: '~630 kcal · 50g P', ing: ['200g chicken breast, sliced thin', 'Ginger + garlic + scallion', 'Broccoli, peppers, snap peas', 'Soy + oyster sauce + touch of honey', 'Rice or noodles'], st: ['Sear chicken 90 sec/side on high, out.', 'Veg 3 min, aromatics 30 sec.', 'Chicken back + sauce, 1 min. Over rice.'] },
  { c: 'Dinner', n: 'Chicken Tinga Tacos', tag: 'Dinner · 25 min', mac: '~610 kcal · 46g P', ing: ['200g shredded chicken (poach or rotisserie)', 'Chipotle-tomato-onion tinga sauce', '3 corn tortillas', 'Slaw + cotija + lime', 'Refried beans'], st: ['Simmer sauce 10 min, fold in chicken.', 'Warm tortillas, smear beans.', 'Load, slaw, cotija, lime.'] },
  { c: 'Dinner', n: 'Miso-Glazed Chicken Bowl', tag: 'Dinner · 20 min', mac: '~640 kcal · 48g P', ing: ['200g chicken thigh', 'Miso + mirin + honey glaze', 'Rice + edamame', 'Cucumber + sesame', 'Scallion'], st: ['Pan-sear chicken 5 min/side.', 'Brush glaze, 2 min more till lacquered.', 'Slice over rice + edamame.'] },
  { c: 'Dinner', n: 'Greek Lemon Chicken Traybake', tag: 'Dinner · 35 min', mac: '~660 kcal · 52g P', ing: ['220g chicken thighs', 'Lemon + oregano + garlic + olive oil', 'Baby potatoes + red onion', 'Feta + olives to finish', 'Greek yogurt side'], st: ['Everything on one tray, 425°F 30 min.', 'Feta + olives last 5 min.', 'Yogurt on the side. One pan, done.'] },
  { c: 'Dinner', n: 'Harissa Chicken + Sweet Potato', tag: 'Dinner · 30 min', mac: '~650 kcal · 50g P', ing: ['200g chicken breast', 'Harissa + honey + lemon rub', 'Roast sweet potato wedges', 'Greek yogurt + mint', 'Arugula'], st: ['Wedges in at 425°F, 15 min head start.', 'Chicken in same tray 15 min more.', 'Yogurt-mint over everything.'] },
  { c: 'Dinner', n: 'Dal Tadka + Paneer', tag: 'Dinner · 30 min batch', mac: '~640 kcal · 38g P', ing: ['1.5 cups dal (Sunday pot)', '100g paneer', 'Ghee-cumin-garlic tadka', 'Basmati + cauliflower'], st: ['Sizzle tadka 90 sec, pour over dal.', 'Sear paneer, fold in.', 'Over basmati.'] },
  { c: 'Dinner', n: 'Lentil Bolognese', tag: 'Dinner · 25 min', mac: '~650 kcal · 42g P', ing: ['120g protein pasta', '1 cup lentils', 'Marinara + soffritto', 'Parmesan'], st: ['Soffritto 5, sauce + lentils simmer 10.', 'Pasta finishes in sauce.', 'Parm.'] },
  /* ---- snacks & dessert ---- */
  { c: 'Snacks & Dessert', n: 'PB2 Power Shake', tag: 'Post-gym · 2 min', mac: '~420 kcal · 35g P', ing: ['1.5 scoops PB2 Performance', '300ml whole milk', 'Banana + ice', 'Optional: 5g creatine + cacao'], st: ['Blend 30 sec. Done.'] },
  { c: 'Snacks & Dessert', n: 'Cacao Ritual', tag: 'Dessert · 4 min', mac: '~230 kcal · 15g P', ing: ['1 tbsp cacao + ½ scoop PB2', '1 tsp honey', '250ml hot whole milk', 'Pinch salt + cinnamon'], st: ['Whisk cacao+PB2 into splash of hot milk (paste, no lumps).', 'Add rest + honey, whisk frothy.'] },
  { c: 'Snacks & Dessert', n: 'Yogurt Bark', tag: 'Snack · Sunday prep', mac: '~160 kcal · 12g P/slab', ing: ['500g Greek yogurt', 'Honey', 'Berries + choc chips + walnuts'], st: ['Spread 1cm on parchment.', 'Top, freeze 3h, snap.'] },
  { c: 'Snacks & Dessert', n: 'Crispy Chickpeas', tag: 'Snack · 30 min', mac: '~180 kcal · 8g P/cup', ing: ['1 can chickpeas, dried', 'Olive oil + smoked paprika + salt'], st: ['425°F 25–30 min, shake twice.', 'The legal chips.'] },
  { c: 'Snacks & Dessert', n: 'Protein Mug Cake', tag: 'Dessert · 3 min', mac: '~300 kcal · 30g P', ing: ['1 scoop PB2 + 2 tbsp oat flour', '1 egg + milk + baking powder', 'Cacao + honey'], st: ['Stir in mug.', 'Microwave 90 sec.'] },
];

export const RECIPE_CATS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks & Dessert'] as const;

export function allRecipes(userRecipes: Recipe[]): Recipe[] {
  return [...RECIPES, ...userRecipes];
}

export function findRecipe(name: string, userRecipes: Recipe[]): Recipe | undefined {
  const t = name.toLowerCase().split(/[^a-z]+/).filter(x => x.length > 3);
  return allRecipes(userRecipes).find(r => {
    const rn = r.n.toLowerCase();
    return t.some(x => rn.includes(x));
  });
}
