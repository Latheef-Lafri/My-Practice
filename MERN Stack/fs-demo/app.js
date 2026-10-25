 
 // file write
 /*const fs=require("fs");
 fs.writeFileSync("student.text","name:ahmed");
 console.log("file created Successfully")
*/


//file Read
/*const fs=require("fs");
const data=fs.readFileSync("student.text","utf8");
console.log(data);
*/

//append data
/*const fs=require("fs");
fs.appendFileSync("student.text"," Course:MERN Stack");
console.log("Data Added Successfully");
*/

//Delete file
/*const fs=require("fs");
fs.unlinkSync("student.text");
*/


//synchronus file operation
/*const fs=require("fs");
const data=fs.readFileSync("student.text","utf8");

console.log(data);
console.log("Next Operetion");
*/

//Asynchronous
/*const fs=require("fs");
fs.readFile("student.text","utf8",(err,data) =>
{
    if (err)
    {
        console.log("error reading file");
        return;
    }

    console.log(data);
});

console.log("Next Operation");
*/

const fs = require("fs");
const path = require("path");

const filepath = path.join(__dirname, "student.txt");

const data = fs.readFileSync(filepath, "utf-8");

console.log(data);