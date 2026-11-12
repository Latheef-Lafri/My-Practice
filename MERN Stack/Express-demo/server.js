import express from "express";
import morgan from"morgan";
import errorhandler from "./middleware/errormiddleware.js";

import studentRoutes from "./Routes/studentroutes.js";

const app = express();

// EJS Configuration
app.set("view engine","ejs");


// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static("public"));


//custom middleware
const requestlogger=(req,res,next)=>
{
   console.log("Requset Method:",req.method);
   console.log("Requset URL:",req.url);
    console.log("Requset Time:",new Date().toLocaleString());

    next();
};
app.use(requestlogger);

// Existing Student API
app.use("/api/students", studentRoutes);

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to Student API");
});

//welcome EJS route
app.get("/welcome",(req,res)=>
{
    res.render("welcome",
        {
            title:"Welcome",
            name:"Yoonus",
            course:"WE"
        }
    );
});

//student page EJS
app.get("/student-page",(req,res)=>
{
    const students=[
        {id:1,name:"Yasir",age:20,course:"SE"},
        {id:2,name:"Naflan",age:22,course:"IT"},
        {id:3,name:"Shakib",age:17,course:"IT"}
    ];
    res.render("student",{title:"Student Page",students:students});
});

//student info EJS
app.get("/student-info",(req,res)=>
{
    res.render("student-info",
        {
            title:"Student Information",
            name:"Yasir",
            age:15,
            course:"MERN Stack"
        }
    );
});

//About page
app.get("/about",(req,res)=>
{
    res.render("about",{
        title:"About us"
    });
}
);

// Error Handling Middleware
app.use(errorhandler);

// Start Server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});