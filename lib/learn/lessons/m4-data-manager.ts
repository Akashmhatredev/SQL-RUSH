import { classList, lockers, menu } from "../datasets";
import type { Lesson, LessonTable } from "../types";

/** The class trip sign-up sheet: a copy of the class list that the delete lesson can safely empty. */
const tripList: LessonTable = {
  ...classList,
  name: "trip_list",
  description: "Students signed up for the class trip",
};

/** Parents' contact details, with some numbers and emails missing. */
const contacts: LessonTable = {
  name: "contacts",
  description: "Each student's saved parent phone number and email",
  entity: "contact",
  labelColumn: "name",
  columns: [
    { name: "student_id", type: "int", pk: true, description: "The student these details belong to" },
    { name: "name", type: "text", description: "The student's first name" },
    { name: "phone", type: "text", description: "A parent's phone number (empty if nobody gave one)" },
    { name: "email", type: "text", description: "A parent's email address (empty if nobody gave one)" },
  ],
  rows: [
    [101, "Rahul", "98200 11111", "rahul.home@example.in"],
    [102, "Priya", null, "priya.home@example.in"],
    [103, "Amit", "98200 33333", null],
    [104, "Sneha", null, null],
    [105, "Kabir", "98200 55555", "kabir.home@example.in"],
  ],
};

