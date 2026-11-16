// Words and phrases Indians commonly say while logging expenses, grouped by category.
// Matching is case-insensitive, whole-word, longest phrase first. Simple plurals
// ("samosas", "tickets") are handled by the matcher, so list the singular form.

export const CATEGORIES = [
  "Food & Drinks",
  "Groceries",
  "Transport",
  "Shopping",
  "Bills & Recharges",
  "Rent & Home",
  "Health",
  "Entertainment",
  "Travel",
  "Education",
  "Personal Care",
  "Gifts & Donations",
  "Finance",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const WORDS: Record<Exclude<Category, "Other">, string> = {
  "Food & Drinks": `
    chai, tea, coffee, cold coffee, filter coffee, cutting chai, green tea, lassi, chaas, buttermilk,
    nimbu pani, lemonade, juice, sugarcane juice, ganne ka juice, coconut water, nariyal pani, milkshake,
    shake, smoothie, cold drink, soft drink, coke, pepsi, sprite, thums up, frooti, maaza, soda,
    energy drink, red bull, water bottle, bisleri, beer, wine, whisky, whiskey, vodka, rum, daaru, alcohol,
    drinks, bar, pub, breakfast, nashta, lunch, dinner, brunch, snack, khana, meal, thali, tiffin, mess,
    canteen, dabba, food, restaurant, hotel food, dhaba, cafe, bakery, sweet shop, mithai, sweets,
    samosa, kachori, vada pav, pav bhaji, misal, poha, upma, idli, dosa, masala dosa, uttapam, vada,
    medu vada, sambar, paratha, aloo paratha, roti, chapati, naan, kulcha, chole bhature, chole kulche,
    rajma chawal, dal chawal, khichdi, pulao, biryani, fried rice, noodles, chowmein, manchurian, momos,
    maggi, pasta, pizza, burger, sandwich, frankie, roll, kathi roll, shawarma, wrap, fries, french fries,
    pani puri, golgappa, puchka, chaat, bhel, bhel puri, sev puri, dahi puri, aloo tikki, pakora, pakoda,
    bhajiya, bhaji, jalebi, gulab jamun, rasgulla, rasmalai, laddu, ladoo, barfi, halwa, kheer, kulfi,
    ice cream, icecream, falooda, cake, pastry, donut, brownie, cookie, biscuit, chips, kurkure, namkeen,
    chocolate, toffee, chewing gum, popcorn, paneer, paneer tikka, butter chicken, chicken, mutton, fish fry,
    kebab, kabab, tandoori, tikka, omelette, egg roll, anda, bun maska, bread omelette, dabeli, khakhra,
    thepla, dhokla, fafda, litti chokha, appam, puttu, parotta, curd rice, pongal, zomato, swiggy,
    eatsure, dominos, pizza hut, mcdonalds, mcd, kfc, burger king, subway, starbucks, ccd, cafe coffee day,
    chaayos, haldiram, bikanervala, barbeque nation, wow momo, behrouz, faasos, paan, supari, cigarette,
    sutta, smoke, gutka, tapri, street food, takeaway, parcel, order food, treat, party food
  `,
  Groceries: `
    grocery, groceries, kirana, ration, sabzi, sabji, vegetables, veggies, fruits, fruit, phal, doodh,
    milk, dahi, curd, butter, ghee, cheese, eggs, bread, atta, maida, besan, chawal, rice, dal, daal,
    toor dal, moong dal, chana, rajma, sugar, cheeni, salt, namak, oil, cooking oil, mustard oil, masala,
    spices, haldi, mirchi, jeera, tea powder, chai patti, coffee powder, onion, pyaaz, potato, aloo,
    tomato, tamatar, ginger, adrak, garlic, lehsun, coriander, dhaniya, lemon, nimbu, banana, kela, apple,
    seb, mango, aam, orange, santra, grapes, angoor, papaya, watermelon, tarbooz, coconut, nariyal,
    dry fruits, kaju, badam, kishmish, peanuts, mungfali, poha packet, suji, rava, oats, cornflakes, muesli,
    jam, ketchup, sauce, pickle, achar, papad, honey, paneer packet, frozen food, meat, fish, prawns,
    chicken raw, mutton raw, blinkit, zepto, instamart, bigbasket, big basket, dmart, d mart, jiomart,
    reliance fresh, reliance smart, more supermarket, spencers, nature's basket, supermarket, mandi,
    sabzi mandi, vegetable market, milk packet, amul, mother dairy, nandini, water can, water jar,
    detergent, surf, washing powder, vim, dishwash, harpic, phenyl, floor cleaner, garbage bags,
    tissue, toilet paper, matchbox, agarbatti, mosquito coil, all out, good knight
  `,
  Transport: `
    rapido, uber, ola, auto, autorickshaw, rickshaw, e rickshaw, toto, cab, taxi, bike taxi, namma yatri,
    indrive, blusmart, metro, metro card, metro recharge, local train, local, bus, bus ticket, bus pass,
    best bus, dtc, bmtc, ksrtc, msrtc, shared auto, tempo, tuk tuk, petrol, diesel, cng, fuel, tank full,
    petrol pump, ev charging, charging station, parking, toll, fastag, fastag recharge, challan,
    traffic fine, puncture, air filling, tyre, bike service, car service, servicing, car wash, bike wash,
    engine oil, mechanic, garage, bike repair, car repair, helmet, yulu, bounce, vogo, rental bike,
    zoomcar, commute, ride, fare, kiraya gaadi, driver, lift
  `,
  Shopping: `
    shopping, clothes, kapde, shirt, t shirt, tshirt, jeans, pant, trousers, shorts, kurta, kurti, saree,
    sari, lehenga, salwar, suit, dupatta, jacket, hoodie, sweater, sweatshirt, blazer, dress, top, skirt,
    innerwear, socks, shoes, sneakers, chappal, sandals, slippers, heels, belt, wallet, purse, handbag,
    bag, backpack, watch, sunglasses, goggles, chashma, cap, jewellery, jewelry, earrings, ring, chain,
    bangles, mobile, phone, smartphone, iphone, mobile cover, phone case, screen guard, tempered glass,
    charger, cable, earphones, headphones, earbuds, airpods, power bank, speaker, laptop, tablet, mouse,
    keyboard, pendrive, hard disk, smartwatch, tv, fridge, washing machine, cooler, fan, ac, heater,
    geyser, mixer, iron, bulb, tubelight, extension board, furniture, chair, table, bed, mattress,
    pillow, bedsheet, blanket, curtain, bottle, tiffin box, utensils, bartan, cooker, tawa, bucket,
    mug, umbrella, raincoat, toys, amazon, flipkart, myntra, ajio, meesho, nykaa, tata cliq, snapdeal,
    croma, reliance digital, decathlon, ikea, zara, h&m, max fashion, pantaloons, westside, zudio,
    lifestyle, shoppers stop, mall, market, tailor, stitching, alteration, online order
  `,
  "Bills & Recharges": `
    recharge, mobile recharge, phone recharge, prepaid, postpaid, phone bill, mobile bill, jio, airtel,
    vi, vodafone, bsnl, data pack, wifi, wifi bill, broadband, internet, internet bill, act fibernet,
    jio fiber, airtel fiber, dth, tata play, tata sky, dish tv, cable tv, electricity, electricity bill,
    bijli, bijli bill, light bill, water bill, pani bill, gas bill, gas cylinder, cylinder, lpg,
    piped gas, indane, hp gas, bharat gas, netflix, prime video, amazon prime, hotstar, jiohotstar,
    disney, sony liv, zee5, spotify, youtube premium, apple music, gaana, jiosaavn, icloud, google one,
    chatgpt, claude, subscription, membership, renewal, annual plan, monthly plan, domain, hosting,
    app purchase, credit card bill, bill payment, bill
  `,
  "Rent & Home": `
    rent, room rent, house rent, flat rent, pg, pg rent, hostel, hostel fee, kiraya, maintenance,
    society maintenance, society, deposit, security deposit, brokerage, broker, maid, bai, kaamwali,
    cook, cook salary, maid salary, cleaning, dhobi, laundry, press, ironing, dry clean, dry cleaning,
    plumber, electrician, carpenter, painter, repair, home repair, pest control, ro service,
    water purifier, ac service, gardener, mali, watchman, security guard, newspaper, akhbar, doodhwala,
    packers movers, shifting, urban company, keys, lock, home decor, paint
  `,
  Health: `
    medicine, medicines, dawai, dawa, tablet strip, tablets, syrup, chemist, pharmacy, medical,
    medical store, medical shop, apollo, pharmeasy, netmeds, 1mg, tata 1mg, doctor, doctor fee,
    consultation, clinic, hospital, opd, checkup, check up, blood test, lab test, test report, xray,
    x ray, scan, mri, ct scan, sonography, ultrasound, dentist, dental, eye test, spectacles, lenses,
    contact lens, physiotherapy, physio, therapy, therapist, vaccine, vaccination, injection, bandage,
    dettol, sanitizer, mask, thermometer, bp machine, protein, whey, supplements, vitamins, multivitamin,
    ayurvedic, homeopathy, gym, gym fee, gym membership, yoga, yoga class, zumba, cult fit, cultfit,
    swimming, health insurance, mediclaim, ambulance, surgery, operation
  `,
  Entertainment: `
    movie, film, cinema, movie ticket, pvr, inox, cinepolis, bookmyshow, book my show, concert, show,
    standup, comedy show, event, event ticket, match ticket, ipl ticket, game, gaming, video game,
    playstation, ps5, xbox, steam, bgmi, uc, free fire, in app purchase, bowling, arcade, game zone,
    go karting, pool, snooker, turf, box cricket, football turf, badminton court, cricket, club,
    clubbing, party, outing, hangout, picnic, amusement park, water park, zoo, museum, exhibition,
    mela, fair, hookah, sheesha, karaoke, dj, book, novel, comics, kindle, magazine, hobby, guitar,
    music class, dance class, painting, craft
  `,
  Travel: `
    flight, flight ticket, air ticket, indigo, air india, vistara, akasa, spicejet, train, train ticket,
    irctc, tatkal, railway, rail ticket, platform ticket, volvo, sleeper bus, redbus, abhibus, hotel,
    hotel room, room booking, stay, oyo, airbnb, resort, homestay, hostel stay, zostel, makemytrip,
    mmt, goibibo, cleartrip, ixigo, easemytrip, trip, tour, vacation, holiday, trek, trekking, camping,
    sightseeing, guide, entry ticket, entry fee, visa, passport, forex, luggage, suitcase, trolley bag,
    travel insurance, airport, airport cab, coolie, porter, boat ride, ropeway, safari, darshan ticket
  `,
  Education: `
    fees, school fee, school fees, college fee, college fees, tuition, tuition fee, coaching,
    coaching fee, class fee, exam fee, exam form, form fee, application fee, admission, course,
    online course, udemy, coursera, unacademy, byjus, physics wallah, pw, books, textbook, notebook,
    copy, register, pen, pencil, eraser, stationery, stationary, xerox, photocopy, printout, print,
    printing, lamination, binding, project, lab fee, library, library fee, hall ticket, certificate,
    workshop, seminar, test series, mock test, calculator, geometry box, school bag, uniform
  `,
  "Personal Care": `
    haircut, hair cut, salon, saloon, barber, nai, parlour, parlor, beauty parlour, shave, shaving,
    trimming, beard, facial, cleanup, waxing, threading, manicure, pedicure, massage, spa, hair colour,
    hair color, mehndi, mehendi, makeup, lipstick, kajal, nail polish, cosmetics, skincare, face wash,
    facewash, moisturizer, sunscreen, cream, lotion, body lotion, perfume, deo, deodorant, shampoo,
    conditioner, hair oil, soap, sabun, body wash, toothpaste, toothbrush, razor, trimmer, comb,
    sanitary pads, pads, tampons, diapers, cotton, talc, powder
  `,
  "Gifts & Donations": `
    gift, gifts, present, birthday gift, wedding gift, anniversary gift, shagun, lifafa, envelope,
    rakhi, bhai dooj, diwali gift, eidi, return gift, greeting card, flowers, bouquet, phool, mala,
    donation, daan, charity, chanda, temple, mandir, dargah, church, gurudwara, pooja, puja,
    pooja samagri, prasad, dakshina, pandit, havan, zakat, tip, bakshish, beggar, ngo, crowdfunding,
    contribution, collection, farewell, birthday party, cake cutting
  `,
  Finance: `
    emi, loan, loan emi, home loan, car loan, bike loan, personal loan, education loan, interest,
    credit card payment, insurance, insurance premium, lic, premium, term insurance, car insurance,
    bike insurance, sip, mutual fund, stocks, shares, investment, invest, zerodha, groww, upstox, fd,
    rd, ppf, nps, gold, digital gold, chit fund, chitty, tax, income tax, gst, tds, late fee, penalty,
    fine, bank charges, atm charges, processing fee, convenience fee, service charge, ca fee, lawyer,
    stamp paper, notary, udhaar, udhar, lent, loan given, sent home, ghar bheja, pocket money
  `,
};

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9&]+/g, " ")
    .trim();
}

