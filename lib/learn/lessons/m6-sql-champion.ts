import { classList, customers, employees, marks, menu, orders } from "../datasets";
import type { Lesson } from "../types";

/** Module 6 · SQL Champion: subqueries, CTEs, CASE WHEN and window functions. */
export const sqlChampion: Lesson[] = [
  {
    id: "subqueries",
    summary: "A subquery is a query inside a query: its answer is worked out first and then used.",
    minutes: 8,
    tables: [menu, customers, orders],
    steps: [
      {
        kind: "story",
        title: "Pricier than average",
        emoji: "⭐",
        body: "Mrs Iyer wants to put a star next to every dish that costs **more than the average dish**. But she doesn't know the average yet.\n\nSo there are really two questions, one after the other:\n\n- What is the average price?\n- Which dishes cost more than that?",
        paper: "products",
        think: {
          question: "Which of the two questions has to be answered first?",
          answer: "The average. You can't compare prices with a number you don't know yet.",
        },
      },
      {
        kind: "predict",
        title: "Find the starred dishes",
        body: "We have worked out the first answer for you: the average dish costs **₹124**. Now you do the second part.",
        table: "products",
        query: "SELECT * FROM products WHERE price > (SELECT AVG(price) FROM products)",
        prompt: "Tap every dish that costs **more than ₹124**, then press Check.",
        explain:
          "Four dishes cost more than ₹124: Paneer Tikka, Chicken Biryani, Fish Curry and Pav Bhaji. Masala Dosa, at ₹120, is just below.",
      },
      {
        kind: "animate",
        title: "Watch both questions run",
        body: "The database works out the average on its own, then uses it to check every dish.",
        query: "SELECT * FROM products WHERE price > (SELECT AVG(price) FROM products)",
        narration: {
          "source.show":
            "Step 1: First the database quietly answers the inner question: the average price of the menu is 124. Then it looks at every dish.",
          "where.check": "Step 2: Each dish is checked: is its price more than 124?",
          "where.keep": "Step 3: Four dishes pass. The others are set aside.",
          "project.pick": "We keep all of their details.",
          result: "Here are the dishes that get a star.",
        },
      },
      {
        kind: "concept",
        title: "A query inside a query",
        body: "A **subquery** is a whole query written inside another one, in brackets. The inner query runs first and its answer is plugged into the outer query, as if you had typed the number yourself.",
        points: [
          { emoji: "1️⃣", title: "Inner query first", text: "`(SELECT AVG(price) FROM products)` works out 124." },
          { emoji: "🔌", title: "Its answer is plugged in", text: "The condition becomes `price > 124`." },
          {
            emoji: "🔄",
            title: "Always up to date",
            text: "Change a price and the average changes too. You never type the number yourself.",
          },
        ],
        compare: {
          before: { label: "The menu", table: "products" },
          after: {
            label: "Above average",
            query: "SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products)",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL",
        body: "The subquery goes exactly where the number would go, wrapped in brackets. Tap each part to see its step.",
        query: "SELECT name, price\nFROM products\nWHERE price > (SELECT AVG(price) FROM products)",
        explain: {
          select: "Show each starred dish's name and price.",
          from: "FROM products: check the menu.",
          where:
            "The part in brackets is a whole query of its own. It runs first and becomes 124, so this line means WHERE price > 124.",
        },
      },
      {
        kind: "concept",
        title: "A list from a subquery: IN",
        body: "A subquery can also return a **list**. Use it with IN. Which customers have placed an order? The inner query lists the customer_ids in orders, and IN keeps the customers whose id is in that list.",
        points: [
          {
            emoji: "📋",
            title: "Inner query: a list",
            text: "`SELECT customer_id FROM orders` gives 1, 2, 1, 4, 2, 1, 4.",
          },
          { emoji: "✅", title: "IN checks the list", text: "Aarav (1), Diya (2) and Kiara (4) are in it." },
          { emoji: "🙅", title: "NOT IN", text: "Flip it to find Ishaan and Vihaan, who have never ordered." },
        ],
        compare: {
          before: { label: "All customers", table: "customers" },
          after: {
            label: "Customers who ordered",
            query: "SELECT * FROM customers WHERE customer_id IN (SELECT customer_id FROM orders)",
          },
        },
      },
      {
        kind: "playground",
        title: "Nest your own queries",
        body: "Change the outer question, the inner question, or both.",
        starter: "SELECT name, price\nFROM products\nWHERE price < (SELECT AVG(price) FROM products)",
        suggestions: [
          "SELECT name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders)",
          "SELECT name FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders)",
          "SELECT name, price FROM products WHERE price = (SELECT MAX(price) FROM products)",
        ],
      },
    ],
    check: [
      {
        kind: "pick-rows",
        prompt:
          "Which customers does `SELECT * FROM customers WHERE customer_id IN (SELECT customer_id FROM orders)` return? Tap them.",
        table: "customers",
        query: "SELECT * FROM customers WHERE customer_id IN (SELECT customer_id FROM orders)",
        explain: "Only customers 1, 2 and 4 appear in orders: Aarav, Diya and Kiara.",
      },
      {
        kind: "choice",
        prompt: "In `WHERE price > (SELECT AVG(price) FROM products)`, which part is worked out first?",
        options: [
          "The query in brackets",
          "The outer SELECT",
          "Both at exactly the same time",
          "Neither: it's an error",
        ],
        answer: 0,
        explain: "The inner query must run first, because the outer query needs its answer (124) to check each dish.",
      },
      {
        kind: "choice",
        prompt: "What does this query return?",
        code: "SELECT name\nFROM products\nWHERE price = (SELECT MIN(price) FROM products)",
        table: "products",
        options: ["Masala Chai", "Samosa", "Every dish", "Nothing"],
        answer: 0,
        explain: "The inner query finds the lowest price, 30. The only dish that costs exactly 30 is Masala Chai.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "Which orders were bigger than usual? Show the **book** of every order whose **amount** is **more than the average order amount**. Let a subquery work out the average.",
      tables: ["orders"],
      starter: "SELECT book\nFROM orders\n",
      solution: "SELECT book FROM orders WHERE amount > (SELECT AVG(amount) FROM orders)",
      requires: ["AVG"],
      hints: [
        "You need a WHERE that compares amount with the average amount, worked out by a query in brackets.",
        "`WHERE amount > (SELECT AVG(amount) FROM orders)`",
      ],
    },
    takeaways: [
      "A subquery is a query in brackets inside another query.",
      "The inner query runs first; its answer is used by the outer query.",
      "A subquery can give one value (use it with > or =) or a list (use it with IN).",
    ],
    cheatsheet: [
      {
        sql: "SELECT name FROM products WHERE price > (SELECT AVG(price) FROM products)",
        meaning: "Dishes that cost more than average",
      },
      {
        sql: "SELECT name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders)",
        meaning: "Customers who have ordered",
      },
    ],
  },
  {
    id: "ctes",
    summary: "WITH gives a step of your query a name, so the next step can use it like a table.",
    minutes: 7,
    tables: [classList, menu, customers, orders],
    steps: [
      {
        kind: "story",
        title: "One step at a time",
        emoji: "📝",
        body: "Big questions are easier in small steps. Say we are planning a trip for students who live in **Pune** and are **older than 18**.\n\nFirst, make a list of the Pune students and call it *pune_students*. Then pick the over-18s from that list. Giving step one a name makes step two easy to read.",
        cards: [
          { emoji: "1️⃣", label: "Make a list", text: "Students from Pune" },
          { emoji: "🏷️", label: "Name it", text: "pune_students" },
          { emoji: "2️⃣", label: "Use the list", text: "Who is older than 18?" },
        ],
      },
      {
        kind: "animate",
        title: "Watch a named step",
        body: "The first steps happen *inside* the named list. Then the main question uses that list as if it were a table.",
        query:
          "WITH pune_students AS (SELECT * FROM students WHERE city = 'Pune') SELECT name, age FROM pune_students WHERE age > 18",
        narration: {
          "cte.show":
            "The first step is done. Its answer, the 3 students from Pune, gets a name: pune_students. From now on it can be used just like a table.",
          result: "Step two is done: the Pune students who are older than 18.",
        },
      },
      {
        kind: "concept",
        title: "Naming a step",
        body: "This is called a **common table expression**, or **CTE** for short. It is like writing the answer to step one on a sticky note, naming the note, and then reading from it in step two.",
        points: [
          { emoji: "🏷️", title: "Step one gets a name", text: "Here it is called pune_students." },
          {
            emoji: "📖",
            title: "Step two reads it like a table",
            text: "`FROM pune_students` works just like `FROM students`.",
          },
          {
            emoji: "🧽",
            title: "Nothing is saved",
            text: "The name only lasts while this one query runs. No new table is created.",
          },
        ],
        compare: {
          before: { label: "All students", table: "students" },
          after: {
            label: "Step two's answer",
            query:
              "WITH pune_students AS (SELECT * FROM students WHERE city = 'Pune') SELECT name, age FROM pune_students WHERE age > 18",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: WITH",
        body: "**WITH** comes first: the name, the word AS, and step one in brackets. The main query follows straight after. Tap each part to see its step.",
        query:
          "WITH pune_students AS (\n  SELECT * FROM students WHERE city = 'Pune'\n)\nSELECT name, age\nFROM pune_students\nWHERE age > 18",
        explain: {
          with: "WITH pune_students AS ( … ) runs the query in brackets and names its result pune_students.",
          select: "Show the name and age from the named result.",
          from: "FROM pune_students reads the named step as if it were a table.",
          where: "Then a normal WHERE works on it: keep the students older than 18.",
        },
      },
      {
        kind: "animate",
        title: "A step with a summary in it",
        body: "WITH really shines when step one is a summary. Here step one counts each customer's orders, and step two joins those counts to the customers' names.",
        query:
          "WITH order_counts AS (SELECT customer_id, COUNT(*) AS orders FROM orders GROUP BY customer_id) SELECT customers.name, order_counts.orders FROM customers JOIN order_counts ON customers.customer_id = order_counts.customer_id",
        showSql: true,
      },
      {
        kind: "playground",
        title: "Name your own steps",
        body: "Write a WITH step and use it in the main query.",
        starter:
          "WITH order_counts AS (\n  SELECT customer_id, COUNT(*) AS orders\n  FROM orders\n  GROUP BY customer_id\n)\nSELECT customers.name, order_counts.orders\nFROM customers\nJOIN order_counts ON customers.customer_id = order_counts.customer_id",
        suggestions: [
          "WITH drinks AS (SELECT * FROM products WHERE category = 'Drink') SELECT name, price FROM drinks ORDER BY price",
          "WITH big_orders AS (SELECT * FROM orders WHERE amount >= 250) SELECT book, amount FROM big_orders",
          "WITH veg AS (SELECT * FROM products WHERE is_veg = true) SELECT category, COUNT(*) AS dishes FROM veg GROUP BY category",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "What does `WITH pune_students AS ( … )` do?",
        options: [
          "Runs the query in brackets and names its result for the rest of the query",
          "Creates a new permanent table called pune_students",
          "Deletes the students who aren't from Pune",
          "Sorts the students by city",
        ],
        answer: 0,
        explain: "WITH names a step. The name only exists while the query runs; nothing is saved or deleted.",
      },
      {
        kind: "choice",
        prompt: "There are 3 drinks on the menu. What does this return?",
        code: "WITH drinks AS (SELECT * FROM products WHERE category = 'Drink')\nSELECT COUNT(*) AS n FROM drinks",
        table: "products",
        options: ["3", "10", "1", "4"],
        answer: 0,
        explain: "Step one keeps the 3 drinks and names them drinks. Step two counts the rows in drinks: 3.",
      },
      {
        kind: "order",
        prompt: "Put the pieces in order: name the students aged **18 or more** `adults`, then show their names.",
        tokens: ["WITH adults AS", "(SELECT * FROM students WHERE age >= 18)", "SELECT name", "FROM adults"],
        distractors: ["FROM students"],
        explain: "WITH, the name and AS come first, then step one in brackets. The main query reads FROM the name.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "The snack counter sells everything under ₹100 except drinks. The starter names the dishes under ₹100 `cheap`. Finish the main query so it shows the **name** and **category** of the cheap dishes that are **not drinks**.",
      tables: ["products"],
      starter: "WITH cheap AS (\n  SELECT * FROM products WHERE price < 100\n)\nSELECT name, category\nFROM cheap",
      solution:
        "WITH cheap AS (SELECT * FROM products WHERE price < 100) SELECT name, category FROM cheap WHERE category != 'Drink'",
      requires: ["WITH"],
      hints: [
        "The main query reads from cheap, which has 4 dishes. Two of them are drinks: filter those out.",
        "Add `WHERE category != 'Drink'` at the end.",
      ],
    },
    takeaways: [
      "WITH gives a step of a query a name.",
      "The main query can read that name just like a table.",
      "Nothing is saved: the name only lasts while the query runs.",
    ],
    cheatsheet: [
      {
        sql: "WITH pune_students AS (SELECT * FROM students WHERE city = 'Pune') SELECT name FROM pune_students",
        meaning: "Name a step, then use it",
      },
    ],
  },
  {
    id: "case-when",
    summary: "CASE WHEN works out a new value for every row by checking rules from top to bottom.",
    minutes: 7,
    tables: [menu, marks],
    steps: [
      {
        kind: "story",
        title: "Price labels",
        emoji: "🏷️",
        body: "Mrs Iyer is reprinting the menu with a label next to each dish:\n\n- **Premium** for ₹200 and up\n- **Regular** for ₹100 to ₹199\n- **Budget** for anything under ₹100\n\nThe labels aren't stored anywhere. They are worked out from the price, dish by dish.",
        paper: "products",
        think: {
          question: "Which label does Masala Dosa (₹120) get?",
          answer: "Regular. It isn't ₹200 or more, but it is ₹100 or more.",
        },
      },
      {
        kind: "predict",
        title: "Spot the Premium dishes",
        body: "Start with the first rule.",
        table: "products",
        query: "SELECT * FROM products WHERE price >= 200",
        prompt: "Tap every dish that will be labelled **Premium** (₹200 or more).",
        explain: "Chicken Biryani (₹250) and Fish Curry (₹220) are the only dishes at ₹200 or more.",
      },
      {
        kind: "animate",
        title: "Watch the labels appear",
        body: "Every dish goes through the same rules, from top to bottom, until one fits.",
        query:
          "SELECT name, price, CASE WHEN price >= 200 THEN 'Premium' WHEN price >= 100 THEN 'Regular' ELSE 'Budget' END AS label FROM products",
        narration: {
          "source.show": "Step 1: Here is the menu.",
          "project.pick":
            "Step 2: For each dish, the rules are checked from the top: ₹200 or more? Premium. If not, ₹100 or more? Regular. Otherwise: Budget.",
          "project.result": "Step 3: Every dish keeps its name and price and gets a brand new label column.",
          result: "Every dish now has a label, and no rows were added or removed.",
        },
      },
      {
        kind: "concept",
        title: "Rules, top to bottom",
        body: "This is an **if-this-then-that** column. For each row, the rules are tried in order and the **first one that fits** decides the value.",
        points: [
          { emoji: "⬇️", title: "Top to bottom", text: "The rules are checked in the order you write them." },
          {
            emoji: "🥇",
            title: "First match wins",
            text: "Once a rule fits, the later rules are ignored for that row.",
          },
          { emoji: "🧺", title: "A catch-all", text: "If no rule fits, the last 'otherwise' value is used." },
        ],
        compare: {
          before: { label: "The menu", table: "products" },
          after: {
            label: "With labels",
            query:
              "SELECT name, price, CASE WHEN price >= 200 THEN 'Premium' WHEN price >= 100 THEN 'Regular' ELSE 'Budget' END AS label FROM products",
          },
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: CASE WHEN",
        body: "**CASE** starts the rules, each **WHEN … THEN …** is one rule, **ELSE** is the catch-all and **END** closes it. AS names the new column. Tap each part to see its step.",
        query:
          "SELECT name, price,\n  CASE\n    WHEN price >= 200 THEN 'Premium'\n    WHEN price >= 100 THEN 'Regular'\n    ELSE 'Budget'\n  END AS label\nFROM products",
        explain: {
          select:
            "CASE … END is worked out for every row: the first WHEN that is true gives the value after its THEN. AS label names the new column.",
          from: "FROM products: label every dish on the menu.",
        },
      },
      {
        kind: "concept",
        title: "Order matters",
        body: "Imagine the rules were the other way round: `WHEN price >= 100 THEN 'Regular'` first. Chicken Biryani (₹250) is ₹100 or more, so it would stop at the first rule and be labelled **Regular**. It would never reach the Premium rule.\n\nSo put the strictest rule first.",
        points: [
          { emoji: "✅", title: "Strictest first", text: "`>= 200` before `>= 100`." },
          { emoji: "❔", title: "No ELSE?", text: "Rows that fit no rule get NULL (an empty value)." },
        ],
      },
      {
        kind: "playground",
        title: "Make your own labels",
        body: "Label the menu or the exam marks with your own rules.",
        starter:
          "SELECT student_id, subject, score,\n  CASE WHEN score >= 80 THEN 'Distinction'\n       WHEN score >= 65 THEN 'Pass'\n       ELSE 'Needs help' END AS result\nFROM marks",
        suggestions: [
          "SELECT name, CASE WHEN is_veg THEN 'Veg' ELSE 'Non-veg' END AS diet FROM products",
          "SELECT name, price, CASE WHEN price < 100 THEN 'Budget' ELSE 'Regular' END AS label FROM products ORDER BY price",
          "SELECT CASE WHEN price >= 100 THEN 'Regular or more' ELSE 'Budget' END AS band, COUNT(*) AS dishes FROM products GROUP BY band",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "Which label does Samosa (₹40) get?",
        code: "SELECT name,\n  CASE WHEN price >= 200 THEN 'Premium'\n       WHEN price >= 100 THEN 'Regular'\n       ELSE 'Budget' END AS label\nFROM products",
        table: "products",
        options: ["Budget", "Regular", "Premium", "NULL"],
        answer: 0,
        explain: "40 is not 200 or more, and not 100 or more, so no WHEN fits and the ELSE value is used: Budget.",
      },
      {
        kind: "choice",
        prompt: "A CASE has no ELSE, and no WHEN fits a row. What value does that row get?",
        options: ["NULL (empty)", "0", "The first THEN value", "The query stops with an error"],
        answer: 0,
        explain: "Without an ELSE there is no catch-all, so the row simply gets NULL.",
      },
      {
        kind: "choice",
        prompt: "Why must `WHEN price >= 200` come before `WHEN price >= 100`?",
        options: [
          "The first rule that fits wins, so ₹250 would otherwise be labelled Regular",
          "SQL sorts the WHENs alphabetically",
          "Bigger numbers always have to come first in SQL",
          "It doesn't matter",
        ],
        answer: 0,
        explain:
          "Rules are tried top to bottom. ₹250 also fits `>= 100`, so that rule must come after the Premium one.",
      },
      {
        kind: "order",
        prompt: "Put the pieces in order to label each dish **Veg** or **Non-veg**.",
        tokens: ["SELECT name,", "CASE WHEN is_veg THEN 'Veg'", "ELSE 'Non-veg' END AS diet", "FROM products"],
        distractors: ["WHERE is_veg"],
        explain: "CASE goes in the SELECT list like any other column, so it comes before FROM.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "Grade every mark. Show `student_id`, `subject`, `score` and a column called `grade` that is **'A'** for 85 or more, **'B'** for 70 to 84 and **'C'** for anything below 70.",
      tables: ["marks"],
      starter: "SELECT student_id, subject, score\nFROM marks",
      solution:
        "SELECT student_id, subject, score, CASE WHEN score >= 85 THEN 'A' WHEN score >= 70 THEN 'B' ELSE 'C' END AS grade FROM marks",
      requires: ["CASE", "WHEN"],
      hints: [
        "Add a fourth column to the SELECT list: CASE … END AS grade. Put the strictest rule first.",
        "`CASE WHEN score >= 85 THEN 'A' WHEN score >= 70 THEN 'B' ELSE 'C' END AS grade`",
      ],
    },
    takeaways: [
      "CASE WHEN works out a new value for every row.",
      "Rules are checked top to bottom, and the first one that fits wins.",
      "ELSE catches everything else; without it, unmatched rows get NULL.",
    ],
    cheatsheet: [
      {
        sql: "SELECT name, CASE WHEN price >= 200 THEN 'Premium' ELSE 'Regular' END AS label FROM products",
        meaning: "Label each dish by its price",
      },
    ],
  },
  {
    id: "window-functions",
    summary: "Window functions add a rank or a total to every row without squashing any rows together.",
    minutes: 9,
    tables: [employees],
    steps: [
      {
        kind: "story",
        title: "Ranking without losing anyone",
        emoji: "🏅",
        body: "HR wants a salary list where every employee keeps their own row, but also gets a **rank**: 1 for the highest salary, 2 for the next, and so on.\n\nGrouping can't do this: it would squash people into piles. We need to look at the other rows **without** squashing them.",
        paper: "employees",
        think: {
          question: "Arjun and Kunal both earn ₹82,000. Who should be ranked 2nd?",
          answer:
            "It's fair to give them both 2nd place. Then Fatima comes 4th, because three people earn more than she does.",
        },
      },
      {
        kind: "animate",
        title: "Watch everyone get a rank",
        body: "Count the rows at the start and at the end.",
        query:
          "SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS salary_rank FROM employees ORDER BY salary_rank, name",
        narration: {
          "source.show": "Step 1: Here are all 8 employees.",
          "window.partition": "Step 2: They are lined up from the highest salary to the lowest.",
          "window.compute":
            "Step 3: Each one gets a rank. Arjun and Kunal earn the same, so they share 2nd place, and the next rank is 4th. Nobody is removed.",
          "project.pick": "Step 4: We show each name, salary and rank.",
          "project.result": "The other columns are left out.",
          "sort.keys": "Step 5: Finally the list is put in rank order.",
          "sort.move": "Ties are listed by name.",
          result: "All 8 employees are still here, each with a rank.",
        },
      },
      {
        kind: "concept",
        title: "Not squashed",
        body: "A **window function** looks at a group of other rows, its *window*, to work out a value, but it gives that value back to **every row**. Grouping squashes rows; a window doesn't.",
        points: [
          { emoji: "🧍", title: "Every row stays", text: "8 employees in, 8 rows out." },
          { emoji: "➕", title: "A new column", text: "Each row gets its rank (or a total) next to its own details." },
          { emoji: "🤝", title: "Ties share", text: "Equal salaries get the same rank." },
        ],
        compare: {
          before: { label: "The team", table: "employees" },
          after: {
            label: "Ranked, nobody squashed",
            query:
              "SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS salary_rank FROM employees ORDER BY salary_rank, name",
          },
        },
      },
      {
        kind: "animate",
        title: "A window per department",
        body: "A window can also be split into parts, one per department. Here every employee gets their **team's total salary** next to their own.",
        query:
          "SELECT name, department, salary, SUM(salary) OVER (PARTITION BY department) AS team_total FROM employees ORDER BY department, name",
        narration: {
          "source.show": "Step 1: Here are all 8 employees again.",
          "window.partition": "Step 2: The rows are split into windows, one for each department.",
          "window.compute":
            "Step 3: Each window adds up its salaries, and every row in it gets that total. Still 8 rows!",
          "project.pick": "We show the name, department, salary and team total.",
          "sort.keys": "Then the rows are sorted by department and name.",
        },
      },
      {
        kind: "syntax",
        title: "Now in SQL: OVER",
        body: "The function name comes first, then **OVER** with the window in brackets. OVER is what makes it a window function. Tap each part to see its step.",
        query: "SELECT name, salary,\n  RANK() OVER (ORDER BY salary DESC) AS salary_rank\nFROM employees",
        explain: {
          select:
            "RANK() OVER (ORDER BY salary DESC) lines all the rows up by salary, highest first, and gives each one a rank. AS salary_rank names the new column.",
          from: "FROM employees: rank everyone in the company.",
        },
      },
      {
        kind: "concept",
        title: "Which numbering?",
        body: "There are three ways to number rows, and they only differ when there is a tie.",
        points: [
          { emoji: "🥈", title: "RANK()", text: "Ties share a rank, then a gap: 1, 2, 2, 4." },
          { emoji: "🎖️", title: "DENSE_RANK()", text: "Ties share a rank, no gap: 1, 2, 2, 3." },
          {
            emoji: "🔢",
            title: "ROW_NUMBER()",
            text: "Always 1, 2, 3, 4, never a tie. Add a tie-breaker, like `ORDER BY salary DESC, name`, so the order is fair.",
          },
          {
            emoji: "🧩",
            title: "PARTITION BY",
            text: "Starts the numbering (or the total) again for each group, like each department.",
          },
        ],
      },
      {
        kind: "playground",
        title: "Rank, number and total",
        body: "Compare the three numberings side by side, then try totals and differences.",
        starter:
          "SELECT name, salary,\n  RANK() OVER (ORDER BY salary DESC) AS r,\n  DENSE_RANK() OVER (ORDER BY salary DESC) AS dr,\n  ROW_NUMBER() OVER (ORDER BY salary DESC, name) AS rn\nFROM employees\nORDER BY rn",
        suggestions: [
          "SELECT name, department, salary, MAX(salary) OVER (PARTITION BY department) AS top_salary FROM employees ORDER BY department, name",
          "SELECT name, department, years, SUM(salary) OVER (PARTITION BY department ORDER BY years DESC) AS running_bill FROM employees ORDER BY department, years DESC",
          "SELECT name, salary, salary - LAG(salary) OVER (ORDER BY salary, name) AS gap FROM employees ORDER BY salary, name",
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "With RANK(), two people tie for 2nd place. What rank does the next person get?",
        options: ["4", "3", "2", "1"],
        answer: 0,
        explain:
          "Three people are ahead of them (1st and the two in 2nd), so RANK() gives them 4. DENSE_RANK() would give 3.",
      },
      {
        kind: "choice",
        prompt: "There are 8 employees. How many rows does this return?",
        code: "SELECT name, RANK() OVER (ORDER BY salary DESC) AS salary_rank\nFROM employees",
        table: "employees",
        options: ["8, one per employee", "3, one per department", "1", "It depends on the ties"],
        answer: 0,
        explain: "A window function never squashes rows: every employee keeps their row and gets a rank.",
      },
      {
        kind: "choice",
        prompt: "What's the big difference between a window function and GROUP BY?",
        options: [
          "A window function keeps every row; GROUP BY squashes each group into one row",
          "GROUP BY can only count",
          "Window functions only work on numbers",
          "There is no difference",
        ],
        answer: 0,
        explain:
          "Both look at groups of rows, but only GROUP BY squashes them. A window hands its answer back to every row.",
      },
      {
        kind: "order",
        prompt: "Put the pieces in order to number the employees by **years at the company**, longest first.",
        tokens: ["SELECT name,", "ROW_NUMBER() OVER (ORDER BY years DESC, name) AS seniority", "FROM employees"],
        distractors: ["GROUP BY years"],
        explain:
          "The window function sits in the SELECT list like any other column. No GROUP BY needed: nobody is squashed.",
      },
    ],
    challenge: {
      kind: "sql",
      prompt:
        "Rank everyone **within their own department**, highest salary first. Show `name`, `department`, `salary` and `dept_rank`. The starter ranks the whole company instead: fix it.",
      tables: ["employees"],
      starter: "SELECT name, department, salary,\n  RANK() OVER (ORDER BY salary DESC) AS dept_rank\nFROM employees",
      solution:
        "SELECT name, department, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank FROM employees",
      requires: ["OVER", "PARTITION BY"],
      hints: [
        "The ranking should start again at 1 for each department. Which part of OVER splits the rows into groups?",
        "Use `RANK() OVER (PARTITION BY department ORDER BY salary DESC)`.",
      ],
    },
    takeaways: [
      "A window function adds a value to every row without squashing any rows.",
      "RANK shares ranks on ties and leaves a gap; ROW_NUMBER never ties.",
      "PARTITION BY restarts the window for each group, like each department.",
    ],
    cheatsheet: [
      {
        sql: "SELECT name, RANK() OVER (ORDER BY salary DESC) AS r FROM employees",
        meaning: "Rank everyone by salary",
      },
      {
        sql: "SELECT name, SUM(salary) OVER (PARTITION BY department) AS team_total FROM employees",
        meaning: "Each person's team total next to them",
      },
    ],
  },
];
