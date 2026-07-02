const express=require('express')
const router=express.Router()
const {nanoid}=require('nanoid')
const {eq, and}=require('drizzle-orm')
const {shortenPostValidation}=require('../validation/url.validation')
const db=require('../index.js')
const { urlTable } = require('../schema/url.model')
const { userTable } = require('../schema/user.model.js')
const authMiddleware=require('../middleware/authMiddleware.js')
const { id } = require('zod/locales')
const { success } = require('zod')




router.patch('/update/:id',authMiddleware,async (req,res)=>{
    const {code}=req.body
    const id=req.params.id
    //this returns the updated row and by using returning() it is possible
    const [result]=await db.update(urlTable).set({shortCode:code}).where(and(
        eq(urlTable.id,id),eq(urlTable.userId,req.user.id)
    )).returning()
    if(!result){
        return res.status(400).json({error:'no updates'})
    }
    return res.status(201).json({success:`Shorturl updated`})
})




router.post('/shorten',authMiddleware,async (req,res)=>{
    const userId=req.user.id 
    if(!userId){
        return res.status(400).json({error:'User not valid'})
    }
    const validURL=await shortenPostValidation.safeParseAsync(req.body)
    if(validURL.error){
        return res.status(400).json({error:validURL.error})
    }
    const {url,code}=validURL.data
    const shortCode=code ?? nanoid(6)
    const [result]=await db.insert(urlTable).values({
        shortCode,
        targetURL:url,
        userId:req.user.id
    }).returning({id:urlTable.id,shortCode:urlTable.shortCode,targetURL:urlTable.targetURL})
   return res.status(200).json({id:result.id,shortCode:result.shortCode,target:result.targetURL})
})

router.get('/codes',authMiddleware,async (req,res)=>{
    const userId=req.user.id;
    const code=await db.select().from(urlTable).where(eq(urlTable.userId,userId))
    if(code.length ==0){
        return res.status(400).json({error:'No code exist'})
    }
    return res.status(200).json({code})
})
router.get('/:shortCode',async (req,res)=>{
    const code=req.params.shortCode;
    const [result]=await db.select().from(urlTable).where(eq(urlTable.shortCode,code))

    if(!result){
        return res.status(400).json({error:'no shortcode exists'})
    }
    return res.redirect(result.targetURL)
})
router.delete('/delete/:id',authMiddleware,async (req,res)=>{
    const id = req.params.id;
    const [isthere]=await db.select().from(urlTable).where(eq(urlTable.id,id))
    if(!isthere){
        return res.status(400).json({error:'no url with this id exists'})
    }
    await db.delete(urlTable).where(and(
        eq(urlTable.userId,req.user.id),eq(urlTable.id,id)
    ))
    return res.status(200).json({success:'url deleted successfully'})
})
module.exports=router