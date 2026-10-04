import 'dotenv/config';import express from 'express';import mongoose from 'mongoose';import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';import multer from 'multer';import nodemailer from 'nodemailer';import helmet from 'helmet';import cors from 'cors';
import rateLimit from 'express-rate-limit';import fs from 'fs';import path from 'path';import crypto from 'crypto';import {fileURLToPath} from 'url';
const __dir=path.dirname(fileURLToPath(import.meta.url)),S=process.env.JWT_SECRET||'dev-secret',UP=path.join(__dir,'private-uploads');
fs.mkdirSync(UP,{recursive:true});
const m=mongoose,M=(n,s)=>m.model(n,new m.Schema(s,{timestamps:true}));
const User=M('User',{email:{type:String,unique:true},hash:String,role:{type:String,default:'staff'}});
const Batch=M('Batch',{name:{type:String,unique:true},start:String}); // e.g. "June 2026"
const Setting=M('Setting',{key:{type:String,unique:true},value:m.Schema.Types.Mixed});
const Student=M('Student',{name:String,mobile:String,email:String,timing:String,batch:{type:m.Schema.Types.ObjectId,ref:'Batch'},
 subjects:[{name:{type:String,enum:['English','Marathi']},speed:{type:Number,enum:[30,40,50]}}],paid:{type:Number,default:0},total:Number});
const Doc=M('Doc',{kind:{type:String,enum:['results','certificates']},student:{type:m.Schema.Types.ObjectId,ref:'Student'},batch:{type:m.Schema.Types.ObjectId,ref:'Batch'},original:String,file:String});
const rules=async()=>(await Setting.findOne({key:'fees'}))?.value||{30:7000,40:5000,50:5000};
const total=(subs,r)=>(subs||[]).reduce((t,s)=>t+(r[s.speed]||0),0);
const withPending=s=>({...s.toObject(),pending:(s.total||0)-(s.paid||0)});
const wrap=f=>(q,r,n)=>Promise.resolve(f(q,r,n)).catch(e=>r.status(400).json({error:e.message}));
const auth=(q,r,n)=>{try{q.user=jwt.verify((q.headers.authorization||'').slice(7),S);if(q.user.doc)throw 0;n()}catch{r.status(401).json({error:'Please log in again.'})}};
const docAuth=(q,r,n)=>{try{if(jwt.verify(q.headers['x-doc-token']||'',S).doc!==q.user.id)throw 0;n()}catch{r.status(403).json({error:'Enter the documents PIN.'})}};
const app=express();app.use(cors());app.use(express.json({limit:'100kb'}));
const upload=multer({storage:multer.diskStorage({destination:UP,filename:(q,f,cb)=>cb(null,crypto.randomBytes(24).toString('hex')+'.pdf')}),
 limits:{fileSize:10e6},fileFilter:(q,f,cb)=>cb(f.mimetype==='application/pdf'?null:new Error('Only PDF files are allowed'),f.mimetype==='application/pdf')});
const api=express.Router();
api.post('/login',rateLimit({windowMs:15*60e3,max:20}),wrap(async(q,r)=>{const u=await User.findOne({email:String(q.body.email).toLowerCase()});
 if(!u||!await bcrypt.compare(String(q.body.password),u.hash))return r.status(401).json({error:'Wrong email or password.'});
 r.json({token:jwt.sign({id:String(u._id),role:u.role},S,{expiresIn:'2h'}),email:u.email,role:u.role})}));
api.post('/forgot-password',rateLimit({windowMs:15*60e3,max:5}),wrap(async(q,r)=>{
 const u=await User.findOne({email:String(q.body.email||'').toLowerCase()});
 if(!u)return r.json({ok:true}); // don't reveal if email exists
 const resetToken=jwt.sign({id:String(u._id),reset:true},S,{expiresIn:'15m'});
 const base=process.env.APP_URL||`http://localhost:${process.env.PORT||5000}`;
 const link=`${base}/reset-password.html?token=${resetToken}`;
 if(!process.env.SMTP_HOST)throw new Error('SMTP not configured.');
 await nodemailer.createTransport({host:process.env.SMTP_HOST,port:+process.env.SMTP_PORT||587,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}})
  .sendMail({from:process.env.SMTP_FROM,to:u.email,subject:'DISHA — Password Reset',
   html:`<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f7f9fc;border-radius:12px">
    <h2 style="color:#0f1724">DISHA Typing Institute</h2>
    <p>You requested a password reset. Click the button below. This link expires in <strong>15 minutes</strong>.</p>
    <a href="${link}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#00d4ff;color:#0f1724;font-weight:700;border-radius:8px;text-decoration:none">Reset Password</a>
    <p style="color:#888;font-size:12px">If you didn't request this, ignore this email. Your password won't change.</p>
   </div>`});
 r.json({ok:true})}));
api.post('/reset-password',wrap(async(q,r)=>{
 let payload;try{payload=jwt.verify(q.body.token,S)}catch{return r.status(400).json({error:'Reset link is invalid or expired.'})}
 if(!payload.reset)return r.status(400).json({error:'Invalid reset token.'});
 const pw=String(q.body.password||'');
 if(pw.length<6)return r.status(400).json({error:'Password must be at least 6 characters.'});
 await User.findByIdAndUpdate(payload.id,{hash:await bcrypt.hash(pw,12)});
 r.json({ok:true})}));
api.use(auth);

api.post('/staff',wrap(async(q,r)=>{if(q.user.role!=='admin')return r.status(403).json({error:'Admins only.'});
 await User.create({email:q.body.email.toLowerCase(),hash:await bcrypt.hash(q.body.password,12)});r.json({ok:true})}));
