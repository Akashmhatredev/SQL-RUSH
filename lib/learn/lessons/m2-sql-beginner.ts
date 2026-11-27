import { classList, menu, register } from "../datasets";
import type { Lesson } from "../types";

/** Module 2 · SQL Beginner: the first real queries. */
export const sqlBeginner: Lesson[] = [
  {
    id: "what-is-sql",
    summary: "SQL is the language you use to ask a database for data. A request in SQL is called a query.",
    minutes: 5,
    tables: [register],
    steps: [
      {
        kind: "story",
        title: "Asking for what you need",
        emoji: "💬",
        body: "Imagine the school office keeps its register in a locked room. You can't walk in and look. Instead you hand a note to the clerk:\n\n*Please show me the whole student register.*\n\nThe clerk fetches it and gives you a copy.",
        paper: "students",
        think: {
          question: "What two things did your note have to say?",
          answer: "**What** you want (everything: all the details) and **where** it is (the student register).",
        },
      },
      {
        kind: "animate",
        title: "The database fetches it",
        body: "A database works just like the clerk. Watch what happens when you ask it for the whole student register.",
        query: "SELECT * FROM students",
        narration: {
          "source.show": "First, the database finds the table you asked about: students.",
          "project.pick": "You asked for everything, so every detail comes along: ID, name, age and city.",
          result: "And it hands the whole table back to you: 4 students.",
        },
      },
      {
        kind: "concept",
        title: "SQL: a language for asking",
        body: "A database doesn't read notes in everyday language. It understands a small, precise language called **SQL** (say *S-Q-L* or *sequel*). A request written in SQL is called a **query**, which simply means a question.",
        points: [
          { emoji: "🗣️", title: "A language", text: "SQL stands for Structured Query Language." },
          {
            emoji: "📖",
            title: "Reads like English",
            text: "Its words are short English words, used in a fixed order.",
          },
          {
            emoji: "🌍",
            title: "Used everywhere",
            text: "Banks, shops, games and apps all use SQL to get at their data.",
          },
        ],
      },
      {
        kind: "syntax",
        title: "Your note, written in SQL",
        body: "Here is the same request as a query. It has the same two parts as your note: **what** you want and **where** it is. Tap each part to see which step of the animation it controls.",
        query: "SELECT *\nFROM students",
        explain: {
          select: "SELECT * says what you want. The * is short for every column.",
          from: "FROM students says where to look: the students table.",
        },
      },
      {
        kind: "concept",
        title: "The shape of every query",
        body: "Almost every question you ask in this course starts the same way.",
        points: [
          { emoji: "1️⃣", title: "SELECT", text: "What to show. `*` means every column." },
          { emoji: "2️⃣", title: "FROM", text: "Which table to look in." },
          {
            emoji: "🔠",
            title: "Capitals are a habit",
            text: "SQL doesn't mind `select` or `SELECT`. Capitals just make the keywords easy to spot.",
          },
        ],
      },
      {
        kind: "playground",
        title: "Send your first query",
        body: "Press **Run** and watch the database answer. Then try the suggestions: small changes, different answers.",
        starter: "SELECT *\nFROM students",
        suggestions: ["select * from students", "SELECT name FROM students", "SELECT name, city FROM students"],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "What is **SQL** for?",
        options: ["Asking a database for data", "Drawing pictures", "Sending emails", "Making phone calls"],
        answer: 0,
        explain: "SQL is the language databases understand. You use it to ask for data (and later, to change it).",
      },
      {
        kind: "choice",
        prompt: "In `SELECT * FROM students`, what does the `*` mean?",
        options: ["Every column", "Multiply", "Only the first row", "This query is important"],
        answer: 0,
        explain: "After SELECT, * is short for *all the columns*: ID, name, age and city.",
      },
      {
        kind: "choice",
        prompt: "Which part of `SELECT * FROM students` tells the database **which table** to look in?",
        options: ["FROM students", "SELECT", "*"],
        answer: 0,
        explain: "FROM names the table. SELECT says what to show from it.",
      },
    ],
    challenge: {
      kind: "build",
      prompt:
        "Build the query that asks for **everything** in the **students** table. Tap the tiles in the right order.",
      tables: ["students"],
      tokens: ["SELECT", "*", "FROM", "students"],
      distractors: ["SHOW", "TABLE", "ALL"],
      hints: [
        "A query starts with what you want, then says where it is.",
        "SELECT comes first, then *, then FROM and the table's name.",
      ],
    },
    takeaways: [
      "SQL is the language you use to ask a database for data.",
      "A request written in SQL is called a query.",
      "SELECT says what to show; FROM says which table to look in.",
    ],
    cheatsheet: [{ sql: "SELECT * FROM students", meaning: "Every column of every student" }],
  },
  {
    id: "first-query",
    summary: "Ask a restaurant's database for its whole menu with SELECT * FROM products.",
    minutes: 6,
    tables: [menu, register],
    steps: [
      {
        kind: "story",
        title: "At the restaurant",
        emoji: "🍽️",
        body: "Imagine you are a customer at a small restaurant. You've just sat down and you want to see the available products.",
        think: {
          question: "How would you ask the restaurant to show you the menu?",
          answer:
            "Something like *Please show me everything on your menu.* You say **what** you want (everything) and **where** it comes from (the menu).",
        },
      },
      {
        kind: "explore",
        title: "The menu is a table",
        body: "The restaurant keeps its menu in a database, in a table called `products`. Each row is one dish. Have a look.",
        table: "products",
        tasks: [
          { type: "click-row", prompt: "Tap the Masala Dosa row", match: { column: "name", value: "Masala Dosa" } },
          { type: "click-column", prompt: "Tap the price column header", column: "price" },
        ],
      },
      {
        kind: "animate",
        title: "Asking for the menu",
        body: "Now watch the database answer your request: *show me everything on the menu.*",
        query: "SELECT * FROM products;",
        narration: {
          "source.show": "You asked for the menu, so the database opens the products table: 10 dishes.",
          "project.pick": "You asked for everything, so every column comes along: ID, name, category, price and veg.",
          result: "Here is the whole menu: every dish, every detail.",
        },
      },
      {
        kind: "concept",
        title: "You just ran a query",
        body: "Your request was a **query**, and the table that came back is called the **result**. Asking for everything is the simplest query there is, and it's how you look at any table for the first time.",
        points: [
          { emoji: "❓", title: "Query", text: "Your question to the database." },
          { emoji: "🔎", title: "The database looks", text: "It reads the table you named." },
          { emoji: "📄", title: "Result", text: "The answer, always shaped like a table." },
        ],
      },
      {
        kind: "syntax",
        title: "The query, word by word",
        body: "Here is your request written in SQL. The semicolon `;` at the end marks where the query finishes. Tap each part to see which step of the animation it drives.",
        query: "SELECT *\nFROM products;",
        explain: {
          select: "SELECT * is the *show me everything* part: SELECT starts the question, and * means every column.",
          from: "FROM products is the *from the menu* part: look in the products table.",
        },
      },
      {
        kind: "playground",
        title: "Try it yourself",
        body: "Run the query. Then change the table's name to look at a different table: this database also has the `students` register.",
        starter: "SELECT *\nFROM products;",
        suggestions: ["select * from products;", "SELECT * FROM students;"],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "Which query shows the **whole menu**?",
        options: ["SELECT * FROM products;", "SELECT products;", "FROM products SELECT *;", "SHOW products;"],
        answer: 0,
        explain: "SELECT comes first and says what to show (* means everything); FROM comes next and names the table.",
      },
      {
        kind: "order",
        prompt: "Now ask for the whole **students** table instead. Put the pieces in order.",
        tokens: ["SELECT", "*", "FROM", "students"],
        distractors: ["products"],
        explain: "Same pattern, different table: SELECT * FROM, then the table you want.",
      },
      {
        kind: "choice",
        prompt: "What does the `;` at the end of `SELECT * FROM products;` do?",
        options: ["Marks the end of the query", "Means every column", "Picks the table"],
        answer: 0,
        explain:
          "The semicolon says *this query is finished*. It matters most when you write several queries one after another.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "You're the customer again. Write the query that shows **everything** on the restaurant's menu (the `products` table).",
      tables: ["products", "students"],
      starter: "-- Show the whole menu\n",
      solution: "SELECT * FROM products;",
      requires: ["SELECT", "FROM"],
      hints: ["Start with SELECT, then say what you want: everything.", "Write `SELECT * FROM products;`"],
    },
    takeaways: [
      "A query is a question you send to the database; the answer is called the result.",
      "SELECT * FROM a table shows every column of every row in it.",
      "A semicolon marks the end of a query.",
    ],
    cheatsheet: [
      { sql: "SELECT * FROM products;", meaning: "The whole menu" },
      { sql: "SELECT * FROM students;", meaning: "The whole student register" },
    ],
  },
  {
    id: "select",
    summary: "List the columns you want after SELECT to get just those details, for every row.",
    minutes: 6,
    tables: [menu],
    steps: [
      {
        kind: "story",
        title: "Just the prices, please",
        emoji: "🧾",
        body: "You're hungry and on a budget. You don't care about each dish's ID number, category or whether it's vegetarian. You just want a **price list**: each dish's name and its price.",
        paper: "products",
        think: {
          question: "Which two details do you actually need?",
          answer: "The **name** of each dish and its **price**. Everything else can be left out.",
        },
      },
      {
        kind: "explore",
        title: "Find the columns you need",
        body: "Tap the two columns that make a price list.",
        table: "products",
        tasks: [
          { type: "click-column", prompt: "Tap the name column header", column: "name" },
          { type: "click-column", prompt: "Tap the price column header", column: "price" },
        ],
      },
      {
        kind: "animate",
        title: "Keeping only two columns",
        body: "Watch the database build your price list. It keeps every dish, but only two of the columns.",
        query: "SELECT name, price FROM products",
        narration: {
          "source.show": "Here is the full menu: 10 dishes, 5 columns.",
          "project.pick": "We pick just the name and price columns.",
          "project.result": "The other columns are left out of this answer. They are still safe in the table.",
          result: "Here's your price list: every dish, just two columns.",
        },
      },
      {
        kind: "concept",
        title: "Narrower, not shorter",
        body: "Choosing columns makes the answer **narrower**: fewer details per row. It doesn't remove any dishes: all 10 are still there.",
        compare: {
          before: { label: "The full menu", table: "products" },
          after: { label: "Just name and price", query: "SELECT name, price FROM products" },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: choosing columns",
        body: "Instead of `*`, write the names of the columns you want after SELECT, with a comma between them. Tap each part to see the step it controls.",
        query: "SELECT name, price\nFROM products",
        explain: {
          select: "SELECT name, price: show only these two columns, in this order.",
          from: "FROM products: read them from the products table.",
        },
      },
      {
        kind: "concept",
        title: "Rules for the column list",
        body: "A few small rules keep the database happy:",
        points: [
          {
            emoji: "➗",
            title: "Commas between columns",
            text: "`name, price` works. `name price` doesn't do what you think.",
          },
          { emoji: "↔️", title: "Your order wins", text: "`SELECT price, name` puts price first." },
          { emoji: "🔤", title: "Exact names", text: "There is no column called `prices`: spelling counts." },
          { emoji: "⭐", title: "* still works", text: "`SELECT *` is the shortcut for every column." },
        ],
      },
      {
        kind: "playground",
        title: "Make your own list",
        body: "Change which columns you SELECT and press **Run**. Try a different order, or a single column.",
        starter: "SELECT name, price\nFROM products",
        suggestions: [
          "SELECT name FROM products",
          "SELECT price, name FROM products",
          "SELECT name, category, is_veg FROM products",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "Which query shows only each dish's **name** and **category**?",
        options: [
          "SELECT name, category FROM products",
          "SELECT * FROM products",
          "SELECT name category FROM products",
          "SELECT name AND category FROM products",
        ],
        answer: 0,
        explain:
          "List the columns after SELECT, separated by a comma. Without the comma, SQL reads `category` as a new name for the name column.",
      },
      {
        kind: "pick-column",
        prompt:
          "You want your price list to also say whether each dish is **vegetarian**. Tap the column you'd add to SELECT.",
        table: "products",
        column: "is_veg",
        explain:
          "is_veg is true for vegetarian dishes. Add it to the list: `SELECT name, price, is_veg FROM products`.",
      },
      {
        kind: "order",
        prompt: "Build a query that shows the **price first**, then the name.",
        tokens: ["SELECT", "price", ",", "name", "FROM", "products"],
        distractors: ["*"],
        explain: "Columns come out in the order you list them, so price goes first.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "The waiter wants a list with each dish's **name** and whether it is vegetarian (**is_veg**), in that order.",
      tables: ["products"],
      starter: "SELECT *\nFROM products",
      solution: "SELECT name, is_veg FROM products",
      requires: ["SELECT", "FROM"],
      hints: ["Replace the * with the two columns you need.", "Write `SELECT name, is_veg FROM products`."],
    },
    takeaways: [
      "List columns after SELECT to show only those details.",
      "Separate the columns with commas; they appear in the order you write them.",
      "Choosing columns keeps every row; it just shows fewer details.",
    ],
    cheatsheet: [
      { sql: "SELECT name, price FROM products", meaning: "Each dish's name and price" },
      { sql: "SELECT price, name FROM products", meaning: "The same, with price first" },
    ],
  },
  {
    id: "where",
    summary: "WHERE keeps only the rows that pass a yes-or-no question.",
    minutes: 7,
    tables: [classList],
    steps: [
      {
        kind: "story",
        title: "Who can sign the trip form?",
        emoji: "🚌",
        body: "The class is going on a trip. Students **older than 18** can sign the permission form themselves; everyone else needs a parent.\n\nThe teacher needs a list of the students who can sign for themselves.",
        paper: "students",
        think: {
          question: "How would you make that list by hand?",
          answer:
            "Go down the register one student at a time, look at their age, and tick everyone whose age is more than 18.",
        },
      },
      {
        kind: "predict",
        title: "Try it yourself first",
        body: "Before any SQL, do what the teacher would do.",
        table: "students",
        query: "SELECT * FROM students WHERE age > 18",
        prompt: "Tap every student who is **older than 18**, then press Check.",
        explain:
          "Five students are older than 18. Ananya is exactly 18, so she is **not** older than 18: *older than* means strictly more.",
      },
      {
        kind: "animate",
        title: "Watch the database do it",
        body: "A database does exactly what you just did: it checks every row, one at a time, and keeps the ones that pass.",
        query: "SELECT * FROM students WHERE age > 18",
        narration: {
          "source.show": "Step 1: Here are all the students.",
          "where.check": "Step 2: We check each student's age. Is it more than 18?",
          "where.keep": "Step 3: Students older than 18 are selected. The others are set aside, not deleted.",
          "project.pick": "We keep all of each student's details.",
          result: "Step 4: Here are the matching students.",
        },
      },
      {
        kind: "concept",
        title: "This is called filtering",
        body: "Asking the same yes-or-no question of every row, and keeping the rows where the answer is *yes*, is called **filtering**. The rows that fail are not deleted: they are just left out of this answer.",
        points: [
          {
            emoji: "❓",
            title: "One question",
            text: "The question is the same for every row: *is age more than 18?*",
          },
          { emoji: "✅", title: "Yes → keep", text: "Rows where the answer is yes appear in the result." },
          { emoji: "💤", title: "No → leave out", text: "The other rows stay in the table, untouched." },
        ],
        compare: {
          before: { label: "All students", table: "students" },
          after: { label: "Older than 18", query: "SELECT * FROM students WHERE age > 18" },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: WHERE",
        body: "In SQL, the yes-or-no question goes after the word **WHERE**. Tap each part of the query to see the step of the animation it controls.",
        query: "SELECT *\nFROM students\nWHERE age > 18",
        explain: {
          select: "SELECT * means: show every column.",
          from: "FROM students says which table to look in.",
          where: "WHERE age > 18 is the question asked of every row. Only rows where it is true are kept.",
        },
      },
      {
        kind: "concept",
        title: "Ways to ask",
        body: "The question compares a column with a value. These are the comparisons you can use:",
        points: [
          { emoji: "🟰", title: "= and !=", text: "Equal and not equal: `city = 'Pune'`, `city != 'Pune'`." },
          { emoji: "📈", title: "> and >=", text: "More than, and more than or equal: `age >= 18`." },
          { emoji: "📉", title: "< and <=", text: "Less than, and less than or equal: `age < 18`." },
          {
            emoji: "✏️",
            title: "Text in quotes",
            text: "Text values go in single quotes: `'Pune'`. Numbers don't: `18`.",
          },
        ],
      },
      {
        kind: "playground",
        title: "Your turn to ask",
        body: "Change the question and press **Run**. Watch which rows pass each time.",
        starter: "SELECT *\nFROM students\nWHERE city = 'Pune'",
        suggestions: [
          "SELECT * FROM students WHERE age >= 18",
          "SELECT name FROM students WHERE city = 'Mumbai'",
          "SELECT * FROM students WHERE age < 18",
          "SELECT name, age FROM students WHERE city != 'Pune'",
        ],
      },
    ],
    check: [
      {
        kind: "pick-rows",
        prompt: "Which rows does `SELECT * FROM students WHERE city = 'Pune'` return? Tap them all.",
        table: "students",
        query: "SELECT * FROM students WHERE city = 'Pune'",
        explain: "Rahul, Sneha and Rohan live in Pune, so their rows pass the check.",
      },
      {
        kind: "choice",
        prompt: "Ananya is 18. Does `WHERE age > 18` keep her row?",
        options: ["No, because 18 is not more than 18", "Yes, because 18 counts", "Only if she lives in Pune"],
        answer: 0,
        explain: "`>` means strictly more than. To include 18, you would write `age >= 18`.",
      },
      {
        kind: "choice",
        prompt: "Which condition finds the students who live in **Mumbai**?",
        options: ["WHERE city = 'Mumbai'", "WHERE city = Mumbai", "WHERE Mumbai", "WHERE city > 'Mumbai'"],
        answer: 0,
        explain:
          "Compare the city column with the text 'Mumbai'. Text values need single quotes, otherwise SQL thinks Mumbai is a column name.",
      },
      {
        kind: "order",
        prompt: "Put the pieces in order to show the **names** of students **younger than 18**.",
        tokens: ["SELECT", "name", "FROM", "students", "WHERE", "age", "<", "18"],
        distractors: [">"],
        explain: "SELECT the column, FROM the table, then WHERE with the question: age < 18.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "The school bus only goes to **Pune**. Write a query that shows the **name** of every student who lives in Pune.",
      tables: ["students"],
      starter: "SELECT name\nFROM students\n",
      solution: "SELECT name FROM students WHERE city = 'Pune'",
      requires: ["WHERE"],
      hints: [
        "You need a WHERE line under FROM students.",
        "Compare the city column with the text 'Pune': `WHERE city = 'Pune'`.",
      ],
    },
    takeaways: [
      "WHERE asks one yes-or-no question of every row.",
      "Only rows where the answer is yes are returned; the table itself doesn't change.",
      "Compare with =, !=, >, >=, < and <=.",
      "Text values go in single quotes; numbers don't.",
    ],
    cheatsheet: [
      { sql: "SELECT * FROM students WHERE age > 18", meaning: "Students older than 18" },
      { sql: "SELECT name FROM students WHERE city = 'Pune'", meaning: "Names of students from Pune" },
    ],
  },
  {
    id: "order-by",
    summary: "ORDER BY sorts the result by a column: smallest first, or biggest first with DESC.",
    minutes: 7,
    tables: [menu],
    steps: [
      {
        kind: "story",
        title: "Cheapest first",
        emoji: "💸",
        body: "You have **₹100** in your pocket. The menu lists dishes in no particular order, so you have to read every line to find what you can afford.\n\nIt would be so much easier if the menu were **sorted by price**.",
        paper: "products",
        think: {
          question: "If the menu were sorted cheapest first, where would the dishes you can afford be?",
          answer: "All together at the top. You'd read down until the prices go over ₹100, then stop.",
        },
      },
      {
        kind: "explore",
        title: "Sort it yourself",
        body: "Use the sort button on a column header to reorder the menu. Tap it again to flip the direction.",
        table: "products",
        tasks: [
          { type: "sort", prompt: "Sort the menu by price", column: "price" },
          { type: "sort", prompt: "Now sort it by name", column: "name" },
        ],
      },
      {
        kind: "animate",
        title: "Watch the rows move",
        body: "Here is the database sorting the menu by price. Watch each dish slide into its place.",
        query: "SELECT name, price FROM products ORDER BY price",
        narration: {
          "sort.keys": "We look at each dish's price.",
          "sort.move": "The dishes move so the cheapest is at the top and the most expensive is at the bottom.",
          result: "Here's the menu, cheapest first. Everything you can afford with ₹100 is at the top.",
        },
      },
      {
        kind: "concept",
        title: "Two directions",
        body: "Sorting from smallest to biggest is called **ascending**. Sorting from biggest to smallest is called **descending**. Sorting only changes the order of the rows: nothing is added or removed.",
        points: [
          { emoji: "⬆️", title: "Ascending", text: "Smallest first: 30, 40, 60… or A, B, C for text." },
          { emoji: "⬇️", title: "Descending", text: "Biggest first: 250, 220, 180… or Z, Y, X for text." },
        ],
        compare: {
          before: { label: "Menu as stored", table: "products" },
          after: { label: "Most expensive first", query: "SELECT * FROM products ORDER BY price DESC" },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: ORDER BY",
        body: "In SQL, sorting goes in an **ORDER BY** line at the end of the query. Tap each part to see the step it controls.",
        query: "SELECT name, price\nFROM products\nORDER BY price",
        explain: {
          select: "SELECT name, price: the columns to show.",
          from: "FROM products: the table to read.",
          order:
            "ORDER BY price: sort the rows by price. Without saying otherwise, it sorts ascending (smallest first).",
        },
      },
      {
        kind: "animate",
        title: "Biggest first: DESC",
        body: "Add **DESC** (short for descending) after the column to flip the order. Ascending is written **ASC**, but it's the default, so you rarely need it.",
        query: "SELECT name, price FROM products ORDER BY price DESC",
        showSql: true,
      },
      {
        kind: "playground",
        title: "Sort it your way",
        body: "Change the column or the direction and press **Run**. Text columns sort alphabetically.",
        starter: "SELECT name, price\nFROM products\nORDER BY price DESC",
        suggestions: [
          "SELECT name FROM products ORDER BY name",
          "SELECT * FROM products ORDER BY product_id DESC",
          "SELECT name, category, price FROM products ORDER BY category, price",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "Which query lists dishes from **most expensive** to cheapest?",
        options: [
          "SELECT name FROM products ORDER BY price DESC",
          "SELECT name FROM products ORDER BY price",
          "SELECT name FROM products ORDER BY price ASC",
          "SELECT name FROM products ORDER BY name DESC",
        ],
        answer: 0,
        explain: "DESC means descending: biggest first. Without it (or with ASC), the cheapest comes first.",
      },
      {
        kind: "choice",
        prompt: "After `ORDER BY price`, which dish is at the **top**?",
        table: "products",
        options: ["Masala Chai (₹30)", "Samosa (₹40)", "Chicken Biryani (₹250)", "Masala Dosa (₹120)"],
        answer: 0,
        explain: "ORDER BY sorts ascending unless you say DESC, so the cheapest dish, Masala Chai, comes first.",
      },
      {
        kind: "order",
        prompt: "Build a query that lists the dish names in **alphabetical order**.",
        tokens: ["SELECT", "name", "FROM", "products", "ORDER BY", "name"],
        distractors: ["DESC", "WHERE"],
        explain: "ORDER BY name sorts the names A to Z. DESC would sort them Z to A instead.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt: "Show the **name** and **price** of every dish, with the **most expensive at the top**.",
      tables: ["products"],
      starter: "SELECT name, price\nFROM products",
      solution: "SELECT name, price FROM products ORDER BY price DESC",
      requires: ["ORDER BY"],
      hints: [
        "Add an ORDER BY line at the end, sorting by price.",
        "Biggest first is descending: `ORDER BY price DESC`.",
      ],
    },
    takeaways: [
      "ORDER BY sorts the rows of the result by a column.",
      "It sorts ascending (smallest first) unless you add DESC.",
      "Sorting changes the order only: no rows are added or removed.",
    ],
    cheatsheet: [
      { sql: "SELECT name, price FROM products ORDER BY price", meaning: "Cheapest first" },
      { sql: "SELECT name, price FROM products ORDER BY price DESC", meaning: "Most expensive first" },
      { sql: "SELECT name FROM products ORDER BY name", meaning: "Names A to Z" },
    ],
  },
];
