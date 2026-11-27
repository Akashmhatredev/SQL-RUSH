import type { LessonTable } from "./types";

/**
 * Shared sample data. Lessons reuse these so a learner keeps meeting the same students,
 * dishes and customers, and add their own small tables when a concept needs one.
 * Keep every table small enough to see at once (≤ 12 rows).
 */

/** The four-student register from the very first lessons. */
export const register: LessonTable = {
  name: "students",
  description: "A school's student register",
  entity: "student",
  labelColumn: "name",
  columns: [
    { name: "student_id", type: "int", pk: true, description: "A number that is unique to each student" },
    { name: "name", type: "text", description: "The student's first name" },
    { name: "age", type: "int", description: "Age in years" },
    { name: "city", type: "text", description: "Home city" },
  ],
  rows: [
    [101, "Rahul", 20, "Pune"],
    [102, "Priya", 22, "Mumbai"],
    [103, "Amit", 19, "Bangalore"],
    [104, "Sneha", 21, "Pune"],
  ],
};

/** The whole class: the register plus younger students, so filters have something to filter. */
export const classList: LessonTable = {
  ...register,
  description: "Every student in the class",
  rows: [
    [101, "Rahul", 20, "Pune"],
    [102, "Priya", 22, "Mumbai"],
    [103, "Amit", 19, "Bangalore"],
    [104, "Sneha", 21, "Pune"],
    [105, "Kabir", 17, "Delhi"],
    [106, "Ananya", 18, "Mumbai"],
    [107, "Rohan", 16, "Pune"],
    [108, "Meera", 23, "Chennai"],
  ],
};

/** A small restaurant's menu. */
export const menu: LessonTable = {
  name: "products",
  description: "Everything on the restaurant's menu",
  entity: "dish",
  labelColumn: "name",
  columns: [
    { name: "product_id", type: "int", pk: true, description: "A unique number for each dish" },
    { name: "name", type: "text", description: "The dish's name" },
    { name: "category", type: "text", description: "Main, Snack, Drink or Dessert" },
    { name: "price", type: "int", description: "Price in rupees" },
    { name: "is_veg", type: "bool", description: "true when the dish is vegetarian" },
  ],
  rows: [
    [1, "Masala Dosa", "Main", 120, true],
    [2, "Paneer Tikka", "Snack", 180, true],
    [3, "Chicken Biryani", "Main", 250, false],
    [4, "Samosa", "Snack", 40, true],
    [5, "Mango Lassi", "Drink", 90, true],
    [6, "Masala Chai", "Drink", 30, true],
    [7, "Gulab Jamun", "Dessert", 60, true],
    [8, "Fish Curry", "Main", 220, false],
    [9, "Pav Bhaji", "Main", 140, true],
    [10, "Cold Coffee", "Drink", 110, true],
  ],
};

/** Customers of an online bookshop. */
export const customers: LessonTable = {
  name: "customers",
  description: "People who have an account at the bookshop",
  entity: "customer",
  labelColumn: "name",
  columns: [
    { name: "customer_id", type: "int", pk: true, description: "A unique number for each customer" },
    { name: "name", type: "text", description: "The customer's name" },
    { name: "city", type: "text", description: "Where they live" },
  ],
  rows: [
    [1, "Aarav", "Pune"],
    [2, "Diya", "Mumbai"],
    [3, "Ishaan", "Delhi"],
    [4, "Kiara", "Pune"],
    [5, "Vihaan", "Chennai"],
  ],
};

/** Orders placed at the bookshop. customer_id points at customers.customer_id. */
export const orders: LessonTable = {
  name: "orders",
  description: "Every order placed at the bookshop",
  entity: "order",
  labelColumn: "order_id",
  columns: [
    { name: "order_id", type: "int", pk: true, description: "A unique number for each order" },
    {
      name: "customer_id",
      type: "int",
      ref: { table: "customers", column: "customer_id" },
      description: "Who placed the order (a customer_id from customers)",
    },
    { name: "book", type: "text", description: "The book that was ordered" },
    { name: "amount", type: "int", description: "What the order cost, in rupees" },
    { name: "order_date", type: "date", description: "When the order was placed" },
  ],
  rows: [
    [1001, 1, "The Hobbit", 350, "2024-03-02"],
    [1002, 2, "Wings of Fire", 250, "2024-03-03"],
    [1003, 1, "Malgudi Days", 200, "2024-03-05"],
    [1004, 4, "The Alchemist", 300, "2024-03-08"],
    [1005, 2, "Matilda", 280, "2024-03-09"],
    [1006, 1, "Wings of Fire", 250, "2024-03-12"],
    [1007, 4, "Panchatantra", 150, "2024-03-15"],
  ],
};

/** Exam marks: one row per student per subject. student_id points at students.student_id. */
export const marks: LessonTable = {
  name: "marks",
  description: "Exam marks, one row per student per subject",
  entity: "mark",
  columns: [
    { name: "mark_id", type: "int", pk: true, description: "A unique number for each mark" },
    {
      name: "student_id",
      type: "int",
      ref: { table: "students", column: "student_id" },
      description: "Whose mark it is",
    },
    { name: "subject", type: "text", description: "Maths, Science or English" },
    { name: "score", type: "int", description: "Out of 100" },
  ],
  rows: [
    [1, 101, "Maths", 78],
    [2, 101, "Science", 85],
    [3, 102, "Maths", 92],
    [4, 102, "Science", 88],
    [5, 102, "English", 75],
    [6, 103, "Maths", 64],
    [7, 103, "English", 81],
    [8, 104, "Science", 95],
    [9, 104, "English", 70],
    [10, 104, "Maths", 89],
  ],
};

/** School lockers. Some students have none and some lockers are empty. */
export const lockers: LessonTable = {
  name: "lockers",
  description: "The school's lockers and who uses them",
  entity: "locker",
  labelColumn: "locker_no",
  columns: [
    { name: "locker_no", type: "text", pk: true, description: "The number painted on the locker" },
    {
      name: "student_id",
      type: "int",
      ref: { table: "students", column: "student_id" },
      description: "The student using it (empty if nobody is)",
    },
    { name: "floor", type: "int", description: "Which floor it's on" },
  ],
  rows: [
    ["L1", 101, 1],
    ["L2", 103, 1],
    ["L3", null, 2],
    ["L4", 104, 2],
    ["L5", null, 3],
  ],
};

/** Staff of a small company, for ranking and labelling. */
export const employees: LessonTable = {
  name: "employees",
  description: "Everyone who works at a small tech company",
  entity: "employee",
  labelColumn: "name",
  columns: [
    { name: "employee_id", type: "int", pk: true, description: "A unique number for each employee" },
    { name: "name", type: "text", description: "First name" },
    { name: "department", type: "text", description: "Engineering, Sales or Support" },
    { name: "salary", type: "int", description: "Monthly salary in rupees" },
    { name: "years", type: "int", description: "Years at the company" },
  ],
  rows: [
    [1, "Neha", "Engineering", 95000, 6],
    [2, "Arjun", "Engineering", 82000, 3],
    [3, "Zara", "Sales", 60000, 4],
    [4, "Kunal", "Engineering", 82000, 2],
    [5, "Fatima", "Sales", 72000, 7],
    [6, "Dev", "Support", 45000, 1],
    [7, "Ira", "Support", 52000, 5],
    [8, "Om", "Sales", 58000, 2],
  ],
};
