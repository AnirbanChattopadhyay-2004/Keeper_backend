const express=require("express")
const mongoose=require("mongoose")
require("dotenv").config()
const jwt=require("jsonwebtoken")
const cors=require("cors")
const zod=require("zod")
const bcrypt=require("bcrypt")
const saltround=10;
const multer=require("multer")
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, '../frontend/public/')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() 
      cb(null, uniqueSuffix+file.originalname)
    }
  })
  
  const upload = multer({ storage: storage ,limits:{
                            fileSize:1024*1024*2 },
                            fileFilter:(req,file,cb)=>{
        if(file.mimetype==='image/jpeg' || file.mimetype==='image/png' || file.mimetype==='image/jpg'||file.mimetype==='image/webp')
                    cb(null,true)
                     else
                    cb(null,false)
                        }})

const rateLimit=require("express-rate-limit")
const e = require("express")
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	limit: 100, 
	standardHeaders: 'draft-7', 
	legacyHeaders: false, 
})

const app=express();
// app.use(limiter);
app.use(cors())
const constr=process.env.MONGSTR

app.use(express.json())

app.use(express.static("../frontend/components/css"))
app.use(express.static("../frontend/public"))

const schemaObj=new mongoose.Schema({id:Number,title:String,note:String,image:String})

const schema=new mongoose.Schema({id:Number,username:String,password:String,notes:[schemaObj],bin:[schemaObj],archieve:[schemaObj]})
const Usernote=mongoose.model("Usernote",schema)
const port=3000;
const jwtpwd=process.env.JWTPWD
mongoose.connect(constr)

function check(req,res,next)  //middleware to check the validity of given inputs.
{
    const eschema= zod.string().email()
    const pschema = zod.string().min(6);
    const res1=eschema.safeParse(req.body.username)
    const res2= pschema.safeParse(req.body.password)
    if(!(res1.success))
    res.json({msg:"e Incorrect email format"});
    else if(!(res2.success))
    res.json({msg:"p Use a strong password"});
    else
    next()
}
app.post("/api/auth/signup",check,async (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    const f=await Usernote.findOne({username:username})
  
    if(f)
    {
        res.status(403).json({msg:"User already present "})
        
        return;
    }
    else
    {

        const users = await Usernote.find();
     bcrypt.hash(password,saltround,async (err,hash)=>{
        if(err)
        res.status(403).json({msg:"error"})
        else
        {
         
            

            await Usernote.create({id:users.length+1,username:username,password:hash,notes:[],bin:[],archieve:[]})
            
            res.status(200).json({msg:"New user id created"})
            
        }
        
    })
}
})

async function userpresence(name,pwd)
{
    const f=await Usernote.findOne({username:name})
    
    
   const res=await bcrypt.compare(pwd,f.password)
   return res;
}

app.post("/api/auth/login",async (req,res)=>{
    if(!req.body.username||!req.body.password)
    res.status(403).json({msg:'Insufficient Credential'})
    else{
    const ispresent=await userpresence(req.body.username,req.body.password)
    if(ispresent)
    {
        const token=jwt.sign({username:req.body.username},jwtpwd,{expiresIn:"1d"});

        res.status(200).json({token,})
    }
    else
    {
        res.status(403).json({msg:"User Not Found"})
    }
}
})



app.get("/api/notes",async (req,res)=>{
    const token=req.headers.token;
    try{
        const decoded=jwt.verify(token,jwtpwd)
        let a=await Usernote.findOne({username:decoded.username})
        res.json({notes:a.notes});
    }
    catch(err)
    {
        res.status(403).json({msg:"User not authenticated"})
    }
})

app.get("/api/bin",async (req,res)=>{
    const token=req.headers.token;
    try{
        const decoded=jwt.verify(token,jwtpwd)
        let a=await Usernote.findOne({username:decoded.username})
        res.json({notes:a.bin});
    }
    catch(err)
    {
        res.status(403).json({msg:"User not authenticated"})
    }
})


app.post("/api/notes",upload.single("image"),async (req,res)=>{
    const token=req.headers.token;

    const note={...req.body,image:(req.file)?req.file.filename:""}

    //contains the text part of data and req.file contains the file part
    try{
        const decoded=jwt.verify(token,jwtpwd)
      
        let a=await Usernote.findOne({username:decoded.username})
        a.notes.push(note)
        await Usernote.updateOne({username:decoded.username},{notes:a.notes})
        
        res.status(200).json({msg:"Notes added..."})
    }
    catch(err)
    {
        res.status(403).json({msg:"User not authenticated"})
    }
})

//-------------------------------------------------------------------
// app.get("/api/notes/:id",async (req,res)=>{
//     const id=(Number)(req.params.id);
//     try{
//         let v=jwt.verify(req.headers.token,jwtpwd)
//         const a=await Usernote.find({username:v.username});
//         res.status(200).json({msg:a[0].notes[id]})
//     }
//     catch(err)
//     {
//         res.status(403).json({msg:"User does not exists"})
//     }
// })


