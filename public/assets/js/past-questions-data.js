/* EduRise Past Questions bank — WAEC/JAMB style practice questions.
   Plain-text maths only (x^2, sqrt(), ×, ÷) so every student can read it.
   Each item: { q, opts: [4 answers], a: index of correct, why: explanation } */
window.EDURISE_PQ = {
  "Maths": [
    { q: "Simplify: (3x^2 − 5x + 2) + (x^2 + 4x − 7)", opts: ["4x^2 − x − 5", "4x^2 − 9x − 5", "3x^2 − x − 5", "4x^2 + x − 9"], a: 0, why: "Collect like terms: 3x^2 + x^2 = 4x^2; −5x + 4x = −x; 2 − 7 = −5." },
    { q: "Solve for x: 2x + 7 = 19", opts: ["x = 5", "x = 6", "x = 13", "x = 12"], a: 1, why: "Subtract 7 from both sides: 2x = 12, so x = 12 ÷ 2 = 6." },
    { q: "If y varies directly as x and y = 15 when x = 3, find y when x = 7", opts: ["21", "35", "28", "45"], a: 1, why: "Constant k = y/x = 15/3 = 5. So y = 5 × 7 = 35." },
    { q: "Factorise: 4x^2 − 9", opts: ["(2x − 3)(2x − 3)", "(2x + 3)(2x − 3)", "(4x + 1)(x − 9)", "2(x − 3)(2x + 3)"], a: 1, why: "This is a difference of two squares: a^2 − b^2 = (a + b)(a − b), with a = 2x and b = 3." },
    { q: "Find the value of 25% of 480", opts: ["96", "120", "125", "150"], a: 1, why: "25% is one quarter: 480 ÷ 4 = 120." },
    { q: "The area of a circle is 154 cm². Using π = 22/7, find its radius", opts: ["7 cm", "14 cm", "21 cm", "3.5 cm"], a: 0, why: "Area = πr², so r² = 154 × 7/22 = 49, giving r = 7 cm." },
    { q: "Simplify: sqrt(144) + sqrt(25)", opts: ["17", "19", "12", "26"], a: 0, why: "sqrt(144) = 12 and sqrt(25) = 5, so the sum is 12 + 5 = 17." },
    { q: "In a right-angled triangle, the two shorter sides are 6 cm and 8 cm. Find the hypotenuse", opts: ["10 cm", "12 cm", "14 cm", "9 cm"], a: 0, why: "Pythagoras: h² = 6² + 8² = 36 + 64 = 100, so h = 10 cm." },
    { q: "Solve the pair: x + y = 10 and x − y = 4", opts: ["x = 7, y = 3", "x = 6, y = 4", "x = 3, y = 7", "x = 5, y = 5"], a: 0, why: "Add both equations: 2x = 14, so x = 7. Then y = 10 − 7 = 3." },
    { q: "A trader bought an item for ₦4,500 and sold it for ₦5,400. Find the profit percentage", opts: ["15%", "20%", "25%", "18%"], a: 1, why: "Profit = 900. Percentage = 900/4500 × 100 = 20%." },
    { q: "Find the gradient of the line joining (1, 2) and (4, 11)", opts: ["3", "2", "9", "1/3"], a: 0, why: "Gradient = change in y ÷ change in x = (11 − 2)/(4 − 1) = 9/3 = 3." },
    { q: "Expand: (x + 3)(x − 5)", opts: ["x^2 − 2x − 15", "x^2 + 2x − 15", "x^2 − 8x − 15", "x^2 − 2x + 15"], a: 0, why: "x(x−5) + 3(x−5) = x^2 − 5x + 3x − 15 = x^2 − 2x − 15." }
  ],
  "English": [
    { q: "Choose the correct option: She ___ to school every morning.", opts: ["goes", "go", "gone", "going"], a: 0, why: "'She' is third person singular, so the present tense verb takes -s: goes." },
    { q: "Choose the word opposite in meaning to 'abundant'", opts: ["scarce", "plenty", "rich", "ample"], a: 0, why: "Abundant means existing in large quantities; its antonym is scarce (not enough)." },
    { q: "Choose the word nearest in meaning to 'diligent'", opts: ["hardworking", "careless", "lazy", "proud"], a: 0, why: "Diligent describes someone who works carefully and hard." },
    { q: "Identify the adverb: He ran quickly to catch the bus.", opts: ["ran", "quickly", "bus", "catch"], a: 1, why: "'Quickly' describes how he ran, so it is the adverb modifying the verb 'ran'." },
    { q: "Choose the correct spelling", opts: ["accommodation", "accomodation", "acommodation", "accommodetion"], a: 0, why: "Accommodation has double 'c' and double 'm'." },
    { q: "Choose the best option: Neither the teacher nor the students ___ present.", opts: ["were", "was", "are", "is"], a: 0, why: "With 'neither...nor', the verb agrees with the nearer subject: 'students' (plural), so 'were'." },
    { q: "What figure of speech is: 'The classroom was a market place'?", opts: ["metaphor", "simile", "irony", "hyperbole"], a: 0, why: "It directly calls one thing another without 'like' or 'as', which makes it a metaphor." },
    { q: "Choose the correct option: I have ___ my homework already.", opts: ["done", "did", "do", "doing"], a: 0, why: "After 'have', use the past participle 'done' (present perfect tense)." },
    { q: "Which of these is a collective noun?", opts: ["flock", "sheep", "field", "grass"], a: 0, why: "'Flock' names a group of birds, so it is a collective noun." },
    { q: "Choose the option that best completes: If I ___ rich, I would build a school.", opts: ["were", "am", "was being", "will be"], a: 0, why: "This is the second conditional (unreal present): 'If I were rich...'." },
    { q: "Select the correct plural: analysis", opts: ["analyses", "analysises", "analysis", "analyzies"], a: 0, why: "Words ending in -is form their plural with -es: analysis → analyses." },
    { q: "In the sentence 'The girl with the red bag is my sister', the phrase 'with the red bag' is", opts: ["an adjective phrase", "an adverb phrase", "a noun phrase", "a preposition only"], a: 0, why: "It describes the girl, so it works as an adjective phrase qualifying the noun." }
  ],
  "Chemistry": [
    { q: "What is the chemical symbol for sodium?", opts: ["Na", "So", "S", "Sd"], a: 0, why: "Sodium's symbol Na comes from its Latin name 'natrium'." },
    { q: "How many protons does a carbon atom have?", opts: ["6", "12", "8", "14"], a: 0, why: "Carbon's atomic number is 6, which equals its number of protons." },
    { q: "Which gas is released when an acid reacts with a carbonate?", opts: ["Carbon dioxide", "Hydrogen", "Oxygen", "Nitrogen"], a: 0, why: "Acid + carbonate → salt + water + carbon dioxide. That is the gas that turns lime water milky." },
    { q: "What is the pH of a neutral solution at 25°C?", opts: ["7", "0", "14", "1"], a: 0, why: "Pure water at 25°C has equal H+ and OH− concentrations, giving pH 7." },
    { q: "Water is made up of hydrogen and oxygen in the ratio", opts: ["2 : 1 by volume", "1 : 2 by volume", "1 : 8 by mass", "8 : 1 by mass"], a: 0, why: "In electrolysis of water, hydrogen and oxygen are released in a 2 : 1 volume ratio." },
    { q: "Which of these is a noble gas?", opts: ["Argon", "Nitrogen", "Chlorine", "Fluorine"], a: 0, why: "Argon is in Group 18 (Group 0), the noble or inert gases." },
    { q: "The IUPAC name of the compound with formula NaOH is", opts: ["sodium hydroxide", "sodium oxide hydroxide", "sodium water", "sodium oxyhydrate"], a: 0, why: "Na+ (sodium) + OH− (hydroxide) → sodium hydroxide, a strong alkali." },
    { q: "Rusting of iron requires the presence of", opts: ["water and oxygen", "water only", "oxygen only", "carbon dioxide and water"], a: 0, why: "Rust is hydrated iron(III) oxide; both water and oxygen must be present. Salt only speeds it up." },
    { q: "How many electrons can the first shell hold?", opts: ["2", "8", "18", "32"], a: 0, why: "The K shell (n = 1) holds a maximum of 2 electrons." },
    { q: "An example of a chemical change is", opts: ["burning wood", "melting ice", "dissolving sugar", "breaking glass"], a: 0, why: "Burning produces new substances (ash, CO2, water vapour), so it is a chemical change. The others keep the same substance." },
    { q: "What salt is produced when hydrochloric acid reacts with potassium hydroxide?", opts: ["Potassium chloride", "Potassium oxide", "Potassium carbonate", "Sodium chloride"], a: 0, why: "HCl + KOH → KCl + H2O. The salt is potassium chloride." },
    { q: "The relative atomic mass of chlorine is about 35.5 because", opts: ["it is an average of its isotopes", "it has 35.5 protons", "it is radioactive", "it loses half an electron"], a: 0, why: "Chlorine's two main isotopes, Cl-35 (about 75%) and Cl-37 (about 25%), average to about 35.5." }
  ],
  "Physics": [
    { q: "The SI unit of force is", opts: ["newton", "joule", "watt", "pascal"], a: 0, why: "1 newton accelerates a 1 kg mass at 1 m/s² (F = ma)." },
    { q: "A body moves 100 m in 20 s. Its average speed is", opts: ["5 m/s", "2000 m/s", "0.2 m/s", "20 m/s"], a: 0, why: "Speed = distance ÷ time = 100 ÷ 20 = 5 m/s." },
    { q: "Which of these is a vector quantity?", opts: ["Velocity", "Mass", "Distance", "Temperature"], a: 0, why: "A vector has both magnitude and direction. Velocity (speed + direction) qualifies; the rest are scalars." },
    { q: "The energy stored in a stretched catapult rubber is", opts: ["potential energy", "kinetic energy", "heat energy", "chemical energy"], a: 0, why: "Work done in stretching is stored as elastic potential energy, released when it returns to shape." },
    { q: "If the resultant force on a body is zero, the body", opts: ["is in equilibrium", "must be moving fast", "is always at rest", "is accelerating"], a: 0, why: "Zero resultant force means no acceleration: the body stays at rest or moves at constant velocity (equilibrium)." },
    { q: "A machine with effort 50 N lifts a load of 150 N. Its mechanical advantage is", opts: ["3", "0.33", "100", "7500"], a: 0, why: "MA = load ÷ effort = 150 ÷ 50 = 3." },
    { q: "Sound cannot travel through", opts: ["a vacuum", "air", "water", "steel"], a: 0, why: "Sound needs a medium of particles to vibrate; a vacuum has no particles." },
    { q: "The main energy conversion in a torch light (dynamo type) when shaken is", opts: ["mechanical to electrical", "electrical to chemical", "heat to light", "chemical to sound"], a: 0, why: "The coil moving in a magnetic field converts mechanical (kinetic) energy into electrical energy." },
    { q: "An object weighs 20 N on Earth where g = 10 m/s². Its mass is", opts: ["2 kg", "20 kg", "200 kg", "0.5 kg"], a: 0, why: "Weight = mass × g, so mass = weight ÷ g = 20 ÷ 10 = 2 kg." },
    { q: "Which instrument measures atmospheric pressure?", opts: ["Barometer", "Hydrometer", "Ammeter", "Manometer measures water only"], a: 0, why: "A barometer measures atmospheric pressure; a hydrometer measures relative density." },
    { q: "Total internal reflection happens when light travels", opts: ["from a denser to a less dense medium beyond the critical angle", "from air to glass at any angle", "only inside a vacuum", "through a pinhole"], a: 0, why: "Going from dense to less dense medium at an angle greater than the critical angle reflects all light back." },
    { q: "The half-life of a radioactive element is the time taken for", opts: ["half the original atoms to decay", "the element to cool by half", "its mass to double", "radiation to stop completely"], a: 0, why: "Half-life is the time for half of the unstable nuclei present to decay." }
  ]
};
