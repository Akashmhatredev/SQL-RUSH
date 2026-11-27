import { lockers, marks, register } from "../datasets";
import type { Lesson, LessonTable } from "../types";

/** The school cricket match, written up tidily. */
const scorecard: LessonTable = {
  name: "scorecard",
  description: "The batting scorecard from the school cricket match",
  entity: "batter",
  labelColumn: "player",
  columns: [
    { name: "player", type: "text", description: "Who batted" },
    { name: "runs", type: "int", description: "Runs scored" },
    { name: "balls", type: "int", description: "Balls faced" },
    { name: "sixes", type: "int", description: "Sixes hit" },
  ],
  rows: [
    ["Rahul", 34, 28, 1],
    ["Kabir", 42, 30, 3],
    ["Amit", 8, 12, 0],
    ["Rohan", 25, 20, 2],
    ["Priya", 51, 35, 4],
  ],
};

/** The register after a second Amit joins: names stop being enough to tell students apart. */
const twoAmits: LessonTable = {
  ...register,
  description: "The student register, now with two students called Amit",
  rows: [
    [101, "Rahul", 20, "Pune"],
    [102, "Priya", 22, "Mumbai"],
    [103, "Amit", 19, "Bangalore"],
    [104, "Sneha", 21, "Pune"],
    [105, "Amit", 18, "Delhi"],
    [106, "Kavya", 18, "Delhi"],
  ],
};

