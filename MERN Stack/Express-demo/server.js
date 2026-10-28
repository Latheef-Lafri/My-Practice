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


app.listen(3000, () => {
    console.log("server running");
});