const INDEX = new Map<string, Category>();
for (const [category, list] of Object.entries(WORDS)) {
  for (const raw of list.split(",")) {
    const key = normalise(raw);
    if (key && !INDEX.has(key)) INDEX.set(key, category as Category);
  }
}

export const KEYWORD_COUNT = INDEX.size;

function singular(word: string): string {
  if (word.length > 4 && word.endsWith("es") && !word.endsWith("ies")) return word.slice(0, -1);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function lookup(phrase: string, extra?: Map<string, string>): string | undefined {
  return extra?.get(phrase) ?? INDEX.get(phrase);
}

/**
 * Picks a category for a spoken item. `userRules` (the person's own corrections)
 * win over the built-in list. Longer phrases win over shorter ones, and for
 * equal length the earliest phrase in the sentence wins.
 */
export function categorise(text: string, userRules?: Map<string, string>): string {
  const words = normalise(text).split(" ").filter(Boolean);
  if (words.length === 0) return "Other";
  const full = words.join(" ");
  const ruled = userRules?.get(full);
  if (ruled) return ruled;

  for (let size = Math.min(3, words.length); size >= 1; size--) {
    for (let start = 0; start + size <= words.length; start++) {
      const slice = words.slice(start, start + size);
      const exact = lookup(slice.join(" "), userRules);
      if (exact) return exact;
      const last = slice[slice.length - 1];
      const stem = singular(last);
      if (stem !== last) {
        const hit = lookup([...slice.slice(0, -1), stem].join(" "), userRules);
        if (hit) return hit;
      }
    }
  }
  return "Other";
}

export function ruleKey(item: string): string {
  return normalise(item);
}
