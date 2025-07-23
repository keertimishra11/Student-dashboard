const mysql = require("mysql2");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();

// ✅ EJS setup (only once!)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "studentdb",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Failed:", err.sqlMessage);
    return;
  }
  console.log("✅ MySQL Connected!");
});

// ✅ Default route
app.get("/", (req, res) => {
  res.send("Node + MySQL Running...");
});

// ✅ Create students table (run only once if needed)
app.get("/create-table", (req, res) => {
  const sql = `CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50),
      email VARCHAR(50),
      course VARCHAR(50),
      marks INT
    )`;

  db.query(sql, (err) => {
    if (err) {
      console.error("❌ Error creating table:", err.sqlMessage);
      return res.status(500).send("Table creation failed!");
    }
    res.send("✅ students Table created successfully!");
  });
});

// ✅ Dummy data generate (50 random students)
app.get("/generate-students", (req, res) => {
  const names = ["Alice", "Bob", "Charlie", "David", "Emma", "Frank", "Grace", "Hannah", "Ivy", "Jack"];
  const courses = ["Math", "Science", "English", "Computer", "History"];

  let sql = "INSERT INTO students (name, email, course, marks) VALUES ?";
  let values = [];

  for (let i = 0; i < 50; i++) {
    let name = names[Math.floor(Math.random() * names.length)];
    let email = name.toLowerCase() + i + "@gmail.com";
    let course = courses[Math.floor(Math.random() * courses.length)];
    let marks = Math.floor(Math.random() * 50) + 50; // random 50-100
    values.push([name, email, course, marks]);
  }

  db.query(sql, [values], (err) => {
    if (err) {
      console.error("❌ Bulk Insert Error:", err.sqlMessage);
      return res.status(500).send("Failed to generate students!");
    }
    res.send("✅ 50 Random Students Inserted!");
  });
});

// // ✅ Show all students (EJS UI)
// app.get("/students-list", (req, res) => {
//   db.query("SELECT * FROM students", (err, results) => {
//     if (err) {
//       console.error("❌ Fetch Error:", err.sqlMessage);
//       return res.status(500).send("Failed to fetch students!");
//     }
//     res.render("students", { students: results });
//   });
// });


app.get("/students-list", (req, res) => {
  const { search, course, page, sort, order } = req.query;

  let sql = "SELECT * FROM students WHERE 1=1";
  let params = [];

  // Search filter
  if (search && search.trim() !== "") {
    sql += " AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  // Course filter
  if (course && course.trim() !== "") {
    sql += " AND course = ?";
    params.push(course);
  }

  // Sorting Logic
  let validSort = ["name", "course", "marks"];
  let validOrder = order === "desc" ? "DESC" : "ASC";

  if (validSort.includes(sort)) {
    sql += ` ORDER BY ${sort} ${validOrder}`;
  } else {
    sql += " ORDER BY name ASC"; // Default alphabetical by name
  }

  // Pagination
  const limit = 10;
  const currentPage = parseInt(page) || 1;
  const offset = (currentPage - 1) * limit;

  const countQuery = `SELECT COUNT(*) AS total FROM (${sql}) AS totalTable`;

  db.query(countQuery, params, (err, countResult) => {
    if (err) return res.status(500).send("Count query failed!");

    const totalRows = countResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).send("Fetch failed!");


      

      res.render("students", {
        students: results,
        currentPage,
        totalPages,
        search: search || "",
        course: course || "",
        sort: sort || "",
        order: order || "asc",
        msg: req.query.msg || ""  // ✅ ALERT FIX
      });
    });
  });
});




// ✅ Delete student
// ✅ Delete student
app.get("/delete/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM students WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("❌ Delete Error:", err.sqlMessage);
      return res.status(500).send("Delete failed!");
    }
    // ✅ success ke saath redirect
    res.redirect("/students-list?msg=Student+Deleted+Successfully!");
  });
});


// ✅ Show Edit Form
app.get("/edit/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM students WHERE id = ?", [id], (err, result) => {
    if (err) throw err;
    res.render("edit", { student: result[0] });
  });
});

// ✅ Update student after edit form submit
app.post("/update/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, course, marks } = req.body;

  db.query(
    "UPDATE students SET name=?, email=?, course=?, marks=? WHERE id=?",
    [name, email, course, marks, id],
    (err) => {
      if (err) throw err;
     res.redirect("/students-list?msg=Student+Updated+Successfully!");

    }
  );
});

// ✅ Server start
app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});


// Middleware for form data
app.use(express.urlencoded({ extended: true }));

// Show Add Student Form
app.get("/add-student-form", (req, res) => {
  res.render("add");
});

// Handle Add Student Form Submit
// ✅ Handle Add Student UI form submit
app.post("/add-student-ui", (req, res) => {
  const { name, email, course, marks } = req.body;

  const sql = "INSERT INTO students (name, email, course, marks) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, email, course, marks], (err) => {
    if (err) {
      console.error("❌ Insert Error:", err.sqlMessage);
      return res.status(500).send("Failed to add student!");
    }
    // ✅ success ke saath redirect karte hue message bhejna
    res.redirect("/students-list?msg=Student+Added+Successfully!");
  });
});


