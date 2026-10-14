 
 // player 1
 var randomnumber1=Math.floor(Math.random()*6)+1; //1-6

 var randomdiceimage="dice" + randomnumber1 + ".png"; //dice1.png-dice6.png

 var randomimagesource="images/" + randomdiceimage;//images/dice1.png - images/dice6.png

 var image1=document.querySelectorAll("img")[0];

 image1.setAttribute("src",randomimagesource);

//player2
 var randomnumber2=Math.floor(Math.random()*6)+1; //1-6

 var randomdiceimage2="dice" + randomnumber2 + ".png"; //dice1.png-dice6.png

 var randomimagesource2="images/" + randomdiceimage2;//images/dice1.png - images/dice6.png

 var image2=document.querySelectorAll("img")[1];

 image2.setAttribute("src",randomimagesource2);






//  if (randomNumber1 > randomNumber2)
// {
//   document.querySelector("h1").innerHTML="🚩 Player 1 Wins!";
// }
// else if (randomNumber2 > randomNumber1) {
//   document.querySelector("h1").innerHTML="Player 2 Wins! 🚩";
// }
// else {
//   document.querySelector("h1").innerHTML="Draw!";
// }




if (randomnumber1 > randomnumber2)
{
    document.querySelector("h1").innerHTML="Player 1 Win";
}

else if (randomnumber2 > randomnumber1)
{
   document.querySelector("h1").innerHTML="Player 2 Win";
}

else 
{
    document.querySelector("h1").innerHTML = "Draw";
}


