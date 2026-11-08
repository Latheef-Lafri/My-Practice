const validatestudent=(req,res,next)=>
{
    const {name,age,course}=req.body;

    if (!name || !age ||!course)
    {
        return res.status(400).json(
            {
                message:"All fields are required"
            }
        );
    }
  
    if(typeof name!=="string" || name.trim()==="")
    {
        return res.status(400).json(
            {
                message:"Name must be a valid string"
            }
        );
    }

    if(!Number.isInteger(age) || age<=0)
    {
        return res.status(400).json(
            {
                message:"Age must be a positive number"
            }
        );
    }

    if(typeof course!=="string" || course.trim()==="")
    {
        return res.status(400).json(
            {
                message:"course must be a valid string"
            }
        );
    }

};

export default validatestudent;