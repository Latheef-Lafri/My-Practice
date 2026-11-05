import express from "express";
import morgan from"morgan";

import studentRoutes from "./Routes/studentroutes.js";

const app = express();

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

app.listen(3000, () => {
    console.log("Server running on port 3000");
});