/** Module 4 · Data Manager: changing data (INSERT, UPDATE, DELETE, NULL). */
export const dataManager: Lesson[] = [
  {
    id: "insert",
    summary: "INSERT adds new rows to a table, one value for each column.",
    minutes: 7,
    tables: [menu],
    steps: [
      {
        kind: "story",
        title: "A new dish on the menu",
        emoji: "🍔",
        body: "The café is adding **Vada Pav**: a vegetarian Snack for **₹25**. The menu needs one more line for it.\n\nHere is the menu as it is today.",
        paper: "products",
        think: {
          question: "What does the new line need?",
          answer:
            "The same five details as every other dish: a product ID that nobody else uses (11 is free), the name, the category, the price, and whether it's vegetarian.",
        },
      },
      {
        kind: "explore",
        title: "Add it by hand",
        body: "Add Vada Pav to this sample menu yourself. Notice that you fill in a value for every column. **Reset** puts the menu back.",
        table: "products",
        editable: true,
        tasks: [
          { type: "add-row", prompt: "Add Vada Pav as a new row" },
          { type: "reset", prompt: "Reset the menu" },
        ],
      },
      {
        kind: "animate",
        title: "Watch the database add it",
        body: "The database adds the new dish as one more row. Nothing else on the menu moves or changes.",
        query: "INSERT INTO products VALUES (11, 'Vada Pav', 'Snack', 25, true)",
        narration: {
          "insert.show": "Here is the menu before the change: 10 dishes.",
          "insert.add": "Vada Pav is added as an 11th row. Every other row stays exactly as it was.",
        },
      },
      {
        kind: "concept",
        title: "Adding rows",
        body: "Adding a new record to a table is called **inserting** a row. A few rules keep the table tidy:",
        points: [
          { emoji: "➕", title: "One new row", text: "Each new dish becomes a full row at the bottom of the table." },
          {
            emoji: "🧾",
            title: "Values in column order",
            text: "You give one value per column, in the same order as the columns.",
          },
          {
            emoji: "🔑",
            title: "IDs must be unique",
            text: "product_id is the primary key. Try to reuse 1 and the database refuses, because Masala Dosa already has it.",
          },
        ],
      },
      {
        kind: "syntax",
        title: "Now in SQL: INSERT",
        body: "**INSERT INTO** names the table (and, in brackets, the columns you are filling). **VALUES** gives the new row. Tap each part to see its step.",
        query:
          "INSERT INTO products (product_id, name, category, price, is_veg)\nVALUES (11, 'Vada Pav', 'Snack', 25, true)",
        explain: {
          insert:
            "INSERT INTO products says which table gets the new row. The brackets list the columns we're filling, in order.",
          values:
            "VALUES (…) gives one value per column, in the same order. Text goes in single quotes; numbers and true/false don't.",
        },
      },
      {
        kind: "concept",
        title: "Handy extras",
        body: "Two things you will use often:",
        points: [
          {
            emoji: "📦",
            title: "Several rows at once",
            text: "Separate the rows with commas: `VALUES (11, 'Idli', 'Main', 70, true), (12, 'Kulfi', 'Dessert', 80, true)`.",
          },
          {
            emoji: "🕳️",
            title: "Leaving columns out",
            text: "List only some columns and the others are left empty (NULL): `INSERT INTO products (product_id, name) VALUES (13, 'Mystery Dish')`.",
          },
          {
            emoji: "✏️",
            title: "Quotes for text",
            text: "Write `'Vada Pav'`, not `Vada Pav`. Without quotes SQL thinks it's a column name.",
          },
        ],
      },
      {
        kind: "playground",
        title: "Stock the menu",
        body: "Run the INSERT and watch the new row slide in. Try the suggestions, or invent your own dish. The menu resets between runs.",
        starter:
          "INSERT INTO products (product_id, name, category, price, is_veg)\nVALUES (11, 'Vada Pav', 'Snack', 25, true)",
        suggestions: [
          "INSERT INTO products VALUES (12, 'Lemon Soda', 'Drink', 50, true)",
          "INSERT INTO products (product_id, name, category, price, is_veg) VALUES (11, 'Idli', 'Main', 70, true), (12, 'Kulfi', 'Dessert', 80, true)",
          "INSERT INTO products (product_id, name) VALUES (13, 'Mystery Dish')",
          "SELECT * FROM products",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "What does this statement do?",
        code: "INSERT INTO products VALUES (12, 'Lemon Soda', 'Drink', 50, true)",
        options: [
          "Adds one new dish as a new row",
          "Changes dish 12 into Lemon Soda",
          "Adds a new column called Lemon Soda",
          "Replaces the whole menu",
        ],
        answer: 0,
        explain: "INSERT always adds rows. The five values fill the five columns of the new row, in order.",
      },
      {
        kind: "choice",
        prompt: "Why is `INSERT INTO products VALUES (1, 'Idli', 'Main', 70, true)` refused?",
        options: [
          "product_id 1 already belongs to Masala Dosa, and IDs must be unique",
          "Idli isn't on the menu yet",
          "Prices must be more than 100",
        ],
        answer: 0,
        explain: "product_id is the primary key, so no two rows can share it. Use a number nobody has, like 11.",
      },
      {
        kind: "order",
        prompt: "Put the pieces in order to add **Kulfi** (ID 13, Dessert, ₹80, vegetarian).",
        tokens: ["INSERT INTO", "products", "VALUES", "(13, 'Kulfi', 'Dessert', 80, true)"],
        distractors: ["SELECT", "WHERE"],
        explain: "INSERT INTO the table, then VALUES with the new row in brackets.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "Add **Kulfi** to the menu: product ID **11**, category **Dessert**, price **₹80**, and it's vegetarian (**true**).",
      tables: ["products"],
      starter: "INSERT INTO products (product_id, name, category, price, is_veg)\nVALUES ",
      solution:
        "INSERT INTO products (product_id, name, category, price, is_veg) VALUES (11, 'Kulfi', 'Dessert', 80, true)",
      requires: ["INSERT"],
      hints: [
        "After VALUES, write the five values in brackets, in the same order as the columns.",
        "Text needs single quotes: `VALUES (11, 'Kulfi', 'Dessert', 80, true)`.",
      ],
    },
    takeaways: [
      "INSERT INTO adds new rows to a table.",
      "VALUES gives one value per column, in column order; text goes in single quotes.",
      "Every row needs its own primary key value.",
    ],
    cheatsheet: [
      {
        sql: "INSERT INTO products VALUES (11, 'Vada Pav', 'Snack', 25, true)",
        meaning: "Add a row, filling every column",
      },
      {
        sql: "INSERT INTO products (product_id, name) VALUES (12, 'Lemon Soda')",
        meaning: "Fill only some columns; the rest stay empty",
      },
    ],
  },
  {
    id: "update",
    summary: "UPDATE changes values in rows you already have; WHERE picks which rows.",
    minutes: 7,
    tables: [menu],
    steps: [
      {
        kind: "story",
        title: "Prices go up",
        emoji: "🥭",
        body: "Mangoes cost more this season, so the café raises the price of **Mango Lassi** from ₹90 to **₹100**. Only that one dish changes.",
        paper: "products",
        think: {
          question: "What would happen if someone wrote ₹100 into the price of every row?",
          answer:
            "Every dish would cost ₹100: the Biryani and the Chai alike! A change must say exactly which rows it is for.",
        },
      },
      {
        kind: "explore",
        title: "Change it by hand",
        body: "Fix Mango Lassi's price in this sample menu. **Reset** puts the menu back.",
        table: "products",
        editable: true,
        tasks: [
          { type: "edit-cell", prompt: "Change Mango Lassi's price", column: "price" },
          { type: "reset", prompt: "Reset the menu" },
        ],
      },
      {
        kind: "animate",
        title: "Watch one row change",
        body: "The database first finds the right row, then rewrites just that value.",
        query: "UPDATE products SET price = 100 WHERE name = 'Mango Lassi'",
        narration: {
          "update.show": "Here is the menu before the change.",
          "update.check": "First we find the row to change: is the dish called Mango Lassi?",
          "update.change": "Only that row's price is rewritten, from 90 to 100. Every other dish keeps its price.",
        },
      },
      {
        kind: "animate",
        title: "What if we don't say which rows?",
        body: "Now watch the same change with no rule for picking rows.",
        query: "UPDATE products SET price = 100",
        narration: {
          "update.show": "The same menu, before the change.",
          "update.change": "With nothing to pick out one row, every single dish now costs ₹100. Oops!",
        },
      },
      {
        kind: "concept",
        title: "Changing values safely",
        body: "Changing values in rows you already have is called **updating** them. It always has two parts: *which rows* and *what to write*.",
        points: [
          {
            emoji: "🎯",
            title: "Pick the rows",
            text: "A yes-or-no question, like the ones you used for filtering, picks the rows to change.",
          },
          { emoji: "✏️", title: "Write the values", text: "Then the new value is written into those rows only." },
          {
            emoji: "🧮",
            title: "Use the old value",
            text: "The new value can be worked out from the old one, like *price plus 10*.",
          },
          { emoji: "⚠️", title: "No question = every row", text: "Forget to pick rows and every row changes." },
        ],
      },
      {
        kind: "syntax",
        title: "Now in SQL: UPDATE",
        body: "**UPDATE** names the table, **SET** says what to write and **WHERE** picks the rows. Tap each part to see its step.",
        query: "UPDATE products\nSET price = 100\nWHERE name = 'Mango Lassi'",
        explain: {
          update: "UPDATE products says which table to change.",
          set: "SET price = 100 is the new value to write.",
          where: "WHERE name = 'Mango Lassi' picks which rows get it. Without it, every row would change.",
        },
      },
      {
        kind: "playground",
        title: "Reprice the menu",
        body: "Run the starter, then try the suggestions. Watch which rows light up before anything changes. The menu resets between runs.",
        starter: "UPDATE products\nSET price = price + 10\nWHERE category = 'Drink'",
        suggestions: [
          "UPDATE products SET price = 100 WHERE product_id = 5",
          "UPDATE products SET category = 'Main', price = 50 WHERE name = 'Samosa'",
          "UPDATE products SET is_veg = false WHERE price > 200",
          "UPDATE products SET price = price * 2",
        ],
      },
    ],
    check: [
      {
        kind: "pick-rows",
        prompt:
          "Which rows will `UPDATE products SET price = price + 10 WHERE category = 'Drink'` change? Tap them all.",
        table: "products",
        query: "SELECT * FROM products WHERE category = 'Drink'",
        explain: "Only the drinks match the WHERE: Mango Lassi, Masala Chai and Cold Coffee. Each gets ₹10 more.",
      },
      {
        kind: "choice",
        prompt: "What happens when you run this?",
        code: "UPDATE products SET price = 50",
        options: [
          "Every dish's price becomes 50",
          "Nothing, because UPDATE needs a WHERE",
          "Only the first dish changes",
          "A new dish costing 50 is added",
        ],
        answer: 0,
        explain: "Without WHERE, UPDATE changes every row. Always check your WHERE before you run an UPDATE.",
      },
      {
        kind: "order",
        prompt: "Build a statement that changes **Masala Chai's** price to **₹35**.",
        tokens: ["UPDATE", "products", "SET", "price = 35", "WHERE", "name = 'Masala Chai'"],
        distractors: ["INSERT", "FROM"],
        explain: "UPDATE the table, SET the new value, then WHERE picks Masala Chai's row.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt: "All **Snacks** are getting **₹20 more** expensive. Write the statement that raises their prices.",
      tables: ["products"],
      starter: "UPDATE products\n",
      solution: "UPDATE products SET price = price + 20 WHERE category = 'Snack'",
      requires: ["UPDATE", "WHERE"],
      hints: [
        "`SET price = price + 20` adds 20 to each row's current price.",
        "Pick only the snacks: `UPDATE products SET price = price + 20 WHERE category = 'Snack'`.",
      ],
    },
    takeaways: [
      "UPDATE changes values in rows that already exist.",
      "SET says what to write; WHERE says which rows.",
      "Without WHERE, every row changes, so check it before you run.",
    ],
    cheatsheet: [
      { sql: "UPDATE products SET price = 100 WHERE name = 'Mango Lassi'", meaning: "Change one dish's price" },
      { sql: "UPDATE products SET price = price + 10 WHERE category = 'Drink'", meaning: "Add 10 to every drink" },
    ],
  },
  {
    id: "delete",
    summary: "DELETE removes whole rows; WHERE decides which ones go.",
    minutes: 6,
    tables: [tripList],
    steps: [
      {
        kind: "story",
        title: "Tidying the trip list",
        emoji: "🧳",
        body: "All 8 students signed up for the class trip. Then the school said the trip is only for students who are **18 or older**.\n\nThe younger students have to come off the list.",
        paper: "trip_list",
        think: {
          question: "What should happen to their rows?",
          answer:
            "Each row where the age is under 18 should be removed completely. Everyone else stays exactly as they are.",
        },
      },
      {
        kind: "predict",
        title: "Which rows go?",
        body: "Before anything is removed, find the rows yourself.",
        table: "trip_list",
        query: "SELECT * FROM trip_list WHERE age < 18",
        prompt: "Tap every student who has to come off the list (**younger than 18**).",
        explain: "Kabir (17) and Rohan (16) are under 18. Ananya is exactly 18, so she stays.",
      },
      {
        kind: "animate",
        title: "Watch them go",
        body: "The database checks every row, then removes the ones that match. The rest close up the gap.",
        query: "DELETE FROM trip_list WHERE age < 18",
        narration: {
          "delete.show": "Here is the trip list before the change.",
          "delete.check": "We check every row: is the student younger than 18?",
          "delete.remove": "Those rows are removed for good. Everyone else stays.",
        },
      },
      {
        kind: "animate",
        title: "What if we don't say which rows?",
        body: "Now watch the same removal with no rule for picking rows.",
        query: "DELETE FROM trip_list",
        narration: {
          "delete.show": "The same trip list, before the change.",
          "delete.remove": "With nothing to pick out rows, every single row is removed. The list is empty!",
        },
      },
      {
        kind: "concept",
        title: "Removing rows safely",
        body: "Taking rows out of a table is called **deleting** them. A deleted row is gone for good, so it pays to be careful.",
        points: [
          { emoji: "🎯", title: "Pick the rows", text: "A yes-or-no question picks exactly which rows to remove." },
          {
            emoji: "🗑️",
            title: "Whole rows go",
            text: "Deleting removes the entire row. To clear one value, change it instead.",
          },
          { emoji: "⚠️", title: "No undo", text: "Forget to pick rows and the whole table is emptied." },
          {
            emoji: "👀",
            title: "Look first",
            text: "Run a SELECT with the same question first to see what would go, then swap it for the delete.",
          },
        ],
      },
      {
        kind: "syntax",
        title: "Now in SQL: DELETE",
        body: "**DELETE FROM** names the table and **WHERE** picks the rows. Tap each part to see its step.",
        query: "DELETE FROM trip_list\nWHERE age < 18",
        explain: {
          delete: "DELETE FROM trip_list says which table to remove rows from.",
          where: "WHERE age < 18 picks the rows to remove. Leave it out and every row goes.",
        },
      },
      {
        kind: "playground",
        title: "Your turn",
        body: "Try the suggestions. Run the SELECT first to preview, then the DELETE. The list resets between runs.",
        starter: "DELETE FROM trip_list\nWHERE age < 18",
        suggestions: [
          "SELECT * FROM trip_list WHERE city = 'Pune'",
          "DELETE FROM trip_list WHERE city = 'Pune'",
          "DELETE FROM trip_list WHERE student_id = 108",
          "DELETE FROM trip_list",
        ],
      },
    ],
    check: [
      {
        kind: "pick-rows",
        prompt: "Which rows would `DELETE FROM trip_list WHERE city = 'Mumbai'` remove? Tap them all.",
        table: "trip_list",
        query: "SELECT * FROM trip_list WHERE city = 'Mumbai'",
        explain: "Priya and Ananya live in Mumbai, so their rows match and would be removed.",
      },
      {
        kind: "choice",
        prompt: "What does this statement do?",
        code: "DELETE FROM trip_list",
        options: [
          "Removes every row from the table",
          "Removes only the first row",
          "Nothing, because DELETE needs a WHERE",
          "Deletes the column names",
        ],
        answer: 0,
        explain: "With no WHERE, every row matches, so every row is deleted. The empty table is still there.",
      },
      {
        kind: "choice",
        prompt: "What's the safest habit before running a DELETE?",
        options: [
          "Run a SELECT with the same WHERE first, to see which rows match",
          "Leave out the WHERE so nothing is missed",
          "Delete the rows one column at a time",
        ],
        answer: 0,
        explain: "A SELECT shows exactly the rows the DELETE would remove, without removing anything.",
      },
      {
        kind: "order",
        prompt: "Build a statement that removes **only Kabir** (student_id 105).",
        tokens: ["DELETE", "FROM", "trip_list", "WHERE", "student_id", "=", "105"],
        distractors: ["SELECT", "*"],
        explain: "DELETE FROM the table, then WHERE picks Kabir's row by its unique student_id.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "Students from **Chennai** and **Bangalore** are going on a different trip. Remove them from `trip_list`, and nobody else.",
      tables: ["trip_list"],
      starter: "DELETE FROM trip_list\n",
      solution: "DELETE FROM trip_list WHERE city IN ('Chennai', 'Bangalore')",
      requires: ["DELETE", "WHERE"],
      hints: [
        "Without WHERE, every student is removed. Add a WHERE that matches the two cities.",
        "`WHERE city IN ('Chennai', 'Bangalore')` (or two comparisons joined with OR).",
      ],
    },
    takeaways: [
      "DELETE FROM removes whole rows from a table.",
      "WHERE decides which rows go; without it, every row is removed.",
      "Preview with a SELECT using the same WHERE before you delete.",
    ],
    cheatsheet: [
      { sql: "DELETE FROM trip_list WHERE age < 18", meaning: "Remove students under 18" },
      { sql: "DELETE FROM trip_list WHERE student_id = 105", meaning: "Remove one student by ID" },
    ],
  },
  {
    id: "null-values",
    summary: "NULL means a value is missing. Find it with IS NULL, never with = NULL.",
    minutes: 8,
    tables: [lockers, contacts],
    steps: [
      {
        kind: "story",
        title: "Which lockers are free?",
        emoji: "🔐",
        body: "The school has five lockers. Each has a card for the ID of the student using it. Some cards have a number, and **some are blank**.\n\nA new student needs a locker. Which ones are free?",
        paper: "lockers",
        think: {
          question: "Is a blank card the same as student ID 0?",
          answer:
            "No. A blank card means *nobody is written down*: there is no value at all. Databases call a missing value like this **NULL**.",
        },
      },
      {
        kind: "explore",
        title: "Find the blanks",
        body: "Tap around the lockers table. Missing values are shown as NULL.",
        table: "lockers",
        tasks: [
          {
            type: "click-row",
            prompt: "Tap locker L3, which has no student",
            match: { column: "locker_no", value: "L3" },
          },
          { type: "click-column", prompt: "Tap the student_id column header", column: "student_id" },
          { type: "hover-cell", prompt: "Point at (or tap) an empty NULL value" },
        ],
      },
      {
        kind: "predict",
        title: "Spot the free lockers",
        body: "A free locker is one with nobody written on its card.",
        table: "lockers",
        query: "SELECT * FROM lockers WHERE student_id IS NULL",
        prompt: "Tap every locker that is **free** (no student).",
        explain: "L3 and L5 have no student_id: their value is missing, so they are free.",
      },
      {
        kind: "animate",
        title: "Asking about missing values",
        body: "The database checks each locker with a special question: *is this box empty?*",
        query: "SELECT * FROM lockers WHERE student_id IS NULL",
        narration: {
          "source.show": "Here are all five lockers.",
          "where.check": "For each locker we ask: is the student box empty?",
          "where.keep": "Only the lockers with an empty box stay.",
          "project.pick": "We keep all of each locker's details.",
          result: "These lockers are free.",
        },
      },
      {
        kind: "concept",
        title: "NULL means unknown",
        body: "**NULL** is not zero and not an empty word. It means *we don't know*, or *there's nothing here*. That makes it behave differently from normal values.",
        points: [
          { emoji: "❔", title: "Not zero", text: "A NULL student_id isn't 0; it's no value at all." },
          {
            emoji: "🚫",
            title: "Comparisons don't work",
            text: "*Is unknown equal to something?* The answer is unknown, never yes. So `= NULL` matches nothing.",
          },
          {
            emoji: "✅",
            title: "Ask directly",
            text: "Ask *is it missing?* with `IS NULL`, or *is it there?* with `IS NOT NULL`.",
          },
          {
            emoji: "🩹",
            title: "Fill the gap",
            text: "`COALESCE(phone, 'not given')` shows the phone, or 'not given' when it's missing.",
          },
        ],
        compare: {
          before: { label: "All lockers", table: "lockers" },
          after: { label: "Free lockers", query: "SELECT * FROM lockers WHERE student_id IS NULL" },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: IS NULL",
        body: "Write **IS NULL** to find missing values (and **IS NOT NULL** to find the ones that are there). Tap each part to see its step.",
        query: "SELECT locker_no, floor\nFROM lockers\nWHERE student_id IS NULL",
        explain: {
          select: "SELECT locker_no, floor chooses two columns to show.",
          from: "FROM lockers says which table to look in.",
          where:
            "WHERE student_id IS NULL keeps rows where the student box is empty. For taken lockers, use IS NOT NULL.",
        },
      },
      {
        kind: "animate",
        title: "The = NULL trap",
        body: "Here's what happens if you write `= NULL` instead of `IS NULL`. Watch closely.",
        query: "SELECT * FROM lockers WHERE student_id = NULL",
        showSql: true,
        narration: {
          "where.check":
            "Is student_id = NULL? For every locker the answer is unknown, never yes, even for the empty ones.",
          "where.keep": "So no rows pass. The free lockers are missed!",
          result: "Empty! = NULL never finds anything. Write IS NULL instead.",
        },
      },
      {
        kind: "playground",
        title: "Missing phone numbers",
        body: "Here is a new table, **contacts**, where some parents haven't given a phone number or an email. Try the suggestions.",
        starter: "SELECT name, COALESCE(phone, 'not given') AS phone\nFROM contacts",
        suggestions: [
          "SELECT name FROM contacts WHERE phone IS NULL",
          "SELECT name FROM contacts WHERE email IS NOT NULL",
          "SELECT name FROM contacts WHERE phone IS NULL AND email IS NULL",
          "SELECT * FROM lockers WHERE student_id IS NOT NULL",
        ],
      },
    ],
    check: [
      {
        kind: "pick-rows",
        prompt: "Which students have **no phone number** saved? Tap their rows.",
        table: "contacts",
        query: "SELECT * FROM contacts WHERE phone IS NULL",
        explain: "Priya's and Sneha's phone values are NULL, so `WHERE phone IS NULL` finds them.",
      },
      {
        kind: "choice",
        prompt: "How many rows does this query return?",
        code: "SELECT * FROM lockers WHERE student_id = NULL",
        options: ["None, because = NULL is never true", "2: the free lockers", "5: every locker"],
        answer: 0,
        explain:
          "Comparing anything with NULL gives *unknown*, which is never yes. Use IS NULL to find missing values.",
      },
      {
        kind: "choice",
        prompt: "Amit's parents gave no email address. What is stored in his email cell?",
        options: ["NULL: no value at all", "An empty word, ''", "The number 0", "The text 'none'"],
        answer: 0,
        explain:
          "A missing value is stored as NULL, which means *nothing here*. It isn't 0, an empty word or the text 'none'.",
      },
      {
        kind: "order",
        prompt: "Build a query that lists the lockers that are **taken**.",
        tokens: ["SELECT", "locker_no", "FROM", "lockers", "WHERE", "student_id", "IS NOT", "NULL"],
        distractors: ["=", "IS"],
        explain: "Taken lockers have a student_id, so ask whether it IS NOT NULL.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "The school wants to collect every missing email. Show the **name** of every student in `contacts` whose **email is missing**.",
      tables: ["contacts"],
      starter: "SELECT name\nFROM contacts\n",
      solution: "SELECT name FROM contacts WHERE email IS NULL",
      requires: ["IS NULL"],
      hints: ["`= NULL` never matches. There's a special way to ask about missing values.", "`WHERE email IS NULL`"],
    },
    takeaways: [
      "NULL means a value is missing or unknown; it isn't 0 or empty text.",
      "Find missing values with IS NULL and present ones with IS NOT NULL.",
      "= NULL never matches anything.",
      "COALESCE(value, fallback) swaps a NULL for something readable.",
    ],
    cheatsheet: [
      { sql: "SELECT * FROM lockers WHERE student_id IS NULL", meaning: "Free lockers" },
      { sql: "SELECT * FROM lockers WHERE student_id IS NOT NULL", meaning: "Taken lockers" },
      {
        sql: "SELECT name, COALESCE(phone, 'not given') AS phone FROM contacts",
        meaning: "Show a fallback for missing phones",
      },
    ],
  },
];
