const express =require("express");
const app=express();
let port =3000;
app.listen(port,()=>{

})
app.set("view engine", "ejs");
app.get("/",(req,res)=>{
    
    
    res.render("home.ejs");

})