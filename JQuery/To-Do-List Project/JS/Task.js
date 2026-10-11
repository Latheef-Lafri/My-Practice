$(document).ready(function()
{
    // add to list of work
    $("#addlist").click(function()
{
    var task=$('#taskinput').val();
    if(task)
    {
        $('#tasklist').append('<li>'+task+'</li>')
        $('#taskinput').val('');
        
        
    }
})
}


)