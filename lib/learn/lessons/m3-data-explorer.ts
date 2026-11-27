import { classList, menu } from "../datasets";
import type { Lesson } from "../types";

/** Module 3 · Data Explorer: sharper questions (DISTINCT, LIMIT, AND/OR, IN/BETWEEN, LIKE). */
export const dataExplorer: Lesson[] = [
  {
    id: "distinct",
    summary: "DISTINCT removes repeated rows, so each value appears only once.",
    minutes: 6,
    tables: [classList, menu],
    steps: [
      {
        kind: "story",
        title: "Pins on a map",
        emoji: "🗺️",
        body: "The principal wants a map in the school hall with **one pin for every city** our students come from.\n\nShe asks you for the list of cities. Look at the register below.",
        paper: "students",
        think: {
          question: "If you copy the city column from top to bottom, how many times would you write Pune?",
          answer:
            "Three times: Rahul, Sneha and Rohan all live in Pune. But the map needs only one Pune pin, so the repeats have to go.",
        },
      },
      {
        kind: "explore",
        title: "Spot the repeats",
        body: "Look down the city column. Some cities appear more than once because several students live there.",
        table: "students",
        tasks: [
          { type: "click-column", prompt: "Tap the city column header", column: "city" },
          { type: "click-row", prompt: "Tap a student who lives in Pune", match: { column: "city", value: "Pune" } },
          {
            type: "click-row",
            prompt: "Tap a student who lives in Mumbai",
            match: { column: "city", value: "Mumbai" },
          },
        ],
      },
      {
        kind: "animate",
        title: "Watch the repeats disappear",
        body: "The database takes the city column, spots every value it has already seen, and keeps just one copy of each.",
        query: "SELECT DISTINCT city FROM students",
        narration: {
          "source.show": "Step 1: Here are all 8 students.",
          "project.pick": "Step 2: We only need one detail from each row: the city.",
          "project.result": "Now we have a list of 8 cities, with repeats.",
          "distinct.check": "Step 3: Pune appears three times and Mumbai twice. The extra copies are repeats.",
          "distinct.keep": "Step 4: Only the first copy of each city is kept.",
          result: "Here is the list for the map: 5 cities, no repeats.",
        },
      },
      {
        kind: "concept",
        title: "Keeping one of each",
        body: "Removing repeated rows so that each one appears only once is called keeping the **distinct** values. Nothing is deleted from the table: the answer simply skips the copies.",
        points: [
          { emoji: "🔁", title: "Repeats", text: "Two rows are repeats when every value in them is the same." },
          { emoji: "✂️", title: "One copy stays", text: "The first copy is kept; the other copies are left out." },
          {
            emoji: "🧩",
            title: "Whole rows count",
            text: "With two columns, a row is a repeat only if *both* values match. Pune and 20 is different from Pune and 21.",
          },
        ],
        compare: {
          before: { label: "Every student's row", table: "students" },
          after: { label: "Each city once", query: "SELECT DISTINCT city FROM students" },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: DISTINCT",
        body: "In SQL you write **DISTINCT** straight after SELECT. Tap each part of the query to see the step it controls.",
        query: "SELECT DISTINCT city\nFROM students",
        explain: {
          select: "SELECT DISTINCT city means: show the city column, but only one copy of each value.",
          from: "FROM students says which table to look in.",
        },
      },
      {
        kind: "playground",
        title: "Your turn to explore",
        body: "Run the query, then try the suggestions. Compare the result with and without DISTINCT.",
        starter: "SELECT DISTINCT city\nFROM students",
        suggestions: [
          "SELECT city FROM students",
          "SELECT DISTINCT city FROM students ORDER BY city",
          "SELECT DISTINCT city, age FROM students",
          "SELECT DISTINCT category FROM products",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "How many rows does this query return?",
        code: "SELECT DISTINCT city FROM students",
        table: "students",
        options: ["5", "8", "3", "1"],
        answer: 0,
        explain: "There are 8 students but only 5 different cities: Pune, Mumbai, Bangalore, Delhi and Chennai.",
      },
      {
        kind: "choice",
        prompt: "What does `SELECT city FROM students` return, **without** DISTINCT?",
        options: ["All 8 cities, repeats included", "5 cities, no repeats", "Only the first city", "Only Pune"],
        answer: 0,
        explain: "Without DISTINCT you get one row per student, so Pune shows up three times and Mumbai twice.",
      },
      {
        kind: "order",
        prompt: "Build the query that lists every city **only once**.",
        tokens: ["SELECT", "DISTINCT", "city", "FROM", "students"],
        distractors: ["UNIQUE", "WHERE"],
        explain: "DISTINCT goes right after SELECT, before the column names.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "The restaurant is printing section headings for its menu. Show each **category** from `products` **once**, in alphabetical order.",
      tables: ["products"],
      starter: "SELECT category\nFROM products\n",
      solution: "SELECT DISTINCT category FROM products ORDER BY category",
      requires: ["DISTINCT"],
      hints: [
        "Add DISTINCT after SELECT so each category appears once.",
        "Sort with ORDER BY category: `SELECT DISTINCT category FROM products ORDER BY category`.",
      ],
    },
    takeaways: [
      "DISTINCT keeps only one copy of each repeated row.",
      "It goes straight after SELECT: SELECT DISTINCT city.",
      "With several columns, a row is a repeat only if every value matches.",
    ],
    cheatsheet: [
      { sql: "SELECT DISTINCT city FROM students", meaning: "Each city once" },
      { sql: "SELECT DISTINCT category FROM products ORDER BY category", meaning: "Each category once, A to Z" },
    ],
  },
  {
    id: "limit",
    summary: "LIMIT keeps just the first few rows, like a top-3 list.",
    minutes: 6,
    tables: [menu],
    steps: [
      {
        kind: "story",
        title: "The Chef's Specials board",
        emoji: "🏆",
        body: "The restaurant has a small board by the door with room for **three dishes**. The owner wants the **three most expensive** dishes on it.\n\nHere is the full menu.",
        paper: "products",
        think: {
          question: "How would you pick the three dishes by hand?",
          answer:
            "Line the dishes up from the highest price to the lowest, then take the first three. Sorting first is the key: the top of a jumbled list means nothing.",
        },
      },
      {
        kind: "explore",
        title: "Sort the menu yourself",
        body: "Sort the table by price and see which dishes rise to the top.",
        table: "products",
        tasks: [
          { type: "sort", prompt: "Sort the menu by price", column: "price" },
          {
            type: "click-row",
            prompt: "Tap the most expensive dish",
            match: { column: "name", value: "Chicken Biryani" },
          },
        ],
      },
      {
        kind: "animate",
        title: "Watch the top three appear",
        body: "The database does what you would: it sorts the dishes by price, then counts off the first three.",
        query: "SELECT name, price FROM products ORDER BY price DESC LIMIT 3",
        narration: {
          "source.show": "Step 1: Here is the whole menu: 10 dishes.",
          "project.pick": "Step 2: We only need each dish's name and price.",
          "project.result": "Every other detail is left out.",
          "sort.keys": "Step 3: We look at every dish's price.",
          "sort.move": "The dishes line up from most expensive to cheapest.",
          "limit.cut": "Step 4: Now we count off the first three.",
          "limit.keep": "Everything after the third dish is dropped.",
          result: "Here are the Chef's Specials.",
        },
      },
      {
        kind: "concept",
        title: "Just the first few",
        body: "Keeping only the first few rows of an answer is called **limiting** it. It is how websites show a *top 10* or the *5 newest* posts.",
        points: [
          {
            emoji: "↕️",
            title: "Sort first",
            text: "Without sorting, *the first three* are just whichever rows happen to come first.",
          },
          { emoji: "🔢", title: "Then count off", text: "Keep the first N rows and drop the rest." },
          {
            emoji: "🏁",
            title: "It happens last",
            text: "Limiting is the very last step, after filtering and sorting.",
          },
        ],
        compare: {
          before: { label: "The full menu", table: "products" },
          after: { label: "Top 3 by price", query: "SELECT name, price FROM products ORDER BY price DESC LIMIT 3" },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: LIMIT",
        body: "**LIMIT** goes at the very end of the query, followed by how many rows to keep. Tap each part to see its step.",
        query: "SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 3",
        explain: {
          select: "SELECT name, price chooses the two columns to show.",
          from: "FROM products says which table to look in.",
          order: "ORDER BY price DESC sorts from the highest price to the lowest.",
          limit: "LIMIT 3 keeps only the first three rows of the sorted list.",
        },
      },
      {
        kind: "playground",
        title: "Make your own top lists",
        body: "Change the number, flip the sort order, or add a WHERE. Watch where the cut happens.",
        starter: "SELECT name, price\nFROM products\nORDER BY price DESC\nLIMIT 3",
        suggestions: [
          "SELECT name, price FROM products ORDER BY price LIMIT 3",
          "SELECT name FROM products WHERE category = 'Drink' ORDER BY price DESC LIMIT 1",
          "SELECT * FROM products LIMIT 5",
          "SELECT name, price FROM products ORDER BY price DESC LIMIT 5",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "What does this query show?",
        code: "SELECT name FROM products ORDER BY price LIMIT 2",
        options: ["The 2 cheapest dishes", "The 2 most expensive dishes", "Two random dishes", "Every dish twice"],
        answer: 0,
        explain:
          "ORDER BY price sorts from cheapest to most expensive, and LIMIT 2 keeps the first two: Masala Chai and Samosa.",
      },
      {
        kind: "choice",
        prompt: "Why do we usually write ORDER BY together with LIMIT?",
        options: [
          "So that *the first few rows* are the ones we actually want",
          "Because LIMIT gives an error without ORDER BY",
          "Because ORDER BY makes the numbers smaller",
        ],
        answer: 0,
        explain:
          "LIMIT works on its own, but without sorting, the first rows are just whichever ones the database has to hand. Sort first to get a real top list.",
      },
      {
        kind: "order",
        prompt: "Build a query that shows the **single most expensive** dish.",
        tokens: ["SELECT", "name", "FROM", "products", "ORDER BY", "price", "DESC", "LIMIT", "1"],
        distractors: ["ASC"],
        explain: "Sort by price with the highest first (DESC), then LIMIT 1 keeps just the top row.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "The café wants a *Cheap Eats* board. Show the **name** and **price** of the **4 cheapest** dishes, cheapest first.",
      tables: ["products"],
      starter: "SELECT name, price\nFROM products\nORDER BY price\n",
      solution: "SELECT name, price FROM products ORDER BY price LIMIT 4",
      requires: ["ORDER BY", "LIMIT"],
      hints: [
        "The list is already sorted cheapest first. Now keep only the first few rows.",
        "Add `LIMIT 4` on the last line.",
      ],
    },
    takeaways: [
      "LIMIT keeps only the first few rows of the result.",
      "Sort with ORDER BY first, so the first rows are the ones you want.",
      "LIMIT goes at the very end of the query.",
    ],
    cheatsheet: [
      { sql: "SELECT name, price FROM products ORDER BY price DESC LIMIT 3", meaning: "The 3 most expensive dishes" },
      { sql: "SELECT name FROM products ORDER BY price LIMIT 1", meaning: "The cheapest dish" },
    ],
  },
  {
    id: "and-or",
    summary: "AND needs every condition to be true; OR needs at least one.",
    minutes: 7,
    tables: [classList],
    steps: [
      {
        kind: "story",
        title: "Casting the school play",
        emoji: "🎭",
        body: "The drama club rehearses late in the evening in Pune. The teacher needs volunteers who are **older than 18** *and* who **live in Pune**, so they can get home safely.\n\nSome students fit one rule but not the other.",
        paper: "students",
        think: {
          question: "Rahul is 20 and lives in Pune. Rohan is 16 and also lives in Pune. Who can volunteer?",
          answer:
            "Only Rahul. Rohan lives in Pune, but he isn't older than 18. Both rules have to be true at the same time.",
        },
      },
      {
        kind: "predict",
        title: "Two rules at once",
        body: "Check each student against both rules.",
        table: "students",
        query: "SELECT * FROM students WHERE age > 18 AND city = 'Pune'",
        prompt: "Tap every student who is older than 18 **and** lives in Pune.",
        explain:
          "Only Rahul and Sneha pass both checks. Rohan lives in Pune but is 16; Priya and Meera are old enough but live elsewhere.",
      },
      {
        kind: "animate",
        title: "Both answers must be yes",
        body: "The database asks both questions of every student and keeps only the rows where both answers are yes.",
        query: "SELECT * FROM students WHERE age > 18 AND city = 'Pune'",
        narration: {
          "source.show": "Here are all the students.",
          "where.check": "We ask two questions of every student: older than 18? Lives in Pune? Both must be yes.",
          "where.keep": "Only the students with two yeses stay.",
          "project.pick": "We keep all of each student's details.",
          result: "Here are the volunteers for the play.",
        },
      },
      {
        kind: "animate",
        title: "Now: either answer will do",
        body: "The sports team is less fussy. It takes anyone who is **older than 20**, *or* anyone who **lives in Pune** (they train in Pune). One yes is enough.",
        query: "SELECT * FROM students WHERE age > 20 OR city = 'Pune'",
        narration: {
          "source.show": "Here are all the students again.",
          "where.check": "We ask both questions again, but this time one yes is enough.",
          "where.keep": "Every student with at least one yes stays. Only students with two noes are left out.",
          "project.pick": "We keep all of each student's details.",
          result: "Here is the sports team: more students, because the rule is easier to pass.",
        },
      },
      {
        kind: "concept",
        title: "Both, or at least one",
        body: "Joining two yes-or-no questions together gives you a sharper (or wider) filter.",
        points: [
          {
            emoji: "🤝",
            title: "Both must pass",
            text: "*Older than 18* **and** *from Pune*: fewer rows, because each row must pass twice.",
          },
          {
            emoji: "🙌",
            title: "At least one",
            text: "*Older than 20* **or** *from Pune*: more rows, because one pass is enough.",
          },
          {
            emoji: "🧮",
            title: "Order matters",
            text: "Like × before + in maths, *both* is worked out before *either*. Brackets change the order, just like in maths.",
          },
        ],
        compare: {
          before: { label: "All students", table: "students" },
          after: {
            label: "Older than 20, or from Pune",
            query: "SELECT * FROM students WHERE age > 20 OR city = 'Pune'",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: AND and OR",
        body: "In SQL you join conditions with the words **AND** and **OR**. Tap each part to see its step.",
        query: "SELECT name, age, city\nFROM students\nWHERE age > 18\n  AND city = 'Pune'",
        explain: {
          select: "SELECT name, age, city chooses three columns to show.",
          from: "FROM students says which table to look in.",
          where:
            "WHERE age > 18 AND city = 'Pune' keeps a row only when both comparisons are true. Swap AND for OR and one true comparison is enough.",
        },
      },
      {
        kind: "concept",
        title: "Brackets keep it clear",
        body: "When you mix AND and OR, AND is checked first. That can surprise you:",
        points: [
          {
            emoji: "😬",
            title: "Without brackets",
            text: "`city = 'Pune' OR city = 'Mumbai' AND age >= 18` means *from Pune*, or *from Mumbai and 18+*. Rohan (16, Pune) sneaks in!",
          },
          {
            emoji: "✅",
            title: "With brackets",
            text: "`(city = 'Pune' OR city = 'Mumbai') AND age >= 18` means *from either city*, and *18+*.",
          },
          { emoji: "💡", title: "Rule of thumb", text: "Mixing AND with OR? Put brackets around the OR part." },
        ],
      },
      {
        kind: "playground",
        title: "Combine your own rules",
        body: "Try the suggestions, then mix AND, OR and brackets yourself. Watch how each row is checked.",
        starter: "SELECT name, age, city\nFROM students\nWHERE age > 18 AND city = 'Pune'",
        suggestions: [
          "SELECT name FROM students WHERE city = 'Pune' OR city = 'Mumbai'",
          "SELECT name FROM students WHERE age >= 18 AND age <= 20",
          "SELECT name FROM students WHERE city = 'Pune' OR city = 'Mumbai' AND age >= 18",
          "SELECT name FROM students WHERE (city = 'Pune' OR city = 'Mumbai') AND age >= 18",
        ],
      },
    ],
    check: [
      {
        kind: "pick-rows",
        prompt: "Which rows does `SELECT * FROM students WHERE city = 'Mumbai' OR age < 18` return? Tap them all.",
        table: "students",
        query: "SELECT * FROM students WHERE city = 'Mumbai' OR age < 18",
        explain:
          "Priya and Ananya live in Mumbai; Kabir and Rohan are under 18. With OR, passing either check is enough.",
      },
      {
        kind: "choice",
        prompt: "Meera is 23 and lives in Chennai. Does she pass `WHERE age > 18 AND city = 'Pune'`?",
        options: [
          "No: she passes only one of the two checks",
          "Yes: one pass is enough",
          "Yes: AND keeps everyone over 18",
        ],
        answer: 0,
        explain: "AND needs both comparisons to be true. Meera is old enough, but she doesn't live in Pune.",
      },
      {
        kind: "choice",
        prompt: "Which condition finds students from **Pune or Delhi**?",
        options: [
          "WHERE city = 'Pune' OR city = 'Delhi'",
          "WHERE city = 'Pune' AND city = 'Delhi'",
          "WHERE city = 'Pune' OR 'Delhi'",
          "WHERE city = 'Pune, Delhi'",
        ],
        answer: 0,
        explain:
          "With AND, a student would have to live in both cities at once, so nobody matches. Each side of OR must be a full comparison: city = 'Delhi'.",
      },
      {
        kind: "order",
        prompt: "Build a query for the **names** of students who are **under 18 and live in Pune**.",
        tokens: ["SELECT", "name", "FROM", "students", "WHERE", "age", "<", "18", "AND", "city", "=", "'Pune'"],
        distractors: ["OR"],
        explain: "Both things must be true, so the two comparisons are joined with AND. Only Rohan fits.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "A city tour is open to students who live in **Pune or Mumbai** and are **at least 18**. Show the **name** of every student who can go.",
      tables: ["students"],
      starter: "SELECT name\nFROM students\nWHERE city = 'Pune'",
      solution: "SELECT name FROM students WHERE (city = 'Pune' OR city = 'Mumbai') AND age >= 18",
      requires: ["AND", "OR"],
      hints: [
        "Two cities means OR. The age rule must also hold, which means AND.",
        "Put the OR part in brackets: `WHERE (city = 'Pune' OR city = 'Mumbai') AND age >= 18`.",
      ],
    },
    takeaways: [
      "AND keeps a row only when every condition is true.",
      "OR keeps a row when at least one condition is true.",
      "AND is checked before OR, so use brackets when you mix them.",
    ],
    cheatsheet: [
      { sql: "SELECT * FROM students WHERE age > 18 AND city = 'Pune'", meaning: "Over 18 and from Pune" },
      { sql: "SELECT * FROM students WHERE city = 'Pune' OR city = 'Delhi'", meaning: "From Pune or from Delhi" },
      {
        sql: "SELECT * FROM students WHERE (city = 'Pune' OR city = 'Mumbai') AND age >= 18",
        meaning: "From either city, and 18 or older",
      },
    ],
  },
  {
    id: "in-between",
    summary: "IN checks a value against a list; BETWEEN checks that it falls in a range.",
    minutes: 7,
    tables: [menu],
    steps: [
      {
        kind: "story",
        title: "The evening menu",
        emoji: "🌇",
        body: "After 4 pm the café's kitchen closes, so the evening menu shows only **Drinks** and **Desserts**.\n\nThe café also has a *value range*: dishes priced from **₹90 to ₹180**, both ends included.",
        paper: "products",
        think: {
          question: "Mango Lassi costs exactly ₹90. Is it in the ₹90 to ₹180 range?",
          answer: "Yes. *From ₹90 to ₹180* includes both ends, so a dish at exactly ₹90 or ₹180 counts.",
        },
      },
      {
        kind: "predict",
        title: "A list of categories",
        body: "First, the evening menu.",
        table: "products",
        query: "SELECT * FROM products WHERE category IN ('Drink', 'Dessert')",
        prompt: "Tap every dish whose category is **Drink** or **Dessert**.",
        explain: "Three drinks and one dessert: Mango Lassi, Masala Chai, Cold Coffee and Gulab Jamun.",
      },
      {
        kind: "animate",
        title: "Is it on the list?",
        body: "Instead of asking *is it a Drink? is it a Dessert?* separately, the database checks each category against a short list.",
        query: "SELECT * FROM products WHERE category IN ('Drink', 'Dessert')",
        narration: {
          "source.show": "Here is the whole menu.",
          "where.check": "For each dish we ask: is its category on our list (Drink, Dessert)?",
          "where.keep": "Dishes whose category is on the list stay.",
          "project.pick": "We keep all of each dish's details.",
          result: "Here is the evening menu.",
        },
      },
      {
        kind: "predict",
        title: "A range of prices",
        body: "Now the value range.",
        table: "products",
        query: "SELECT * FROM products WHERE price BETWEEN 90 AND 180",
        prompt: "Tap every dish priced from **₹90 up to ₹180**, including both ends.",
        explain:
          "Mango Lassi (₹90) and Paneer Tikka (₹180) sit exactly on the ends, so they count, along with Masala Dosa, Pav Bhaji and Cold Coffee.",
      },
      {
        kind: "animate",
        title: "Is it in the range?",
        body: "A range is two checks in one: *at least the low end* and *at most the high end*.",
        query: "SELECT * FROM products WHERE price BETWEEN 90 AND 180",
        narration: {
          "source.show": "Here is the whole menu again.",
          "where.check": "For each dish we ask: is the price at least 90 and at most 180?",
          "where.keep": "Dishes inside the range stay, including the ones exactly on the edges.",
          "project.pick": "We keep all of each dish's details.",
          result: "Here is the value range.",
        },
      },
      {
        kind: "concept",
        title: "Lists and ranges",
        body: "Two handy shortcuts for questions you would otherwise write with lots of ORs and ANDs.",
        points: [
          {
            emoji: "📋",
            title: "In a list",
            text: "*Category is Drink or Dessert* is one check against a list, however long the list is.",
          },
          {
            emoji: "📏",
            title: "In a range",
            text: "*Price from 90 to 180* includes both ends: 90 and 180 both count.",
          },
          { emoji: "🔄", title: "Flip it", text: "Add NOT to keep everything *outside* the list or range instead." },
        ],
        compare: {
          before: { label: "The whole menu", table: "products" },
          after: {
            label: "From ₹90 to ₹180",
            query: "SELECT name, price FROM products WHERE price BETWEEN 90 AND 180",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: IN",
        body: "**IN** is followed by a list in brackets, with commas between the values. Tap each part to see its step.",
        query: "SELECT name, category\nFROM products\nWHERE category IN ('Drink', 'Dessert')",
        explain: {
          select: "SELECT name, category chooses two columns to show.",
          from: "FROM products says which table to look in.",
          where: "WHERE category IN ('Drink', 'Dessert') keeps a row when its category matches anything in the list.",
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: BETWEEN",
        body: "**BETWEEN** takes a low value, the word AND, and a high value. Both ends are included.",
        query: "SELECT name, price\nFROM products\nWHERE price BETWEEN 90 AND 180",
        explain: {
          select: "SELECT name, price chooses two columns to show.",
          from: "FROM products says which table to look in.",
          where: "WHERE price BETWEEN 90 AND 180 keeps prices from 90 up to 180, including 90 and 180 themselves.",
        },
      },
      {
        kind: "playground",
        title: "Your turn",
        body: "Try different lists and ranges, and try NOT IN and NOT BETWEEN.",
        starter: "SELECT name, price\nFROM products\nWHERE price BETWEEN 90 AND 180",
        suggestions: [
          "SELECT name FROM products WHERE category IN ('Main', 'Snack')",
          "SELECT name FROM products WHERE category NOT IN ('Drink')",
          "SELECT name, price FROM products WHERE price NOT BETWEEN 50 AND 200",
          "SELECT name FROM products WHERE product_id IN (1, 3, 5)",
        ],
      },
    ],
    check: [
      {
        kind: "pick-rows",
        prompt: "Which rows does `SELECT * FROM products WHERE category IN ('Snack', 'Dessert')` return? Tap them all.",
        table: "products",
        query: "SELECT * FROM products WHERE category IN ('Snack', 'Dessert')",
        explain: "Paneer Tikka and Samosa are Snacks, and Gulab Jamun is a Dessert.",
      },
      {
        kind: "choice",
        prompt: "Mango Lassi costs ₹90. Does `WHERE price BETWEEN 90 AND 180` keep it?",
        options: ["Yes: BETWEEN includes both ends", "No: 90 is on the edge, so it's left out", "Only if it's a Drink"],
        answer: 0,
        explain: "BETWEEN 90 AND 180 means price >= 90 AND price <= 180, so 90 itself is included.",
      },
      {
        kind: "choice",
        prompt: "Which condition means the same as `category IN ('Drink', 'Dessert')`?",
        options: [
          "category = 'Drink' OR category = 'Dessert'",
          "category = 'Drink' AND category = 'Dessert'",
          "category BETWEEN 'Drink' AND 'Dessert'",
        ],
        answer: 0,
        explain:
          "IN is a shortcut for several = comparisons joined with OR: a match with any value in the list is enough.",
      },
      {
        kind: "order",
        prompt: "Build a query for the **names** of dishes priced **from ₹100 to ₹150**.",
        tokens: ["SELECT", "name", "FROM", "products", "WHERE", "price", "BETWEEN", "100", "AND", "150"],
        distractors: ["IN"],
        explain: "A range of prices is a job for BETWEEN low AND high.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "A customer wants a **Main** or a **Snack** that costs **₹100 to ₹200**. Show the **name** and **price** of every dish that fits.",
      tables: ["products"],
      starter: "SELECT name, price\nFROM products\n",
      solution: "SELECT name, price FROM products WHERE category IN ('Main', 'Snack') AND price BETWEEN 100 AND 200",
      requires: ["IN", "BETWEEN"],
      hints: [
        "Use IN for the two categories and BETWEEN for the price, joined with AND.",
        "`WHERE category IN ('Main', 'Snack') AND price BETWEEN 100 AND 200`",
      ],
    },
    takeaways: [
      "IN checks whether a value is in a list: category IN ('Drink', 'Dessert').",
      "BETWEEN checks a range, and both ends are included.",
      "NOT IN and NOT BETWEEN keep everything outside the list or range.",
    ],
    cheatsheet: [
      { sql: "SELECT * FROM products WHERE category IN ('Drink', 'Dessert')", meaning: "Drinks and desserts" },
      { sql: "SELECT * FROM products WHERE price BETWEEN 90 AND 180", meaning: "Prices from 90 to 180, ends included" },
    ],
  },
  {
    id: "like",
    summary: "LIKE finds text that matches a pattern, such as names starting with A.",
    minutes: 7,
    tables: [classList, menu],
    steps: [
      {
        kind: "story",
        title: "A half-rubbed-off label",
        emoji: "🧴",
        body: "Someone left a water bottle in the classroom. The name label is rubbed off: all you can read is the first letter, **A**.\n\nWho could it belong to?",
        paper: "students",
        think: {
          question: "How would you find the possible owners in the register?",
          answer:
            "Look at the first letter of every name and keep the ones that start with A. The rest of the name can be anything.",
        },
      },
      {
        kind: "predict",
        title: "Find the A names",
        body: "Look only at how each name starts.",
        table: "students",
        query: "SELECT * FROM students WHERE name LIKE 'A%'",
        prompt: "Tap every student whose name **starts with A**.",
        explain: "Amit and Ananya both start with a capital A. What comes after the A doesn't matter.",
      },
      {
        kind: "animate",
        title: "Matching a pattern",
        body: "The database compares every name with a *pattern*: an A, followed by anything at all.",
        query: "SELECT * FROM students WHERE name LIKE 'A%'",
        narration: {
          "source.show": "Here are all the students.",
          "where.check": "For each student we ask: does the name start with A, followed by anything?",
          "where.keep": "Only the names that fit the pattern stay.",
          "project.pick": "We keep all of each student's details.",
          result: "These are the possible owners of the bottle.",
        },
      },
      {
        kind: "animate",
        title: "Anywhere in the name",
        body: "Patterns can match the middle of a word too. Here the café looks for every dish with **Masala** somewhere in its name.",
        query: "SELECT name FROM products WHERE name LIKE '%Masala%'",
        narration: {
          "source.show": "Here is the café's menu.",
          "where.check": "For each dish we ask: does Masala appear anywhere in the name?",
          "where.keep": "Masala Dosa and Masala Chai fit the pattern.",
          "project.pick": "We only need the dish names.",
          "project.result": "Every other detail is left out.",
          result: "Here are the masala dishes.",
        },
      },
      {
        kind: "concept",
        title: "Wildcards",
        body: "A pattern is ordinary text plus **wildcards**: special symbols that stand for letters you don't know.",
        points: [
          {
            emoji: "✳️",
            title: "% means anything",
            text: "Any number of characters, even none. `'A%'` is *starts with A*; `'%a'` is *ends with a*.",
          },
          {
            emoji: "🔤",
            title: "_ means one character",
            text: "Exactly one character. `'R_h%'` matches Rahul and Rohan.",
          },
          {
            emoji: "🔠",
            title: "Capitals count",
            text: "`'a%'` does not match Amit, because a and A are different characters.",
          },
        ],
        compare: {
          before: { label: "The whole menu", table: "products" },
          after: {
            label: "Masala anywhere in the name",
            query: "SELECT name FROM products WHERE name LIKE '%Masala%'",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: LIKE",
        body: "Write **LIKE** and then the pattern in single quotes. Tap each part to see its step.",
        query: "SELECT name\nFROM students\nWHERE name LIKE 'A%'",
        explain: {
          select: "SELECT name chooses the column to show.",
          from: "FROM students says which table to look in.",
          where: "WHERE name LIKE 'A%' keeps names that match the pattern: an A, then anything.",
        },
      },
      {
        kind: "playground",
        title: "Play with patterns",
        body: "Try the suggestions. Can you find names ending in a, or names with exactly four letters?",
        starter: "SELECT name\nFROM products\nWHERE name LIKE '%Masala%'",
        suggestions: [
          "SELECT name FROM students WHERE name LIKE '%a'",
          "SELECT name FROM students WHERE name LIKE 'R_h%'",
          "SELECT name FROM students WHERE name LIKE '____'",
          "SELECT name FROM products WHERE name NOT LIKE '% %'",
        ],
      },
    ],
    check: [
      {
        kind: "pick-rows",
        prompt: "Which rows does `SELECT * FROM students WHERE name LIKE '%a'` return? Tap them all.",
        table: "students",
        query: "SELECT * FROM students WHERE name LIKE '%a'",
        explain: "'%a' means *ends with a*: Priya, Sneha, Ananya and Meera.",
      },
      {
        kind: "choice",
        prompt: "Which pattern finds names that **contain** 'an' anywhere?",
        options: ["'%an%'", "'an%'", "'%an'", "'_an_'"],
        answer: 0,
        explain:
          "Put % on both sides: anything before, 'an', anything after. 'an%' only finds names that start with 'an'.",
      },
      {
        kind: "choice",
        prompt: "Does `WHERE name LIKE 'a%'` find Amit?",
        options: [
          "No: LIKE cares about capitals, and 'a' isn't 'A'",
          "Yes: capitals don't matter",
          "Only if Amit is older than 18",
        ],
        answer: 0,
        explain: "LIKE is case-sensitive. Amit starts with a capital A, so the pattern needs 'A%'.",
      },
      {
        kind: "order",
        prompt: "Build a query for dishes whose names **end with Curry**.",
        tokens: ["SELECT", "name", "FROM", "products", "WHERE", "name", "LIKE", "'%Curry'"],
        distractors: ["'Curry%'", "="],
        explain: "'%Curry' means anything, then Curry at the very end: Fish Curry.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt: "Show the **name** and **price** of every dish whose name **starts with M**.",
      tables: ["products"],
      starter: "SELECT name, price\nFROM products\n",
      solution: "SELECT name, price FROM products WHERE name LIKE 'M%'",
      requires: ["LIKE"],
      hints: ["Use WHERE name LIKE '...' with a pattern.", "Starts with M, then anything: `WHERE name LIKE 'M%'`."],
    },
    takeaways: [
      "LIKE compares text with a pattern.",
      "% stands for any number of characters; _ stands for exactly one.",
      "LIKE is case-sensitive: 'a%' and 'A%' are different patterns.",
    ],
    cheatsheet: [
      { sql: "SELECT name FROM students WHERE name LIKE 'A%'", meaning: "Names starting with A" },
      { sql: "SELECT name FROM products WHERE name LIKE '%Masala%'", meaning: "Masala anywhere in the name" },
      { sql: "SELECT name FROM students WHERE name LIKE '%a'", meaning: "Names ending with a" },
    ],
  },
];