api.get('/batches',wrap(async(q,r)=>r.json(await Batch.find().sort({start:-1}))));
api.post('/batches',wrap(async(q,r)=>r.json(await Batch.create({name:q.body.name,start:q.body.start}))));
api.get('/fees',wrap(async(q,r)=>r.json(await rules())));
api.put('/fees',wrap(async(q,r)=>{await Setting.findOneAndUpdate({key:'fees'},{value:q.body},{upsert:true});r.json(q.body)}));
api.get('/students',wrap(async(q,r)=>{const f={};if(q.query.batch)f.batch=q.query.batch;
 if(q.query.q){const x=new RegExp(String(q.query.q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');f.$or=[{name:x},{mobile:x},{email:x}]}
 r.json((await Student.find(f).populate('batch').sort({name:1})).map(withPending))}));
api.post('/students',wrap(async(q,r)=>{const b=q.body;r.json(withPending(await Student.create({...b,total:total(b.subjects,await rules())})))}));
api.put('/students/:id',wrap(async(q,r)=>{const b=q.body,s=await Student.findByIdAndUpdate(q.params.id,{...b,total:total(b.subjects,await rules())},{new:true});r.json(withPending(s))}));
api.delete('/students/:id',wrap(async(q,r)=>{await Student.findByIdAndDelete(q.params.id);r.json({ok:true})}));
api.post('/notify',wrap(async(q,r)=>{const s=await Student.findById(q.body.student);if(!s?.email)throw new Error('Student has no email saved.');
 if(!process.env.SMTP_HOST)throw new Error('Email is not set up yet. Add SMTP details in server/.env.');
 await nodemailer.createTransport({host:process.env.SMTP_HOST,port:+process.env.SMTP_PORT||587,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}})
  .sendMail({from:process.env.SMTP_FROM,to:s.email,subject:q.body.subject,text:q.body.message});r.json({ok:true})}));
api.post('/notify/whatsapp',wrap(async(q,r)=>{const s=await Student.findById(q.body.student);if(!s?.mobile)throw new Error('Student has no mobile number saved.');
 if(!process.env.TWILIO_ACCOUNT_SID||!process.env.TWILIO_AUTH_TOKEN)throw new Error('Twilio WhatsApp is not configured in .env');
 let num=String(s.mobile).replace(/[^0-9+]/g,'');
 if(!num.startsWith('+')) num=(num.length===10?'+91':'+')+num;
 const sid=process.env.TWILIO_ACCOUNT_SID,token=process.env.TWILIO_AUTH_TOKEN;
 const from=process.env.TWILIO_WHATSAPP_FROM||'whatsapp:+14155238886';
 const auth=Buffer.from(sid+':'+token).toString('base64');
 const p=new URLSearchParams();
 p.append('From',from.startsWith('whatsapp:')?from:'whatsapp:'+from);
 p.append('To','whatsapp:'+num);
 p.append('Body',q.body.message);
 const res=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,{
  method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:p.toString()
 });
 const data=await res.json();
 if(!res.ok||data.error_code||data.code) throw new Error(data.message||'Twilio WhatsApp failed');
 r.json({ok:true,sid:data.sid});
}));
api.post('/docs/unlock',rateLimit({windowMs:15*60e3,max:10}),wrap(async(q,r)=>{const p=await Setting.findOne({key:'pin'});
 if(!await bcrypt.compare(String(q.body.pin),p.value))return r.status(403).json({error:'Wrong PIN.'});
 r.json({token:jwt.sign({doc:q.user.id},S,{expiresIn:'10m'})})}));
api.get('/docs',docAuth,wrap(async(q,r)=>r.json(await Doc.find({kind:q.query.kind}).populate('student','name').populate('batch','name').sort({createdAt:-1}))));
api.post('/docs',docAuth,upload.single('file'),wrap(async(q,r)=>{const s=await Student.findById(q.body.student);
 r.json(await Doc.create({kind:q.body.kind,student:s._id,batch:s.batch,original:q.file.originalname,file:q.file.filename}))}));
api.get('/docs/:id/file',docAuth,wrap(async(q,r)=>{const d=await Doc.findById(q.params.id);r.type('pdf').sendFile(path.join(UP,d.file))}));
api.delete('/docs/:id',docAuth,wrap(async(q,r)=>{const d=await Doc.findByIdAndDelete(q.params.id);fs.rmSync(path.join(UP,d.file),{force:true});r.json({ok:true})}));
app.use('/api',api);
const dist=path.join(__dir,'../frontend/dist');if(fs.existsSync(dist)){app.use(express.static(dist));app.get('*',(q,r)=>r.sendFile(path.join(dist,'index.html')))}
await m.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/disha');
const adminEmail=(process.env.ADMIN_EMAIL||'varmaganesh1010@gmail.com').toLowerCase();
const adminPass=process.env.ADMIN_PASSWORD||'Itsvarmaganesh01';
const adminHash=await bcrypt.hash(adminPass,12);
await User.findOneAndUpdate({email:adminEmail},{email:adminEmail,hash:adminHash,role:'admin'},{upsert:true});
if(!await Setting.findOne({key:'pin'}))await Setting.create({key:'pin',value:await bcrypt.hash(process.env.DOC_PIN||'123456',12)});
if(!await Batch.countDocuments())await Batch.insertMany(['2026-06','2026-12','2027-06','2027-12'].map(d=>({start:d,name:new Date(d+'-01').toLocaleString('en',{month:'long',year:'numeric'})})));
const srv = app.listen(process.env.PORT||5000,()=>console.log('DISHA running on :'+(process.env.PORT||5000)));
srv.on('error', err => {
  if (err.code === 'EADDRINUSE') console.log('Port ' + (process.env.PORT||5000) + ' is already active.');
  else console.error(err);
});
