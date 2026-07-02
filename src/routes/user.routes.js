const express=require('express')
const router=express.Router()
const db=require('../index.js')

const {userTable}=require('../schema/user.model.js')
const {eq, hasOwnEntityKind, processRelations}=require('drizzle-orm')
const { error } = require('node:console')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const {hashedPass}=require('../utils/hash.js')
const authMiddleware=require('../middleware/authMiddleware.js')
const {loginPostValidation}=require('../validation/login.validation.js')
const {existingUser}=require('../services/user.services.js')
const {signupPostValidation}=require('../validation/request.validation.js')
//signup
router.post('/signup',async (req,res)=>{
 const inputValid=await signupPostValidation.safeParseAsync(req.body)

 if(inputValid.error){
    return res.status(401).json({error:inputValid.error})

 }
 const {name,email,password}=inputValid.data
 const userAlready=await existingUser(email)
 if(userAlready){
    return res.status(400).json({error:'Email already registered'})

 }

 
  const hashed=await hashedPass(password)
  const [user]=await db.insert(userTable).values({
    name,
    email,
    password:hashed
  }).returning()
  return res.status(201).json({success:'User successfully signed up'})

})

router.post('/login',async (req,res)=>{
   const validLogin= await loginPostValidation.safeParseAsync(req.body)
   if(validLogin.error){
    return res.status(200).json({error:'Invalid user credentials'})
   }

   const {email,password}=validLogin.data
   const [existingUser]=await db.select().from(userTable).where(eq(userTable.email,email))
   if (!existingUser) {
    return res.status(401).json({
        error: "Invalid credentials",
    });
}
   const isMatch = await bcrypt.compare(
    password,
    existingUser.password
);

if (!isMatch) {
    return res.status(401).json({
        error: "Invalid credentials",
    });
}
   

const token=jwt.sign({
       id:existingUser.id,
       name:existingUser.name,
       email:existingUser.email
   },process.env.JWT_SECRET,{
    expiresIn:"1d"
   })

   return res.status(200).json({success:`Welcome ${existingUser.name}`,token})
})


module.exports=router