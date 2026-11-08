const errorhandler=(err,req,res,next)=>
{
    console.log("Error:",err.message);

    res.status(err.status || 500).json(
        {
            message:err.message || "Internal server error"
        }
    );
};

export default errorhandler;