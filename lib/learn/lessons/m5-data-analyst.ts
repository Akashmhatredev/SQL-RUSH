import { customers, lockers, marks, menu, orders, register } from "../datasets";
import type { Lesson } from "../types";

/** Module 5 · Data Analyst: summarising and joining (aggregates, GROUP BY, HAVING, JOINs). */
export const dataAnalyst: Lesson[] = [
  {
    id: "aggregates",
    summary: "COUNT, SUM, AVG, MIN and MAX squash a whole column into one answer.",
    minutes: 7,
    tables: [menu, lockers],
    steps: [
      {
        kind: "story",
        title: "Closing time at the restaurant",
        emoji: "🧾",
        body: "At the end of the day, Mrs Iyer, who runs the restaurant, doesn't want to read the whole menu again. She wants quick answers:\n\n- How many dishes do we have?\n- What is the cheapest dish? The most expensive?\n- What does a dish cost on average?\n\nEach answer is just **one number**, not a list.",
        paper: "products",
        think: {
          question: "How would you find the most expensive dish by hand?",
          answer:
            "Run your finger down the price column and remember the biggest number you have seen so far. When you reach the bottom, you are left with one number, not a list.",
        },
      },
      {
        kind: "explore",
        title: "Summaries are about columns",
        body: "Every question Mrs Iyer asked is about the **price** column. Tap it, then sort by it: the cheapest and the dearest dishes jump to the two ends.",
        table: "products",
        tasks: [
          { type: "click-column", prompt: "Tap the price column header", column: "price" },
          { type: "sort", prompt: "Sort the menu by price", column: "price" },
        ],
      },
      {
        kind: "animate",
        title: "Ten rows become one",
        body: "Watch the database answer all four questions at once. Keep an eye on how many rows are left at the end.",
        query:
          "SELECT COUNT(*) AS dishes, MIN(price) AS cheapest, MAX(price) AS dearest, AVG(price) AS average FROM products",
        narration: {
          "source.show": "Step 1: Here is the whole menu: 10 dishes.",
          "group.group": "Step 2: All 10 dishes are gathered into one big pile.",
          "group.aggregate":
            "Step 3: The pile is summed up: count the dishes, find the lowest and the highest price, and work out the average.",
          "project.pick": "Step 4: We keep just those four answers.",
          "project.result": "Every single dish detail is left out: only the summary remains.",
          result: "Step 5: Ten rows have become one row of answers.",
        },
      },
      {
        kind: "concept",
        title: "Five ways to sum up a column",
        body: "These five tools are called **aggregate functions**. Each one takes a whole column and squashes it into a single value.",
        points: [
          { emoji: "🔢", title: "COUNT", text: "How many rows: `COUNT(*)` gives 10 dishes." },
          { emoji: "➕", title: "SUM", text: "Adds the values up: `SUM(price)` is the price of one of everything." },
          { emoji: "⚖️", title: "AVG", text: "The average (mean): `AVG(price)` is 124." },
          { emoji: "⬇️", title: "MIN", text: "The smallest value: `MIN(price)` is 30." },
          { emoji: "⬆️", title: "MAX", text: "The biggest value: `MAX(price)` is 250." },
        ],
        compare: {
          before: { label: "The whole menu", table: "products" },
          after: {
            label: "Summed up",
            query: "SELECT COUNT(*) AS dishes, SUM(price) AS total, AVG(price) AS average FROM products",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL",
        body: "Aggregate functions go in the SELECT list. Add a WHERE and it runs **first**, so only the rows that pass are summed up. Tap each part to see its step.",
        query: "SELECT COUNT(*) AS drinks,\n       MAX(price) AS dearest\nFROM products\nWHERE category = 'Drink'",
        explain: {
          select: "COUNT(*) counts the rows and MAX(price) finds the biggest price. AS gives each answer a name.",
          from: "FROM products: summarise the menu.",
          where: "WHERE runs first, so only the 3 drinks reach the summary.",
        },
      },
      {
        kind: "concept",
        title: "COUNT(*) or COUNT(column)?",
        body: "Empty values (called **NULL**) are skipped by every aggregate function except `COUNT(*)`. The lockers table shows the difference: there are 5 lockers, but only 3 have a student in them.",
        points: [
          { emoji: "📦", title: "COUNT(*)", text: "Counts rows, empty or not: 5 lockers." },
          {
            emoji: "🧑‍🎓",
            title: "COUNT(student_id)",
            text: "Counts only the rows where student_id is filled in: 3 lockers in use.",
          },
          { emoji: "🙈", title: "The rest skip NULLs too", text: "SUM, AVG, MIN and MAX ignore empty values." },
        ],
        compare: {
          before: { label: "All lockers", table: "lockers" },
          after: {
            label: "Two different counts",
            query: "SELECT COUNT(*) AS lockers, COUNT(student_id) AS in_use FROM lockers",
          },
        },
      },
      {
        kind: "playground",
        title: "Ask your own summary questions",
        body: "Try different functions and add a WHERE to summarise just part of the menu.",
        starter: "SELECT COUNT(*) AS dishes, SUM(price) AS total\nFROM products",
        suggestions: [
          "SELECT AVG(price) AS average FROM products WHERE is_veg = true",
          "SELECT MIN(price) AS cheapest, MAX(price) AS dearest FROM products WHERE category = 'Main'",
          "SELECT ROUND(AVG(price), 1) AS average FROM products WHERE category = 'Drink'",
          "SELECT COUNT(*) AS lockers, COUNT(student_id) AS in_use FROM lockers",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "The menu has 10 rows. How many rows does `SELECT MAX(price) FROM products` return?",
        options: ["1", "10", "4", "0"],
        answer: 0,
        explain: "MAX squashes the whole price column into one value, so the result is a single row: 250.",
      },
      {
        kind: "pick-rows",
        prompt: "`SELECT COUNT(*) FROM products WHERE category = 'Snack'` returns 2. Tap the two rows it counted.",
        table: "products",
        query: "SELECT * FROM products WHERE category = 'Snack'",
        explain: "WHERE keeps the two snacks, Paneer Tikka and Samosa, and then COUNT(*) counts them.",
      },
      {
        kind: "choice",
        prompt:
          "There are 5 lockers, but only 3 have a student_id. What does `SELECT COUNT(student_id) FROM lockers` return?",
        table: "lockers",
        options: ["3", "5", "2", "NULL"],
        answer: 0,
        explain:
          "COUNT(column) skips empty (NULL) values, so only the 3 lockers with a student are counted. COUNT(*) would give 5.",
      },
      {
        kind: "order",
        prompt: "Put the pieces in order to find the **average price** of the menu.",
        tokens: ["SELECT", "AVG(price)", "FROM", "products"],
        distractors: ["SUM(price)", "WHERE"],
        explain: "AVG(price) goes in the SELECT list, and FROM says which table to summarise.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "Mrs Iyer wants one number: what would it cost to order **one of every Main dish**? Write a query that adds up the **price** of all the dishes in the **Main** category.",
      tables: ["products"],
      starter: "SELECT *\nFROM products\nWHERE category = 'Main'",
      solution: "SELECT SUM(price) FROM products WHERE category = 'Main'",
      requires: ["SUM"],
      hints: [
        "The WHERE is already right. Replace the * with a function that adds the prices up.",
        "SUM adds up a column: `SELECT SUM(price) FROM products WHERE category = 'Main'`.",
      ],
    },
    takeaways: [
      "COUNT, SUM, AVG, MIN and MAX squash many rows into one answer.",
      "COUNT(*) counts rows; COUNT(column) and the others skip empty (NULL) values.",
      "WHERE runs first, so you can summarise just some of the rows.",
    ],
    cheatsheet: [
      { sql: "SELECT COUNT(*) FROM products", meaning: "How many dishes there are" },
      { sql: "SELECT AVG(price) FROM products", meaning: "The average price" },
      { sql: "SELECT MAX(price) FROM products WHERE category = 'Drink'", meaning: "The dearest drink" },
    ],
  },
  {
    id: "group-by",
    summary: "GROUP BY sorts rows into piles that share a value, then sums up each pile separately.",
    minutes: 8,
    tables: [menu, marks],
    steps: [
      {
        kind: "story",
        title: "One answer per category",
        emoji: "🍽️",
        body: "Mrs Iyer liked her summary, but now she has a sharper question: *how many dishes do we have in each category?*\n\nOne number for the whole menu isn't enough any more. She wants **one line per category**: Main, Snack, Drink and Dessert.",
        paper: "products",
        think: {
          question: "How would you do this with paper slips, one slip per dish?",
          answer: "Sort the slips into piles, one pile per category. Then count each pile. Four piles, four answers.",
        },
      },
      {
        kind: "explore",
        title: "Spot the piles",
        body: "Sort the menu by category: dishes of the same kind line up next to each other. Each block of matching categories is a pile waiting to be counted.",
        table: "products",
        tasks: [
          { type: "sort", prompt: "Sort the menu by category", column: "category" },
          { type: "select-rows", prompt: "Select the three Drink rows", count: 3 },
        ],
      },
      {
        kind: "animate",
        title: "Watch the piles form",
        body: "This is exactly the paper-slip method, done by the database.",
        query: "SELECT category, COUNT(*) AS dishes FROM products GROUP BY category",
        narration: {
          "source.show": "Step 1: Here is the menu.",
          "group.group": "Step 2: The dishes go into piles, one pile for each category.",
          "group.aggregate": "Step 3: Each pile is counted, and each pile becomes a single row.",
          "project.pick": "Step 4: For each pile we show its category and how many dishes it has.",
          "project.result": "The individual dishes are not shown any more, only the piles.",
          result: "Step 5: Four categories, four rows.",
        },
      },
      {
        kind: "concept",
        title: "This is called grouping",
        body: "Grouping puts rows with the **same value** in a column into one group, then sums up each group on its own. Without grouping, a summary covers every row at once.",
        points: [
          { emoji: "🧺", title: "Same value, same pile", text: "All the Drink rows land in the Drink group." },
          { emoji: "1️⃣", title: "One row per group", text: "Each group comes out as exactly one row." },
          {
            emoji: "🧮",
            title: "A summary per group",
            text: "COUNT, SUM, AVG, MIN and MAX now work inside each group separately.",
          },
        ],
        compare: {
          before: { label: "The menu", table: "products" },
          after: {
            label: "Grouped by category",
            query: "SELECT category, COUNT(*) AS dishes, MIN(price) AS cheapest FROM products GROUP BY category",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: GROUP BY",
        body: "**GROUP BY** names the column to make piles from. It comes after FROM (and after WHERE, if there is one). Tap each part to see its step.",
        query: "SELECT category, COUNT(*) AS dishes\nFROM products\nGROUP BY category\nORDER BY dishes DESC",
        explain: {
          select: "Show the category of each pile, and COUNT(*) of the rows in it.",
          from: "FROM products: the rows to put in piles.",
          group: "GROUP BY category makes one pile for each different category.",
          order: "ORDER BY dishes DESC puts the biggest pile first.",
        },
      },
      {
        kind: "concept",
        title: "The golden rule",
        body: "A group comes out as **one row**, so every column you show must have one value per group.\n\nThe Main pile has four dishes with four different names. If you asked for `category, name` grouped by category, which name should the Main row show? SQL refuses to guess and gives an error instead.",
        points: [
          { emoji: "✅", title: "Grouped columns", text: "Columns in GROUP BY are fine: each pile has one category." },
          {
            emoji: "✅",
            title: "Summaries",
            text: "Anything inside COUNT, SUM, AVG, MIN or MAX is fine: it gives one value per pile.",
          },
          { emoji: "⛔", title: "Anything else", text: "A plain column like `name` causes an error." },
        ],
      },
      {
        kind: "playground",
        title: "Make your own groups",
        body: "Group the menu or the exam marks in different ways. Try a column that isn't grouped to see the error message too.",
        starter: "SELECT subject, AVG(score) AS average\nFROM marks\nGROUP BY subject",
        suggestions: [
          "SELECT student_id, COUNT(*) AS exams FROM marks GROUP BY student_id",
          "SELECT is_veg, COUNT(*) AS dishes FROM products GROUP BY is_veg",
          "SELECT category, SUM(price) AS total FROM products GROUP BY category ORDER BY total DESC",
          "SELECT subject, MIN(score) AS lowest FROM marks GROUP BY subject",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "The marks table has Maths, Science and English marks. How many rows does this return?",
        code: "SELECT subject, COUNT(*)\nFROM marks\nGROUP BY subject",
        table: "marks",
        options: ["3", "10", "1", "4"],
        answer: 0,
        explain: "There are three different subjects, so there are three piles, and each pile becomes one row.",
      },
      {
        kind: "choice",
        prompt: "Why does `SELECT category, name FROM products GROUP BY category` give an error?",
        options: [
          "Each category has several names, but its row can only show one",
          "name is not a real column",
          "GROUP BY must come before FROM",
          "You can only group by numbers",
        ],
        answer: 0,
        explain:
          "A group is squashed into one row. The Main group has four dish names, so SQL can't pick one. Put name inside an aggregate or in GROUP BY.",
      },
      {
        kind: "pick-column",
        prompt: "To count the dishes in each category, which column do you GROUP BY? Tap it.",
        table: "products",
        column: "category",
        explain: "GROUP BY category makes one pile per category, and COUNT(*) counts each pile.",
      },
      {
        kind: "order",
        prompt: "Put the pieces in order to find the **highest score** in each subject.",
        tokens: ["SELECT", "subject,", "MAX(score)", "FROM", "marks", "GROUP BY", "subject"],
        distractors: ["WHERE"],
        explain: "Group the marks by subject, then MAX(score) finds the top score inside each group.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "For each **subject** in the marks table, show the subject and its **highest score**. Call the second column `best`.",
      tables: ["marks"],
      starter: "SELECT subject, MAX(score) AS best\nFROM marks\n",
      solution: "SELECT subject, MAX(score) AS best FROM marks GROUP BY subject",
      requires: ["GROUP BY"],
      hints: [
        "Run the starter and read the error: subject needs to be grouped.",
        "Add `GROUP BY subject` on the line after FROM marks.",
      ],
    },
    takeaways: [
      "GROUP BY puts rows with the same value into one group.",
      "Each group becomes exactly one row in the result.",
      "Every column you show must be grouped or inside an aggregate like COUNT or MAX.",
    ],
    cheatsheet: [
      { sql: "SELECT category, COUNT(*) FROM products GROUP BY category", meaning: "Dishes per category" },
      { sql: "SELECT subject, AVG(score) FROM marks GROUP BY subject", meaning: "Average score per subject" },
    ],
  },
  {
    id: "having",
    summary: "HAVING filters whole groups after they are made, the way WHERE filters single rows.",
    minutes: 7,
    tables: [menu, marks],
    steps: [
      {
        kind: "story",
        title: "Cards for the big categories",
        emoji: "🗂️",
        body: "Mrs Iyer prints a separate menu card for each category. But a card with just one dish on it looks empty, so she only prints cards for categories with **at least 2 dishes**.\n\nThis time the question isn't about single dishes. It's about whole **groups** of dishes.",
        paper: "products",
        think: {
          question: "Can you decide whether Dessert gets a card by looking at one row?",
          answer:
            "No. You have to make the Dessert pile first and count it. Only then do you know it has just 1 dish, so it gets no card.",
        },
      },
      {
        kind: "animate",
        title: "Make piles, then filter the piles",
        body: "Watch the order of the steps: first the piles are made and counted, and only then are they checked.",
        query: "SELECT category, COUNT(*) AS dishes FROM products GROUP BY category HAVING COUNT(*) >= 2",
        narration: {
          "source.show": "Here is the menu.",
          "group.group": "Step 1: The dishes go into piles by category.",
          "group.aggregate": "Step 2: Each pile is counted.",
          "having.check": "Step 3: Now each pile is asked a question: does it have at least 2 dishes?",
          "having.keep": "Step 4: Piles that pass stay. Dessert has only 1 dish, so it is dropped.",
          "project.pick": "We show each category and its count.",
          result: "Here are the categories that get a menu card.",
        },
      },
      {
        kind: "concept",
        title: "Two kinds of filter",
        body: "You already know one filter: it checks single **rows**. This new one checks whole **groups**, after they have been made and counted.",
        points: [
          { emoji: "🔍", title: "Rows first", text: "WHERE checks each row before anything is grouped." },
          { emoji: "🧺", title: "Then groups", text: "The rows that pass are put in piles and summed up." },
          {
            emoji: "✂️",
            title: "Groups filtered",
            text: "The new filter keeps only the piles that pass its question.",
          },
        ],
        compare: {
          before: { label: "The menu", table: "products" },
          after: {
            label: "Categories with 2+ dishes",
            query: "SELECT category, COUNT(*) AS dishes FROM products GROUP BY category HAVING COUNT(*) >= 2",
          },
        },
      },
      {
        kind: "concept",
        title: "Why WHERE can't do it",
        body: "WHERE looks at **one row at a time**. A single dish doesn't have a count: only a pile does. So `WHERE COUNT(*) >= 2` is an error, and SQL will tell you to use HAVING instead.",
        points: [
          { emoji: "🙋", title: "WHERE", text: "Asks about one row: *is this dish a drink?*" },
          { emoji: "👪", title: "HAVING", text: "Asks about one group: *does this category have 2 or more dishes?*" },
        ],
      },
      {
        kind: "syntax",
        title: "Now in SQL: HAVING",
        body: "**HAVING** goes straight after GROUP BY, and its question usually uses an aggregate like COUNT or AVG. Tap each part to see its step.",
        query: "SELECT category, COUNT(*) AS dishes\nFROM products\nGROUP BY category\nHAVING COUNT(*) >= 2",
        explain: {
          select: "Show each pile's category and its count.",
          from: "FROM products: the rows to group.",
          group: "GROUP BY category makes one pile per category.",
          having: "HAVING COUNT(*) >= 2 keeps only the piles with at least 2 dishes.",
        },
      },
      {
        kind: "animate",
        title: "WHERE and HAVING together",
        body: "Both filters can appear in one query. WHERE goes first and throws out rows; HAVING comes later and throws out groups. Here we count only the **vegetarian** dishes.",
        query:
          "SELECT category, COUNT(*) AS veg_dishes FROM products WHERE is_veg = true GROUP BY category HAVING COUNT(*) >= 2",
        showSql: true,
      },
      {
        kind: "playground",
        title: "Filter some groups",
        body: "Try different HAVING questions on the menu and on the exam marks.",
        starter: "SELECT category, COUNT(*) AS dishes\nFROM products\nGROUP BY category\nHAVING COUNT(*) >= 3",
        suggestions: [
          "SELECT subject, COUNT(*) AS students FROM marks GROUP BY subject HAVING COUNT(*) = 3",
          "SELECT category, AVG(price) AS average FROM products GROUP BY category HAVING AVG(price) > 100",
          "SELECT student_id, MIN(score) AS lowest FROM marks GROUP BY student_id HAVING MIN(score) >= 70",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "What's the difference between WHERE and HAVING?",
        options: [
          "WHERE filters rows before grouping; HAVING filters groups after",
          "They do exactly the same thing",
          "HAVING filters rows; WHERE filters groups",
          "HAVING sorts the groups",
        ],
        answer: 0,
        explain: "WHERE works on single rows, before any piles exist. HAVING works on the finished piles.",
      },
      {
        kind: "choice",
        prompt: "Maths has 4 marks, Science 3 and English 3. Which subjects does this return?",
        code: "SELECT subject, COUNT(*) AS students\nFROM marks\nGROUP BY subject\nHAVING COUNT(*) = 3",
        table: "marks",
        options: ["Science and English", "Maths only", "All three subjects", "None of them"],
        answer: 0,
        explain: "Only the Science and English groups have exactly 3 rows, so only they pass HAVING.",
      },
      {
        kind: "order",
        prompt: "Put the clauses in order to list the categories with **more than 2** dishes.",
        tokens: ["SELECT category, COUNT(*)", "FROM products", "GROUP BY category", "HAVING COUNT(*) > 2"],
        distractors: ["WHERE COUNT(*) > 2"],
        explain:
          "Group first, then filter the groups with HAVING. WHERE can't use COUNT, because it looks at one row at a time.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "Find the strong students: show each **student_id** whose **average score is above 80**, with the average in a column called `average`.",
      tables: ["marks"],
      starter: "SELECT student_id, AVG(score) AS average\nFROM marks\nGROUP BY student_id\n",
      solution: "SELECT student_id, AVG(score) AS average FROM marks GROUP BY student_id HAVING AVG(score) > 80",
      requires: ["HAVING"],
      hints: [
        "The starter already makes one group per student. Now keep only the groups whose average is above 80.",
        "Add `HAVING AVG(score) > 80` after the GROUP BY line.",
      ],
    },
    takeaways: [
      "HAVING filters groups after they are made; WHERE filters rows before.",
      "HAVING usually uses an aggregate, like COUNT(*) >= 2 or AVG(score) > 80.",
      "One query can use both: WHERE first, then GROUP BY, then HAVING.",
    ],
    cheatsheet: [
      {
        sql: "SELECT category, COUNT(*) FROM products GROUP BY category HAVING COUNT(*) >= 2",
        meaning: "Categories with at least 2 dishes",
      },
      {
        sql: "SELECT student_id, AVG(score) FROM marks GROUP BY student_id HAVING AVG(score) > 80",
        meaning: "Students averaging above 80",
      },
    ],
  },
  {
    id: "inner-join",
    summary: "A JOIN puts two tables side by side, matching rows that share a value.",
    minutes: 8,
    tables: [customers, orders],
    steps: [
      {
        kind: "story",
        title: "Who ordered what?",
        emoji: "📦",
        body: "An online bookshop keeps its customers in one table and its orders in another. An order doesn't say *Aarav*: it only says **customer_id 1**.\n\nTo print delivery labels, we need the customer's name **and** the book on the same line. That means using both tables at once.",
        paper: "orders",
        think: {
          question: "Order 1004 says customer_id 4. How would you find out who that is?",
          answer: "Look up 4 in the customers table: it's Kiara, from Pune. You matched the two tables by customer_id.",
        },
      },
      {
        kind: "database",
        title: "Two tables, one link",
        body: "Here are both tables. The customer_id column in orders points at the customer_id column in customers. That link is how the two tables fit together.",
        tables: ["customers", "orders"],
        tasks: [
          { type: "open-table", prompt: "Open the orders table", table: "orders" },
          { type: "find-link", prompt: "Find the link between the two tables" },
        ],
      },
      {
        kind: "animate",
        title: "Watch the tables meet",
        body: "The database does what you did for order 1004, but for every customer at once.",
        query:
          "SELECT customers.name, orders.book, orders.amount FROM customers JOIN orders ON customers.customer_id = orders.customer_id",
        narration: {
          "source.show": "Here are the customers.",
          "join.show": "Step 1: Customers on the left, orders on the right.",
          "join.match": "Step 2: For each customer, we look for orders with the same customer_id.",
          "join.result":
            "Step 3: Every match becomes one row, with the customer's details next to the order's. Ishaan and Vihaan have no orders, so they don't appear.",
          "project.pick": "Step 4: We keep the name, the book and the amount.",
          "project.result": "The id columns are left out: we only needed them for matching.",
          result: "Here is every order, now with the customer's name on it.",
        },
      },
      {
        kind: "concept",
        title: "This is called joining",
        body: "Joining combines two tables into one wider table by **matching rows** that share a value, here the customer_id. This kind of join keeps only the rows that found a partner.",
        points: [
          {
            emoji: "🔗",
            title: "Match on a shared column",
            text: "customer_id is in both tables, so it can pair them up.",
          },
          { emoji: "👯", title: "One row per match", text: "Aarav has 3 orders, so he appears 3 times." },
          { emoji: "🚫", title: "No match, no row", text: "Ishaan and Vihaan never ordered, so they are left out." },
        ],
        compare: {
          before: { label: "Orders alone", table: "orders" },
          after: {
            label: "Orders with names",
            query:
              "SELECT customers.name, orders.book FROM customers JOIN orders ON customers.customer_id = orders.customer_id",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: JOIN … ON",
        body: "**JOIN** brings in the second table and **ON** says which rows belong together. Because both tables have columns, write `table.column` to say where each one comes from. Tap each part to see its step.",
        query:
          "SELECT customers.name, orders.book\nFROM customers\nJOIN orders ON customers.customer_id = orders.customer_id",
        explain: {
          select: "customers.name means the name column from the customers table.",
          from: "FROM customers: start with the customers on the left.",
          join: "JOIN orders brings in the orders. ON says a customer and an order match when their customer_id is the same.",
        },
      },
      {
        kind: "concept",
        title: "Handy shortcuts",
        body: "Joins can get wordy, so SQL has a few shortcuts.",
        points: [
          {
            emoji: "✂️",
            title: "Short names",
            text: "`FROM customers c` lets you write `c.name` instead of `customers.name`.",
          },
          { emoji: "🟰", title: "JOIN = INNER JOIN", text: "`INNER JOIN` means exactly the same as `JOIN`." },
          {
            emoji: "⚠️",
            title: "Say which table",
            text: "customer_id is in both tables, so write `c.customer_id`, not just `customer_id`.",
          },
        ],
      },
      {
        kind: "playground",
        title: "Join it yourself",
        body: "Join the customers and orders in different ways. Try adding a WHERE, or even a GROUP BY.",
        starter:
          "SELECT c.name, o.book, o.order_date\nFROM customers c\nJOIN orders o ON c.customer_id = o.customer_id",
        suggestions: [
          "SELECT c.name, o.book FROM customers c JOIN orders o ON c.customer_id = o.customer_id WHERE c.city = 'Pune'",
          "SELECT c.name, SUM(o.amount) AS spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.name",
          "SELECT o.order_id, c.city FROM orders o JOIN customers c ON o.customer_id = c.customer_id ORDER BY o.order_id",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "Ishaan (customer 3) has never ordered. Does he appear when customers are joined to orders like this?",
        options: [
          "No, because he has no matching order",
          "Yes, with empty order columns",
          "Yes, once for every order",
          "Only if he lives in Pune",
        ],
        answer: 0,
        explain: "This join only keeps rows that found a partner. Ishaan has no order to pair with, so he is left out.",
      },
      {
        kind: "choice",
        prompt: "Aarav placed 3 orders. How many rows does he get in the joined result?",
        options: ["3", "1", "0", "7"],
        answer: 0,
        explain: "Each match becomes one row, so Aarav's customer row is paired with each of his 3 orders.",
      },
      {
        kind: "pick-column",
        prompt: "Which column in orders points at the customers table? Tap it.",
        table: "orders",
        column: "customer_id",
        explain: "orders.customer_id holds a customer_id from the customers table. It's the link the join matches on.",
      },
      {
        kind: "order",
        prompt: "Put the pieces in order to show each order's **book** next to the customer's **name**.",
        tokens: [
          "SELECT customers.name, orders.book",
          "FROM customers",
          "JOIN orders",
          "ON customers.customer_id = orders.customer_id",
        ],
        distractors: ["WHERE customers.name = orders.book"],
        explain: "Start FROM one table, JOIN the other, and say ON which columns match.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "Time for delivery labels! Show each customer's **name** and **city** next to the **book** they ordered, one row per order.",
      tables: ["customers", "orders"],
      starter: "SELECT customers.name, customers.city, orders.book\nFROM customers\n",
      solution:
        "SELECT customers.name, customers.city, orders.book FROM customers JOIN orders ON customers.customer_id = orders.customer_id",
      requires: ["JOIN", "ON"],
      hints: [
        "The orders table isn't in the query yet. Bring it in with JOIN.",
        "Add `JOIN orders ON customers.customer_id = orders.customer_id` under FROM customers.",
      ],
    },
    takeaways: [
      "JOIN puts two tables side by side by matching rows that share a value.",
      "ON says which columns must match, like customers.customer_id = orders.customer_id.",
      "A plain (INNER) JOIN keeps only rows that found a partner.",
    ],
    cheatsheet: [
      {
        sql: "SELECT c.name, o.book FROM customers c JOIN orders o ON c.customer_id = o.customer_id",
        meaning: "Every order with its customer's name",
      },
    ],
  },
  {
    id: "outer-joins",
    summary: "LEFT, RIGHT and FULL JOIN keep the rows that found no partner, filling the gaps with NULL.",
    minutes: 8,
    tables: [register, lockers],
    steps: [
      {
        kind: "story",
        title: "Who has a locker?",
        emoji: "🔐",
        body: "The school ran out of lockers last term. The caretaker wants **one list of every student**, with their locker number if they have one.\n\nThe join you know keeps only matches, so students without a locker would vanish from the list. But they are exactly the ones the caretaker is looking for!",
        paper: "lockers",
        think: {
          question: "Priya (102) isn't in the lockers table. Should she be on the caretaker's list?",
          answer:
            "Yes! She is a student without a locker, which is just what the caretaker needs to know. We need a join that keeps her.",
        },
      },
      {
        kind: "database",
        title: "Students and lockers",
        body: "lockers.student_id points at students.student_id. Some students have no locker, and some lockers are empty.",
        tables: ["students", "lockers"],
        tasks: [
          { type: "open-table", prompt: "Open the lockers table", table: "lockers" },
          { type: "find-link", prompt: "Find the link between the two tables" },
        ],
      },
      {
        kind: "animate",
        title: "Keep every student",
        body: "Watch what happens to Priya this time.",
        query:
          "SELECT students.name, lockers.locker_no FROM students LEFT JOIN lockers ON students.student_id = lockers.student_id",
        narration: {
          "source.show": "Here are the students.",
          "join.show": "Step 1: Students on the left, lockers on the right.",
          "join.match": "Step 2: For each student, we look for a locker with their student_id.",
          "join.result":
            "Step 3: Every student stays. Priya has no locker, so her locker columns are left empty (NULL).",
          "project.pick": "Step 4: We keep each name and locker number.",
          "project.result": "Everything else is left out.",
          result: "Every student is on the list, with or without a locker.",
        },
      },
      {
        kind: "concept",
        title: "Keeping the unmatched rows",
        body: "This join keeps **every row from the left table**, even when there is no partner on the right. Where there is no partner, the right side is filled with **NULL**, meaning *nothing here*.",
        points: [
          { emoji: "⬅️", title: "Left side always stays", text: "All 4 students appear." },
          { emoji: "🕳️", title: "Gaps become NULL", text: "Priya's locker_no is empty." },
          { emoji: "🆚", title: "Compare with JOIN", text: "A plain JOIN would have dropped Priya." },
        ],
        compare: {
          before: { label: "All students", table: "students" },
          after: {
            label: "With lockers, if any",
            query:
              "SELECT students.name, lockers.locker_no FROM students LEFT JOIN lockers ON students.student_id = lockers.student_id",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: LEFT JOIN",
        body: "It looks just like a JOIN, with one extra word: **LEFT**. The left table is the one written first, after FROM. Tap each part to see its step.",
        query:
          "SELECT students.name, lockers.locker_no\nFROM students\nLEFT JOIN lockers\n  ON students.student_id = lockers.student_id",
        explain: {
          select: "Show each student's name and locker number.",
          from: "FROM students: this is the left table, and all of its rows will be kept.",
          join: "LEFT JOIN lockers brings in the lockers. Students with no matching locker still stay, with NULLs.",
        },
      },
      {
        kind: "animate",
        title: "Four kinds of join",
        body: "Switch between the join types and watch which rows without a partner survive:\n\n- **INNER JOIN**: only the matches\n- **LEFT JOIN**: the matches, plus every student\n- **RIGHT JOIN**: the matches, plus every locker\n- **FULL JOIN**: the matches, plus everything else from both sides",
        query:
          "SELECT students.name, lockers.locker_no FROM students LEFT JOIN lockers ON students.student_id = lockers.student_id",
        showSql: true,
        joinTypes: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN"],
      },
      {
        kind: "playground",
        title: "Try every join",
        body: "Change the join type and the columns. The last two suggestions use the NULLs to find the gaps.",
        starter:
          "SELECT students.name, lockers.locker_no\nFROM students\nFULL JOIN lockers ON students.student_id = lockers.student_id",
        suggestions: [
          "SELECT lockers.locker_no, students.name FROM students RIGHT JOIN lockers ON students.student_id = lockers.student_id",
          "SELECT students.name FROM students LEFT JOIN lockers ON students.student_id = lockers.student_id WHERE lockers.locker_no IS NULL",
          "SELECT lockers.locker_no FROM students RIGHT JOIN lockers ON students.student_id = lockers.student_id WHERE students.student_id IS NULL",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "Which join keeps **every student**, even the ones without a locker?",
        options: [
          "students LEFT JOIN lockers",
          "students INNER JOIN lockers",
          "students RIGHT JOIN lockers",
          "None of them can",
        ],
        answer: 0,
        explain: "students is written first, so it's the left table. LEFT JOIN keeps every row of the left table.",
      },
      {
        kind: "choice",
        prompt: "How many rows does this FULL JOIN return?",
        code: "SELECT students.name, lockers.locker_no\nFROM students\nFULL JOIN lockers ON students.student_id = lockers.student_id",
        options: ["6", "3", "4", "5"],
        answer: 0,
        explain: "3 students with lockers, plus Priya with no locker, plus the 2 empty lockers (L3 and L5): 6 rows.",
      },
      {
        kind: "choice",
        prompt: "In a LEFT JOIN, what goes in the right table's columns when a left row has no match?",
        options: ["NULL (empty)", "0", "A copy of the left row", "The row is removed"],
        answer: 0,
        explain: "The row is kept and the missing side is filled with NULL, meaning there is nothing there.",
      },
      {
        kind: "order",
        prompt: "Put the pieces in order to list **every student** with their locker, if they have one.",
        tokens: [
          "SELECT students.name, lockers.locker_no",
          "FROM students",
          "LEFT JOIN lockers",
          "ON students.student_id = lockers.student_id",
        ],
        distractors: ["INNER JOIN lockers"],
        explain: "LEFT JOIN keeps every student, the table written first. INNER JOIN would drop Priya.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "Now the caretaker wants the opposite list: **every locker**, with the **name** of the student using it. Empty lockers must be on the list too. Show `locker_no` and `name`. The starter loses the empty lockers: fix it.",
      tables: ["lockers", "students"],
      starter:
        "SELECT lockers.locker_no, students.name\nFROM lockers\nJOIN students ON lockers.student_id = students.student_id",
      solution:
        "SELECT lockers.locker_no, students.name FROM lockers LEFT JOIN students ON lockers.student_id = students.student_id",
      requires: ["JOIN"],
      hints: [
        "A plain JOIN drops L3 and L5. Which join keeps every row of the table written first?",
        "lockers is written first, so change JOIN to LEFT JOIN.",
      ],
    },
    takeaways: [
      "LEFT JOIN keeps every row of the first table; RIGHT JOIN keeps every row of the second.",
      "FULL JOIN keeps everything from both sides; INNER JOIN keeps only the matches.",
      "Where a row has no partner, the other side's columns are NULL.",
    ],
    cheatsheet: [
      {
        sql: "SELECT s.name, l.locker_no FROM students s LEFT JOIN lockers l ON s.student_id = l.student_id",
        meaning: "Every student, with a locker if they have one",
      },
      {
        sql: "SELECT s.name, l.locker_no FROM students s FULL JOIN lockers l ON s.student_id = l.student_id",
        meaning: "Every student and every locker",
      },
    ],
  },
];