/** Module 1 · Database Explorer: no SQL yet, only data, databases and tables. */
export const databaseExplorer: Lesson[] = [
  {
    id: "what-is-data",
    summary: "Data is facts we write down: scores, prices, phone numbers. Tidy data is data you can use.",
    minutes: 5,
    tables: [scorecard],
    steps: [
      {
        kind: "story",
        title: "Data is all around you",
        emoji: "📱",
        body: "You use data every day, even if you never call it that. **Data** is simply facts that someone wrote down so they can be used later.\n\nHere are a few places you meet it:",
        cards: [
          { emoji: "📇", label: "Phone contacts", text: "A name and a number for each person" },
          { emoji: "🚆", label: "Train ticket", text: "Train number, coach, seat and date" },
          { emoji: "🏏", label: "Cricket score", text: "Runs and balls for every batter" },
          { emoji: "🧾", label: "Shopping bill", text: "Each item and its price" },
        ],
        think: {
          question: "What data have you looked at today?",
          answer:
            "Maybe the time on your phone, a message from a friend, a price in a shop or the weather. Each of those is a fact that was recorded so you could use it.",
        },
      },
      {
        kind: "story",
        title: "The scorer's notebook",
        emoji: "📝",
        body: "At the school cricket match, the scorer scribbled the batting like this:\n\n- Rahul made 34 (28 balls), one six\n- kabir: 42 runs!! 3 sixes, 30 balls\n- Amit out for 8 off 12\n- Rohan 25 runs, 2 sixes, in 20 balls\n- Priya: fifty-one, faced 35, hit four sixes\n\nAll the facts are there. But they are written a different way on every line.",
        think: {
          question: "Quick: who hit the most sixes?",
          answer:
            "Priya, with four. But you had to read every line carefully, because some numbers are digits, some are words, and they are in a different order each time.",
        },
      },
      {
        kind: "concept",
        title: "Data is facts, written down",
        body: "Each little fact in the notebook, like *Kabir scored 42 runs*, is a piece of **data**. Data is only useful when you can find and compare it easily, so we write it down tidily.",
        points: [
          { emoji: "🔢", title: "A fact", text: "One value, like 42 runs or seat 17." },
          { emoji: "🙋", title: "About something", text: "Every fact is about something: a player, a dish, a train." },
          {
            emoji: "📐",
            title: "Written the same way",
            text: "Tidy data writes the same kind of fact in the same place, every time.",
          },
        ],
      },
      {
        kind: "explore",
        title: "The same notes, tidied up",
        body: "Here is the scorer's notebook again, but every fact now has its own place. Tap around and see how easy it is to read.",
        table: "scorecard",
        tasks: [
          { type: "click-row", prompt: "Tap Kabir's row", match: { column: "player", value: "Kabir" } },
          { type: "click-column", prompt: "Tap the sixes column header", column: "sixes" },
          { type: "hover-cell", prompt: "Point at (or tap) any single number" },
        ],
      },
      {
        kind: "concept",
        title: "Why tidy data matters",
        body: "In the tidy version, *who hit the most sixes?* takes a second: look down one column. That is exactly what databases are built for.",
        points: [
          { emoji: "⚡", title: "Quick to answer", text: "Questions become *look down this column*." },
          {
            emoji: "🤖",
            title: "Computers can read it",
            text: "A computer can sort, count and search tidy data instantly.",
          },
          { emoji: "✅", title: "No guessing", text: "42 is always written as 42, never as *forty-two*." },
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "Which of these is a piece of **data**?",
        options: ["Seat 17 on train 12127", "Have a lovely trip!", "Hurry up!"],
        answer: 0,
        explain:
          "Data is a fact that is written down so it can be used: a seat number, a price, a score. Greetings and wishes are not facts.",
      },
      {
        kind: "pick-column",
        prompt: "In the tidy scorecard, tap the column that tells you how many **runs** each player scored.",
        table: "scorecard",
        column: "runs",
        explain: "The runs column holds the same kind of fact, runs scored, for every player.",
      },
      {
        kind: "choice",
        prompt: "Why is the tidy scorecard easier to use than the notebook?",
        options: [
          "Every fact is written the same way, in its own place",
          "It uses bigger letters",
          "It leaves some players out",
        ],
        answer: 0,
        explain:
          "Nothing was added or removed. Each fact just got its own place, so you can find and compare it at a glance.",
      },
    ],
    challenge: {
      kind: "task",
      view: "table",
      table: "scorecard",
      prompt: "The coach asks: how many **sixes** did **Rohan** hit? Tap the exact value that answers the question.",
      goal: { type: "pick-cell", row: { column: "player", value: "Rohan" }, column: "sixes" },
      hints: ["First find Rohan's row, then look along it.", "Stop where Rohan's row meets the sixes column."],
    },
    takeaways: [
      "Data is facts written down so they can be used later.",
      "Every piece of data is about something: a player, a dish, a student.",
      "Tidy data writes the same kind of fact in the same place, so it is quick to read.",
    ],
  },
  {
    id: "what-is-a-database",
    summary: "A database is an organised collection of tables that belong together, like a school's files.",
    minutes: 6,
    tables: [register, marks, lockers],
    steps: [
      {
        kind: "story",
        title: "The school office",
        emoji: "🗄️",
        body: "The school office keeps more than one list. There is the **student register**, a sheet of **exam marks**, and a list of who uses which **locker**.\n\nEach list lives in its own folder, and all the folders sit together in one cabinet.",
        think: {
          question: "Why not write everything on one giant sheet?",
          answer:
            "It would get messy fast. Each student has several marks, and some lockers are empty. Separate tidy lists, kept together, are much easier to manage.",
        },
      },
      {
        kind: "concept",
        title: "A database is a collection of tables",
        body: "A **database** is like that cabinet: one place that keeps several related tables together. Each table stores one kind of thing.",
        points: [
          { emoji: "🗄️", title: "One place", text: "The school database keeps all the school's tables together." },
          {
            emoji: "📋",
            title: "One table per kind of thing",
            text: "Students in one table, marks in another, lockers in a third.",
          },
          {
            emoji: "🔗",
            title: "Linked together",
            text: "Tables point at each other using ID numbers, like `student_id`.",
          },
        ],
      },
      {
        kind: "database",
        title: "Inside the school database",
        body: "Here is the school database with its three tables. Open each one, and look for the lines that link them.",
        tables: ["students", "marks", "lockers"],
        tasks: [
          { type: "open-table", prompt: "Open the students table", table: "students" },
          { type: "open-table", prompt: "Open the marks table", table: "marks" },
          { type: "find-link", prompt: "Find a link between two tables" },
        ],
      },
      {
        kind: "explore",
        title: "How a mark knows whose it is",
        body: "The marks table doesn't repeat each student's name, age and city. It just stores their `student_id`. Student 102 is Priya, so every row with 102 is one of Priya's marks.",
        table: "marks",
        tasks: [
          { type: "click-row", prompt: "Tap the mark with mark_id 3", match: { column: "mark_id", value: 3 } },
          { type: "click-column", prompt: "Tap the student_id column header", column: "student_id" },
        ],
      },
      {
        kind: "concept",
        title: "Who looks after the database?",
        body: "A database is looked after by a program called a **database system**. SQL Rush uses one called PostgreSQL. Banks, shops, hospitals and apps all rely on systems like it.",
        points: [
          { emoji: "🔒", title: "Keeps data safe", text: "Nothing gets lost when the power goes off." },
          { emoji: "👥", title: "Shared", text: "Many people can use the same database at the same time." },
          { emoji: "💬", title: "Answers questions", text: "You ask it for data and it finds it for you, quickly." },
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "What is a **database**?",
        options: [
          "An organised collection of related tables",
          "One very big table",
          "A single value in a table",
          "A kind of spreadsheet formula",
        ],
        answer: 0,
        explain: "A database keeps several tables that belong together, like the school's students, marks and lockers.",
      },
      {
        kind: "pick-column",
        prompt: "In the marks table, tap the column that **links** each mark to a student.",
        table: "marks",
        column: "student_id",
        explain: "student_id holds a number from the students table, so each mark points at exactly one student.",
      },
      {
        kind: "choice",
        prompt: "Why does the marks table store `student_id` instead of the student's name, age and city?",
        options: [
          "Those details already live in the students table, so the ID is enough",
          "Marks are not allowed to have names",
          "IDs look nicer than names",
        ],
        answer: 0,
        explain: "Each detail is stored once, in its own table. Other tables just point at it with the ID.",
      },
    ],
    challenge: {
      kind: "task",
      view: "database",
      tables: ["students", "marks", "lockers"],
      prompt: "The caretaker wants to know **which locker** Sneha uses. Which table should they open? Tap it.",
      goal: { type: "pick-table", table: "lockers" },
      hints: [
        "Each table stores one kind of thing. Which one is about lockers?",
        "The lockers table lists each locker and the student_id of whoever uses it.",
      ],
    },
    takeaways: [
      "A database is an organised collection of tables that belong together.",
      "Each table stores one kind of thing.",
      "Tables link to each other using ID numbers.",
    ],
  },
  {
    id: "what-is-a-table",
    summary: "A table is a grid that stores one kind of thing: one row per thing, one column per detail.",
    minutes: 5,
    tables: [register],
    steps: [
      {
        kind: "story",
        title: "The school register",
        emoji: "🏫",
        body: "Every school keeps a **register**: a list of its students, with the same few details written down for each one.\n\nHere is a small one. Have a look at how it is laid out.",
        paper: "students",
        think: {
          question: "A new student joins. What would the school office write down?",
          answer:
            "A new line with their ID, name, age and city: exactly the same four details as everyone else already has.",
        },
      },
      {
        kind: "concept",
        title: "A register is a table",
        body: "Databases keep information exactly like this register, in **tables**. A table is a grid with a name, and it always stores one kind of thing: here, students.",
        points: [
          { emoji: "🏷️", title: "It has a name", text: "This table is called `students`." },
          {
            emoji: "➡️",
            title: "Each row is one student",
            text: "Reading across a row gives you everything about one person.",
          },
          {
            emoji: "⬇️",
            title: "Each column is one detail",
            text: "Reading down a column gives you the same detail (like age) for everyone.",
          },
        ],
      },
      {
        kind: "explore",
        title: "Explore the table",
        body: "Tap around the table. Every time you do, the explainer below tells you what you are looking at.",
        table: "students",
        tasks: [
          { type: "click-row", prompt: "Tap Priya's row", match: { column: "name", value: "Priya" } },
          { type: "click-column", prompt: "Tap the age column header", column: "age" },
          { type: "hover-cell", prompt: "Point at (or tap) any single value" },
        ],
      },
      {
        kind: "explore",
        title: "Tables change over time",
        body: "Students join and leave, and details change. Try it on this sample table: add a student, fix a value, remove someone. **Reset** puts everything back.",
        table: "students",
        editable: true,
        tasks: [
          { type: "add-row", prompt: "Add a new student" },
          { type: "edit-cell", prompt: "Change any value" },
          { type: "delete-row", prompt: "Remove a student" },
          { type: "reset", prompt: "Reset the table" },
        ],
      },
      {
        kind: "concept",
        title: "Why everything goes in tables",
        body: "Because every row has the same columns, a computer can quickly answer questions like *who lives in Pune?* or *who is the oldest?* It just looks down one column.",
        points: [
          { emoji: "🧱", title: "Same shape", text: "Every row has a value for every column, in the same order." },
          { emoji: "🔍", title: "Easy to search", text: "To find all students from Pune, look down the city column." },
          { emoji: "➕", title: "Easy to grow", text: "A new student is just one more row." },
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "In the `students` table, what does **one row** hold?",
        table: "students",
        options: [
          "Everything about one student",
          "One detail about every student",
          "The name of the table",
          "A list of all the cities",
        ],
        answer: 0,
        explain: "A row goes across the table: one student's ID, name, age and city together.",
      },
      {
        kind: "pick-column",
        prompt: "Tap the column that holds every student's **home city**.",
        table: "students",
        column: "city",
        explain: "A column goes down the table and holds one kind of detail for every row: here, the city.",
      },
      {
        kind: "choice",
        prompt: "Kavya joins the school. What happens to the `students` table?",
        options: [
          "It gets one new row",
          "It gets one new column",
          "A new table is made just for her",
          "Nothing changes",
        ],
        answer: 0,
        explain:
          "A new student is one more row. The columns stay the same, because she has the same details as everyone else.",
      },
    ],
    challenge: {
      kind: "task",
      view: "table",
      table: "students",
      prompt:
        "Kavya just joined! Add her to the register: student ID **105**, name **Kavya**, age **18**, city **Delhi**.",
      goal: { type: "add-row", values: { student_id: 105, name: "Kavya", age: 18, city: "Delhi" } },
      hints: [
        "Use the **Add row** button under the table.",
        "Fill in all four details, then save the row. Spelling and capital letters count: Kavya, Delhi.",
      ],
    },
    takeaways: [
      "A table stores one kind of thing, like students.",
      "Each row is one complete record: everything about one student.",
      "Each column is one kind of detail, the same for every row.",
      "Adding a student adds a row; the columns stay the same.",
    ],
  },
  {
    id: "rows-and-columns",
    summary: "Rows go across and hold one record; columns go down and hold one kind of detail.",
    minutes: 5,
    tables: [register],
    steps: [
      {
        kind: "story",
        title: "Be a table detective",
        emoji: "🔍",
        body: "The principal has two questions:\n\n- *Which city is Sneha from?*\n- *How old is everyone?*\n\nBoth answers are in the register. But you read the table in a different direction for each one.",
        paper: "students",
        think: {
          question: "To find Sneha's city, do you read across the table or down it?",
          answer:
            "Across: find Sneha's row, then move along it until you reach the city column. For everyone's age, you read down the age column instead.",
        },
      },
      {
        kind: "concept",
        title: "Rows go across, columns go down",
        body: "Every table is made of the same few parts. Knowing their names makes everything else easier.",
        points: [
          { emoji: "➡️", title: "A row", text: "Goes across. It holds everything about one student." },
          {
            emoji: "⬇️",
            title: "A column",
            text: "Goes down. It holds one kind of detail, named in the header at the top.",
          },
          { emoji: "🔲", title: "A cell", text: "One single value, where a row meets a column." },
          { emoji: "📋", title: "The table", text: "All the rows and columns together." },
        ],
      },
      {
        kind: "explore",
        title: "Find the parts",
        body: "Tap around the register. Each time, the explainer tells you which part you picked and what it holds.",
        table: "students",
        tasks: [
          { type: "click-row", prompt: "Tap Amit's row", match: { column: "name", value: "Amit" } },
          { type: "click-column", prompt: "Tap the city column header", column: "city" },
          {
            type: "hover-cell",
            prompt: "Point at (or tap) Priya's age",
            match: { column: "age", row: { column: "name", value: "Priya" } },
          },
        ],
      },
      {
        kind: "explore",
        title: "Several rows at once",
        body: "Detectives often look at a few records side by side. Select more than one row, then look down a column to compare them.",
        table: "students",
        tasks: [
          { type: "select-rows", prompt: "Select two rows at once", count: 2 },
          { type: "click-column", prompt: "Tap the name column header", column: "name" },
        ],
      },
      {
        kind: "concept",
        title: "Other names you will hear",
        body: "People who work with databases use a few more words for the same parts. They mean exactly what you just explored.",
        points: [
          { emoji: "🗂️", title: "Record", text: "Another word for a row: one complete set of details." },
          { emoji: "🏷️", title: "Field", text: "Another word for a column: one named kind of detail." },
          { emoji: "🔢", title: "Value", text: "What sits in a cell, like 21 or Pune." },
        ],
      },
    ],
    check: [
      {
        kind: "pick-rows",
        prompt: "Tap the rows of the students who live in **Pune**.",
        table: "students",
        query: "SELECT * FROM students WHERE city = 'Pune'",
        explain: "Rahul and Sneha both have Pune in their city column, so their rows are the ones you want.",
      },
      {
        kind: "choice",
        prompt: "How many **rows** of students does the register have?",
        table: "students",
        options: ["4", "5", "16"],
        answer: 0,
        explain: "There are 4 students, so 4 rows. The header at the top just names the columns; it isn't a record.",
      },
      {
        kind: "choice",
        prompt: "What is a **cell**?",
        options: ["One value, where a row meets a column", "A whole row", "A whole column", "The name of the table"],
        answer: 0,
        explain: "A cell is the smallest part of a table: one value, like Sneha's age, 21.",
      },
    ],
    challenge: {
      kind: "task",
      view: "table",
      table: "students",
      prompt:
        "Answer the principal's first question: which city is **Sneha** from? Tap the exact cell that answers it.",
      goal: { type: "pick-cell", row: { column: "name", value: "Sneha" }, column: "city" },
      hints: ["Find Sneha's row first, then read across it.", "Stop where Sneha's row meets the city column."],
    },
    takeaways: [
      "A row goes across and holds one complete record.",
      "A column goes down and holds one kind of detail, named in the header.",
      "A cell is one value, where a row and a column meet.",
    ],
  },
  {
    id: "primary-keys",
    summary: "A primary key is a column whose value is different in every row, so it points at exactly one row.",
    minutes: 6,
    tables: [twoAmits],
    steps: [
      {
        kind: "story",
        title: "Two students called Amit",
        emoji: "👯",
        body: "A new student has joined, and his name is also **Amit**. The office makes an announcement: *Amit, please come to the office.*\n\nTwo boys stand up. Which one did they mean?",
        paper: "students",
        think: {
          question: "How could the office always tell the two Amits apart, for sure?",
          answer:
            "Give every student their own number that nobody else has, and never reuse it. The register already does this: the student ID.",
        },
      },
      {
        kind: "explore",
        title: "Spot the problem",
        body: "Look at the register. Find both Amits, then look for a column that is different for every single student.",
        table: "students",
        tasks: [
          { type: "click-row", prompt: "Tap the Amit from Bangalore", match: { column: "student_id", value: 103 } },
          { type: "click-row", prompt: "Now tap the other Amit", match: { column: "student_id", value: 105 } },
          { type: "click-column", prompt: "Tap the student_id column header", column: "student_id" },
        ],
      },
      {
        kind: "concept",
        title: "Meet the primary key",
        body: "A **primary key** is a column whose value is different in every row, so it always points at exactly one row. In `students`, the primary key is `student_id`. It's marked with a 🔑.",
        points: [
          { emoji: "☝️", title: "Unique", text: "No two rows can ever share the same value." },
          { emoji: "🚫", title: "Never empty", text: "Every row must have one." },
          { emoji: "📌", title: "Stays the same", text: "Amit 103 is still 103 even if he moves to another city." },
        ],
      },
      {
        kind: "explore",
        title: "Could another column be the key?",
        body: "Test each column: is its value different for every student? If two rows share a value, that column can't be the key.",
        table: "students",
        tasks: [
          { type: "click-column", prompt: "Check the name column (two Amits!)", column: "name" },
          { type: "click-column", prompt: "Check the city column", column: "city" },
          { type: "click-column", prompt: "Check the age column", column: "age" },
        ],
      },
      {
        kind: "concept",
        title: "Primary keys are everywhere",
        body: "Whenever things must never be mixed up, someone gives them a unique number. You already know many primary keys.",
        points: [
          { emoji: "🚆", title: "PNR number", text: "Points at exactly one train booking." },
          { emoji: "🧾", title: "Order number", text: "Points at exactly one online order." },
          { emoji: "🚗", title: "Number plate", text: "Points at exactly one vehicle." },
          { emoji: "🎒", title: "Roll number", text: "Points at exactly one student in a class." },
        ],
      },
    ],
    check: [
      {
        kind: "choice",
        prompt: "Why can't `name` be the primary key of `students`?",
        options: ["Two students can have the same name", "Names are too long", "Names are written in letters"],
        answer: 0,
        explain:
          "A primary key must be different in every row. There are two Amits, so a name can point at more than one student.",
      },
      {
        kind: "choice",
        prompt: "Which would make a good primary key for **train bookings**?",
        options: ["The PNR number", "The passenger's name", "The travel date", "The coach type"],
        answer: 0,
        explain: "Every booking gets its own PNR number. Names, dates and coach types are shared by many bookings.",
      },
      {
        kind: "choice",
        prompt: "Another student joins. Which `student_id` can they be given?",
        table: "students",
        options: ["107", "103", "No ID: it can stay empty"],
        answer: 0,
        explain: "103 already belongs to Amit, and a primary key can never be empty. 107 is unused, so it's fine.",
      },
    ],
    challenge: {
      kind: "task",
      view: "table",
      table: "students",
      prompt:
        "The office needs one column that points at **exactly one student**, every time, even with two Amits. Tap that column.",
      goal: { type: "pick-column", column: "student_id" },
      hints: [
        "Look for the column where no two rows share a value.",
        "Names repeat and so do cities and ages. Which column has a different number in every row?",
      ],
    },
    takeaways: [
      "A primary key is a column whose value is different in every row.",
      "It is never empty, so every row can be found by it.",
      "Names make poor keys, because people can share a name.",
    ],
  },
];
