import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.send("Hello World");
});



app.get("/contact", (req, res) => {
    res.send("contact us at marstech@gmail.com");
});

app.get("/students/:id/courses/:course", (req, res) => {
    res.json({
        studentId: req.params.id,
        courseName: req.params.course
    });
});

app.get("/search",(req,res)=>
{
  res.json({
    search:req.query.asd,
    barnd:req.query.brand
});
});

let students = [
    { id: 1, name: "Ahamed", age: 20, course: "IT" },
    { id: 2, name: "Nufla", age: 21, course: "SE" }
];

// GET - Retrieve all students
app.get("/students-demo", (req, res) => {
    res.status(200).json(students);
});

// GET - Retrieve one student
app.get("/students-demo/:id", (req, res) => {
    const id = Number(req.params.id);

    const student = students.find((s) => s.id === id);

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    res.status(200).json(student);
});

// POST - Add a student
app.post("/students-demo", (req, res) => {
    const newStudent = req.body;

    students.push(newStudent);

    res.status(201).json({
        message: "Student added",
        student: newStudent
    });
});

// PUT - Replace a student's full details
app.put("/students-demo/:id", (req, res) => {
    const id = Number(req.params.id);

    const index = students.findIndex((s) => s.id === id);

    if (index === -1) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    students[index] = {
        id,
        ...req.body
    };

    res.status(200).json({
        message: "Student replaced",
        student: students[index]
    });
});

// PATCH - Update selected student details
app.patch("/students-demo/:id", (req, res) => {
    const id = Number(req.params.id);

    const student = students.find((s) => s.id === id);

    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    Object.assign(student, req.body);

    res.status(200).json({
        message: "Student updated",
        student
    });
});

// DELETE - Remove a student
app.delete("/students-demo/:id", (req, res) => {
    const id = Number(req.params.id);

    const index = students.findIndex((s) => s.id === id);

    if (index === -1) {
        return res.status(404).json({
            message: "Student not found"
        });
    }

    students.splice(index, 1);

    res.status(200).json({
        message: "Student deleted successfully"
    });
});

app.listen(3000, () => {
    console.log("server running");
});