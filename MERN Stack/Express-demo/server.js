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


//custom middleware
const requestlogger=(req,res,next)=>
{
   console.log("Requset Method:",req.method);
   console.log("Requset URL:",req.url);
    console.log("Requset Time:",new Date().toLocaleString());

    next();
};
app.use(requestlogger);

// Student API routes
app.use("/api/students", studentRoutes);

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to Student API");
});

//EJS route
app.get("/welcome",(req,res)=>
{
    res.render("welcome",
        {
            name:"Yoonus",
            course:"WE"
        }
    );
});

//student info EJS
app.get("/student-info",(req,res)=>
{
    res.render("student-info",
        {
            name:"Yasir",
            age:15,
            course:"MERN Stack"
        }
    );
});

// Error Handling Middleware
app.use(errorhandler);

// Start Server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});