// app.put("/api/notes/:id",async (req,res)=>{
//     const id=(Number)(req.params.id)
//     const note=req.body.note
//     try{
//         let v=jwt.verify(req.headers.token,jwtpwd)
//         const a=await Usernote.findOne({username:v.username})
//         console.log(a.notes[id-1]);
//         a.notes[id-1]=note;
//         console.log(a.notes[id-1]);
//         await Usernote.updateOne({username : v.username},{notes : a.notes});
//         res.status(200).json({msg:"Notes updated"})
//     }
//     catch(err)
//     {
//         res.status(403).json({msg:"User does not exists"})
//     } 
// })

// app.post("/api/notes/:id/share",async (req,res)=>{
//     const id=req.params.id;
//     const sharename= req.body.username;
//     try{
//         const decoded=jwt.verify(req.headers.token,jwtpwd)
//         const a=await Usernote.findOne({username:decoded.username})
//         const b=await Usernote.findOne({username:sharename})
//         b.notes.push(a.notes[id-1])
//         await Usernote.updateOne({username:sharename},{notes:b.notes})
//         res.json({msg:"Updated successfully"})
//     }
//     catch(err)
//     {
//         res.status(403).json({msg:"Error"})
//     }
// })


//-------------------------------------------------------


app.delete("/api/notes/:id",async (req,res)=>{
    const id=(Number)(req.params.id)
    try{
        let v=jwt.verify(req.headers.token,jwtpwd)
        const a=await Usernote.findOne({username:v.username})
        a.bin.push(a.notes[id])     
        a.notes.splice(id,1)
        await Usernote.updateOne({username:v.username},{notes:a.notes,bin:a.bin})
        res.status(200).json({msg:"Note deleted"})
    }
    catch(err)
    {
        res.status(403).json({msg:"User does not exists"})
    }
})
app.delete("/api/archieve/:id",async (req,res)=>{
    const id=(Number)(req.params.id)
    try{
        let v=jwt.verify(req.headers.token,jwtpwd)
        const a=await Usernote.findOne({username:v.username})
        a.archieve.push(a.notes[id])     
        a.notes.splice(id,1)
        await Usernote.updateOne({username:v.username},{notes:a.notes,archieve:a.archieve})
        res.status(200).json({msg:"Note Archieved"})
    }
    catch(err)
    {
        res.status(403).json({msg:"User does not exists"})
    }
})

app.get("/api/archieve",async (req,res)=>{
    const token=req.headers.token;
 
    try{
        const decoded=jwt.verify(token,jwtpwd)
        const response=await Usernote.findOne({username:decoded.username})
        res.json({notes:response.archieve})
    }
    catch{
        res.status(403).json({msg:"Error"})
    }
})


app.delete("/api/unarchieve/:id",async (req,res)=>{
    const token=req.headers.token
    const id=(Number)(req.params.id);
    try{
        const decoded=jwt.verify(token,jwtpwd)
        const response=await Usernote.findOne({username:decoded.username})
        response.notes.push(response.archieve[id])
        response.archieve.splice(id,1)
        await Usernote.updateOne({username:decoded.username},{notes:response.notes,archieve:response.archieve})
        res.json({msg:"Notes Archieved"})
    }
    catch{
        res.status(403).json({msg:"Error"})
    }
})
app.delete("/api/restore/:id",async (req,res)=>{
    const token=req.headers.token
    const id=(Number)(req.params.id);
    try{
        const decoded=jwt.verify(token,jwtpwd)
        const response=await Usernote.findOne({username:decoded.username})
        response.notes.push(response.bin[id])
        response.bin.splice(id,1)
        await Usernote.updateOne({username:decoded.username},{notes:response.notes,bin:response.bin})
        res.json({msg:"Notes restored"})
    }
    catch{
        res.status(403).json({msg:"Error"})
    }
})

app.delete("/api/bin/permdelete/:id",async (req,res)=>{
    const token=req.headers.token;

    const id=(Number)(req.params.id);
    try{
        const decoded=jwt.verify(token,jwtpwd)
        const response=await Usernote.findOne({username:decoded.username})
       
        response.bin.splice(id,1)
        await Usernote.updateOne({username:decoded.username},{bin:response.bin})
        res.json({msg:"Notes deleted"})
    }
    catch{
        res.status(403).json({msg:"Error"})
    }
})

app.get("/api/bin",async (req,res)=>{
    const token=req.headers.token;
    try{
        const decoded=jwt.verify(token,jwtpwd)
        const res=await Usernote.findOne({username:decoded.username})
        res.json({notes:res.bin})
    }
    catch{
        res.status(403).json({msg:"Error"})
    }
})




app.get("/api/search",async (req,res)=>{
    try{
        const fil=req.query.q;
        const decoded=jwt.verify(req.headers.token,jwtpwd);
        const a=await Usernote.findOne({username:decoded.username})
     
        let b=a.notes.filter((note)=> note.title.includes(fil) )
        res.status(200).json({notes:b})
    }
    catch(err)
    {
        res.status(403).json({msg:"User not found..."})
    }
})

app.listen(port,()=>{
    console.log("Listening on port "+port)
})


