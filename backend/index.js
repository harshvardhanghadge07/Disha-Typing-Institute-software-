import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import nodemailer from 'nodemailer';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {fileURLToPath} from 'url';

const __dir=path.dirname(fileURLToPath(import.meta.url));

// Explicitly load environment variables from backend directory and root
dotenv.config({ path: path.join(__dir, '.env') });
dotenv.config({ path: path.join(__dir, '..', '.env') });

const S=process.env.JWT_SECRET||'dev-secret',UP=path.join(__dir,'private-uploads');
fs.mkdirSync(UP,{recursive:true});
const m=mongoose,M=(n,s)=>m.model(n,new m.Schema(s,{timestamps:true}));
const User=M('User',{email:{type:String,unique:true},hash:String,role:{type:String,default:'staff'}});
const Batch=M('Batch',{name:{type:String,unique:true},start:String});
const Setting=M('Setting',{key:{type:String,unique:true},value:m.Schema.Types.Mixed});
const Student=M('Student',{
  name:String,mobile:String,email:String,timing:String,timings:[String],computer:String,batch:{type:m.Schema.Types.ObjectId,ref:'Batch'},
  subjects:[{name:String,speed:Number,timing:String}],paid:{type:Number,default:0},total:Number,
  payments:[{amount:Number,date:String,note:String,createdAt:{type:Date,default:Date.now}}],
  grNo:String,motherName:String,gender:String,dob:String,admissionDate:String,qualification:String,address:String,aadharNo:String,photo:String
});
const Doc=M('Doc',{kind:{type:String,enum:['results','certificates']},student:{type:m.Schema.Types.ObjectId,ref:'Student'},batch:{type:m.Schema.Types.ObjectId,ref:'Batch'},original:String,file:String});
const Backup=M('Backup',{user:{type:m.Schema.Types.ObjectId,ref:'User'},userEmail:String,label:String,totalStudents:Number,totalBatches:Number,totalDocs:Number,payload:String});

const rules=async()=>(await Setting.findOne({key:'fees'}))?.value||{30:7000,40:5000,50:5000,3000:3000};
const getSubjects=async()=>(await Setting.findOne({key:'subjects'}))?.value||['English','Marathi','Hindi','GCC-TBC'];
const total=(subs,r)=>(subs||[]).reduce((t,s)=>{
  if(!s) return t;
  const k = s.speed;
  if(r && r[k] !== undefined) return t + Number(r[k]);
  if(k == 3000) return t + 3000;
  return t + (Number(r[k]) || 0);
},0);
const withPending=s=>{
  const o = typeof s?.toObject === 'function' ? s.toObject() : {...s};
  let paid = Number(o.paid) || 0;
  if (Array.isArray(o.payments) && o.payments.length > 0) {
    paid = o.payments.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
  }
  const pending = (Number(o.total) || 0) - paid;
  return { ...o, paid, pending };
};
const wrap=f=>(q,r,n)=>Promise.resolve(f(q,r,n)).catch(e=>r.status(400).json({error:e.message}));
const auth=(q,r,n)=>{try{q.user=jwt.verify((q.headers.authorization||'').slice(7),S);if(q.user.doc)throw 0;n()}catch{r.status(401).json({error:'Please log in again.'})}};
const docAuth=(q,r,n)=>{try{if(jwt.verify(q.headers['x-doc-token']||'',S).doc!==q.user.id)throw 0;n()}catch{r.status(403).json({error:'Enter the documents PIN.'})}};

// --- CLOUD BACKUP ENCRYPTION & RESTORE HELPERS ---
const ENC_KEY = crypto.createHash('sha256').update(S).digest();
const encryptBackup = (obj) => {
  const jsonStr = JSON.stringify(obj);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, iv);
  let enc = cipher.update(jsonStr, 'utf8', 'hex');
  enc += cipher.final('hex');
  return iv.toString('hex') + ':' + enc;
};
const decryptBackup = (str) => {
  const parts = String(str).split(':');
  if (parts.length !== 2) throw new Error('Invalid backup format payload');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, iv);
  let dec = decipher.update(parts[1], 'hex', 'utf8');
  dec += decipher.final('utf8');
  return JSON.parse(dec);
};
const generateBackupData = async () => {
  const batches = await Batch.find().lean();
  const settings = await Setting.find().lean();
  const students = await Student.find().lean();
  const docs = await Doc.find().lean();
  const files = {};
  if (fs.existsSync(UP)) {
    const list = fs.readdirSync(UP);
    for (const f of list) {
      if (f.endsWith('.pdf')) {
        files[f] = fs.readFileSync(path.join(UP, f)).toString('base64');
      }
    }
  }
  return { version: '1.0', timestamp: new Date().toISOString(), batches, settings, students, docs, files };
};
const restoreBackupData = async (data) => {
  if (!data || !Array.isArray(data.students) || !Array.isArray(data.batches)) {
    throw new Error('Invalid backup data structure.');
  }
  await Batch.deleteMany({});
  await Setting.deleteMany({});
  await Student.deleteMany({});
  await Doc.deleteMany({});

  if (data.batches?.length) await Batch.insertMany(data.batches);
  if (data.settings?.length) await Setting.insertMany(data.settings);
  if (data.students?.length) await Student.insertMany(data.students);
  if (data.docs?.length) await Doc.insertMany(data.docs);

  if (data.files && typeof data.files === 'object') {
    fs.mkdirSync(UP, { recursive: true });
    for (const [filename, b64] of Object.entries(data.files)) {
      if (typeof b64 === 'string') {
        fs.writeFileSync(path.join(UP, filename), Buffer.from(b64, 'base64'));
      }
    }
  }
  return { batches: data.batches.length, students: data.students.length, docs: data.docs.length };
};
const autoBackupTrigger = async (userId, email) => {
  try {
    const autoSetting = await Setting.findOne({ key: 'auto_backup' });
    if (autoSetting && autoSetting.value === false) {
      console.log('[backup] Automatic cloud backup is turned OFF.');
      return;
    }
    const data = await generateBackupData();
    const enc = encryptBackup(data);
    await Backup.create({
      user: userId,
      userEmail: email || '',
      label: `Auto Cloud Backup (${data.students.length} students)`,
      totalStudents: data.students.length,
      totalBatches: data.batches.length,
      totalDocs: data.docs.length,
      payload: enc
    });
    const all = await Backup.find({ $or: [{ user: userId }, { userEmail: email }] }).sort({ createdAt: -1 });
    if (all.length > 15) {
      const toDel = all.slice(15).map(x => x._id);
      await Backup.deleteMany({ _id: { $in: toDel } });
    }
  } catch (e) {
    console.error('Auto backup background task:', e.message);
  }
};

const app=express();app.use(cors());app.use(express.json({limit:'50mb'}));
const upload=multer({storage:multer.diskStorage({destination:UP,filename:(q,f,cb)=>cb(null,crypto.randomBytes(24).toString('hex')+'.pdf')}),
 limits:{fileSize:10e6},fileFilter:(q,f,cb)=>cb(f.mimetype==='application/pdf'?null:new Error('Only PDF files are allowed'),f.mimetype==='application/pdf')});
const api=express.Router();

const waitForDb = async (timeoutMs = 15000) => {
  if (m.connection.readyState === 1) return true;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (m.connection.readyState === 1) return true;
    await new Promise(res => setTimeout(res, 200));
  }
  return m.connection.readyState === 1;
};

// Ensure database is connected before handling queries
api.use(async (q, r, next) => {
  if (q.path === '/health') return next();
  if (m.connection.readyState !== 1) {
    const ok = await waitForDb(12000);
    if (!ok) {
      return r.status(503).json({
        error: 'Connecting to cloud database... Please check your internet connection and try again.'
      });
    }
  }
  next();
});

api.post('/login',rateLimit({windowMs:15*60e3,max:100,message:{error:'Too many login attempts. Please wait a few minutes.'}}),wrap(async(q,r)=>{const u=await User.findOne({email:String(q.body.email).toLowerCase()});
 if(!u||!await bcrypt.compare(String(q.body.password),u.hash))return r.status(401).json({error:'Wrong email or password.'});
 r.json({token:jwt.sign({id:String(u._id),role:u.role,email:u.email},S,{expiresIn:'2h'}),email:u.email,role:u.role})}));

api.post('/forgot-password',rateLimit({windowMs:15*60e3,max:10}),wrap(async(q,r)=>{
 const u=await User.findOne({email:String(q.body.email||'').toLowerCase()});
 if(!u)return r.json({ok:true, message:'If an account exists with this email, reset instructions have been processed.'});
 if(!process.env.SMTP_HOST) {
   return r.json({ok:true, requiresPin:true, message:'SMTP email server is not configured in backend .env. You can reset your password using the Institute Security PIN.'});
 }
 const resetToken=jwt.sign({id:String(u._id),reset:true},S,{expiresIn:'15m'});
 const base=process.env.APP_URL||`http://localhost:${process.env.PORT||5000}`;
 const link=`${base}/?token=${resetToken}`;
 await nodemailer.createTransport({host:process.env.SMTP_HOST,port:+process.env.SMTP_PORT||587,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}})
  .sendMail({from:process.env.SMTP_FROM||'no-reply@disha.in',to:u.email,subject:'DISHA — Password Reset',
   html:`<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f1724;color:#dfe7e6;border-radius:12px">
    <h2 style="color:#d4a24c">DISHA Typing Institute</h2>
    <p>You requested a password reset. Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.</p>
    <a href="${link}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#d4a24c;color:#1b1405;font-weight:700;border-radius:8px;text-decoration:none">Reset Password</a>
    <p style="color:#8da0a6;font-size:12px">If you didn't request this, ignore this email. Your password won't change.</p>
   </div>`});
 r.json({ok:true, sentEmail:true});
}));

api.post('/reset-password',wrap(async(q,r)=>{
 let payload;try{payload=jwt.verify(q.body.token,S)}catch{return r.status(400).json({error:'Reset link is invalid or expired.'})}
 if(!payload.reset)return r.status(400).json({error:'Invalid reset token.'});
 const pw=String(q.body.password||'');
 if(pw.length<6)return r.status(400).json({error:'Password must be at least 6 characters.'});
 await User.findByIdAndUpdate(payload.id,{hash:await bcrypt.hash(pw,12)});
 r.json({ok:true});
}));

api.post('/reset-password-pin',rateLimit({windowMs:15*60e3,max:10}),wrap(async(q,r)=>{
 const email=String(q.body.email||'').toLowerCase();
 const u=await User.findOne({email});
 if(!u)return r.status(404).json({error:'Account with this email address was not found.'});
 const pin=String(q.body.pin||'');
 const p=await Setting.findOne({key:'pin'});
 const pinHash=p?.value;
 let isPinValid = false;
 if (pinHash) {
   isPinValid = await bcrypt.compare(pin, pinHash);
 } else {
   isPinValid = (pin === (process.env.DOC_PIN || '123456'));
 }
 if (!isPinValid) return r.status(403).json({error:'Invalid Institute Security PIN.'});
 const pw=String(q.body.password||'');
 if(pw.length<6)return r.status(400).json({error:'New password must be at least 6 characters.'});
 await User.findByIdAndUpdate(u._id,{hash:await bcrypt.hash(pw,12)});
 r.json({ok:true});
}));

api.use(auth);

api.post('/staff',wrap(async(q,r)=>{if(q.user.role!=='admin')return r.status(403).json({error:'Admins only.'});
 await User.create({email:q.body.email.toLowerCase(),hash:await bcrypt.hash(q.body.password,12)});r.json({ok:true})}));

api.get('/batches',wrap(async(q,r)=>r.json(await Batch.find().sort({start:-1}))));
api.post('/batches',wrap(async(q,r)=>{
  const res = await Batch.create({name:q.body.name,start:q.body.start});
  autoBackupTrigger(q.user.id, q.user.email);
  r.json(res);
}));
api.delete('/batches/:id',wrap(async(q,r)=>{
  const b = await Batch.findById(q.params.id);
  if (!b) return r.status(404).json({error:'Batch not found.'});
  await Student.updateMany({batch:q.params.id},{$unset:{batch:1}});
  await Doc.updateMany({batch:q.params.id},{$unset:{batch:1}});
  await Batch.findByIdAndDelete(q.params.id);
  autoBackupTrigger(q.user.id, q.user.email);
  r.json({ok:true,deletedId:q.params.id});
}));

api.get('/fees',wrap(async(q,r)=>r.json(await rules())));
api.put('/fees',wrap(async(q,r)=>{
  await Setting.findOneAndUpdate({key:'fees'},{value:q.body},{upsert:true});
  autoBackupTrigger(q.user.id, q.user.email);
  r.json(q.body);
}));

api.get('/subjects',wrap(async(q,r)=>r.json(await getSubjects())));
api.post('/subjects',wrap(async(q,r)=>{
  const name=String(q.body.name||'').trim();
  if(!name) throw new Error('Subject name cannot be empty.');
  let list=await getSubjects();
  if(!list.includes(name)){
    list.push(name);
    await Setting.findOneAndUpdate({key:'subjects'},{value:list},{upsert:true});
    autoBackupTrigger(q.user.id, q.user.email);
  }
  r.json(list);
}));
api.delete('/subjects/:name',wrap(async(q,r)=>{
  const name=decodeURIComponent(q.params.name);
  let list=await getSubjects();
  list=list.filter(s=>s!==name);
  await Setting.findOneAndUpdate({key:'subjects'},{value:list},{upsert:true});
  autoBackupTrigger(q.user.id, q.user.email);
  r.json(list);
}));

api.get('/students',wrap(async(q,r)=>{const f={};if(q.query.batch)f.batch=q.query.batch;
 if(q.query.q){const x=new RegExp(String(q.query.q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');f.$or=[{name:x},{mobile:x},{email:x},{grNo:x},{aadharNo:x},{computer:x},{motherName:x}]}
 r.json((await Student.find(f).populate('batch').sort({name:1})).map(withPending))}));

api.post('/students',wrap(async(q,r)=>{
 const b={...q.body};
 if(!b.batch) delete b.batch;
 const subTimings = Array.isArray(b.subjects) ? b.subjects.map(s => s?.timing).filter(Boolean) : [];
 if (subTimings.length > 0) {
   b.timings = [...new Set(subTimings)];
   b.timing = b.timings.join(', ');
 } else if (Array.isArray(b.timings) && b.timings.length > 0) {
   b.timing = b.timings.filter(Boolean).join(', ');
 } else if (b.timing) {
   b.timings = String(b.timing).split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
 }
 if (Array.isArray(b.payments) && b.payments.length > 0) {
   b.paid = b.payments.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
 } else if (Number(b.paid) > 0) {
   b.payments = [{ amount: Number(b.paid), date: b.admissionDate || new Date().toISOString().slice(0, 10), note: 'Initial payment' }];
 }
 const s=await Student.create({...b,total:total(b.subjects,await rules())});
 autoBackupTrigger(q.user.id, q.user.email);
 r.json(withPending(s));
}));

api.put('/students/:id',wrap(async(q,r)=>{
 const b={...q.body};
 const subTimings = Array.isArray(b.subjects) ? b.subjects.map(s => s?.timing).filter(Boolean) : [];
 if (subTimings.length > 0) {
   b.timings = [...new Set(subTimings)];
   b.timing = b.timings.join(', ');
 } else if (Array.isArray(b.timings) && b.timings.length > 0) {
   b.timing = b.timings.filter(Boolean).join(', ');
 } else if (b.timing) {
   b.timings = String(b.timing).split(/[,;|\n]+/).map(s => s.trim()).filter(Boolean);
 }
 if (Array.isArray(b.payments) && b.payments.length > 0) {
   b.paid = b.payments.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
 } else if (Number(b.paid) > 0 && (!b.payments || b.payments.length === 0)) {
   b.payments = [{ amount: Number(b.paid), date: new Date().toISOString().slice(0, 10), note: 'Payment' }];
 }
 const updateData={...b,total:total(b.subjects,await rules())};
 const updateOp=b.batch?{$set:updateData}:{$set:updateData,$unset:{batch:1}};
 if(!b.batch) delete updateData.batch;
 const s=await Student.findByIdAndUpdate(q.params.id,updateOp,{new:true});
 autoBackupTrigger(q.user.id, q.user.email);
 r.json(withPending(s));
}));

api.post('/students/:id/payments',wrap(async(q,r)=>{
 const numAmt = Number(q.body.amount);
 if (!numAmt || isNaN(numAmt) || numAmt <= 0) return r.status(400).json({error:'Please enter a valid payment amount.'});
 const s = await Student.findById(q.params.id);
 if (!s) return r.status(404).json({error:'Student not found.'});
 if (!Array.isArray(s.payments)) s.payments = [];
 s.payments.push({
   amount: numAmt,
   date: q.body.date || new Date().toISOString().slice(0, 10),
   note: String(q.body.note || '').trim()
 });
 s.paid = s.payments.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
 await s.save();
 autoBackupTrigger(q.user.id, q.user.email);
 r.json(withPending(s));
}));

api.delete('/students/:id/payments/:idx',wrap(async(q,r)=>{
 const s = await Student.findById(q.params.id);
 if (!s) return r.status(404).json({error:'Student not found.'});
 const idx = Number(q.params.idx);
 if (Array.isArray(s.payments) && idx >= 0 && idx < s.payments.length) {
   s.payments.splice(idx, 1);
   s.paid = s.payments.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
   await s.save();
   autoBackupTrigger(q.user.id, q.user.email);
 }
 r.json(withPending(s));
}));

api.delete('/students/:id',wrap(async(q,r)=>{
 await Student.findByIdAndDelete(q.params.id);
 autoBackupTrigger(q.user.id, q.user.email);
 r.json({ok:true});
}));

// --- NOTIFY ENDPOINTS ---
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
 const authHeader=Buffer.from(sid+':'+token).toString('base64');
 const p=new URLSearchParams();
 p.append('From',from.startsWith('whatsapp:')?from:'whatsapp:'+from);
 p.append('To','whatsapp:'+num);
 p.append('Body',q.body.message);
 const res=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,{
  method:'POST',headers:{Authorization:'Basic '+authHeader,'Content-Type':'application/x-www-form-urlencoded'},body:p.toString()
 });
 const data=await res.json();
 if(!res.ok||data.error_code||data.code) throw new Error(data.message||'Twilio WhatsApp failed');
 r.json({ok:true,sid:data.sid});
}));

// --- BATCH FEE REMINDERS ENDPOINTS ---
api.post('/notify/batch-preview', wrap(async(q,r)=>{
  const { batch, pendingOnly, template } = q.body;
  const f = {};
  if (batch) f.batch = batch;
  let students = await Student.find(f).populate('batch');
  if (pendingOnly !== false) {
    students = students.filter(s => (s.total || 0) - (s.paid || 0) > 0);
  }
  const formatRu = n => '₹' + (n || 0).toLocaleString('en-IN');
  const tpl = template || 'Dear {name}, your pending fee for DISHA Typing Institute ({batch}) is {pending}. Please clear your balance. Thank you!';
  
  const list = students.map(s => {
    const pend = (s.total || 0) - (s.paid || 0);
    const lastP = (Array.isArray(s.payments) && s.payments.length > 0) ? s.payments[s.payments.length - 1] : null;
    const lastPaidStr = lastP ? formatRu(lastP.amount) : formatRu(s.paid || 0);
    const lastDateStr = lastP?.date ? new Date(lastP.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const lastNoteStr = lastP?.note || '';
    const msg = tpl
      .replace(/\{name\}/g, s.name || '')
      .replace(/\{pending\}/g, formatRu(pend))
      .replace(/\{paid\}/g, formatRu(s.paid || 0))
      .replace(/\{total\}/g, formatRu(s.total || 0))
      .replace(/\{lastPaid\}/g, lastPaidStr)
      .replace(/\{lastPaymentDate\}/g, lastDateStr)
      .replace(/\{lastNote\}/g, lastNoteStr)
      .replace(/\{batch\}/g, s.batch?.name || 'Current')
      .replace(/\{timing\}/g, s.timing || '');
    return {
      _id: s._id,
      name: s.name,
      mobile: s.mobile,
      email: s.email,
      pending: pend,
      paid: s.paid,
      total: s.total,
      batchName: s.batch?.name || '',
      timing: s.timing,
      message: msg
    };
  });
  r.json({ total: list.length, students: list });
}));

api.post('/notify/batch-send', wrap(async(q,r)=>{
  const { batch, pendingOnly, template, channel, subject } = q.body;
  const f = {};
  if (batch) f.batch = batch;
  let students = await Student.find(f).populate('batch');
  if (pendingOnly !== false) {
    students = students.filter(s => (s.total || 0) - (s.paid || 0) > 0);
  }
  const formatRu = n => '₹' + (n || 0).toLocaleString('en-IN');
  const tpl = template || 'Dear {name}, your pending fee for DISHA Typing Institute ({batch}) is {pending}. Please clear your balance. Thank you!';

  const results = [];
  let sentCount = 0;
  let failCount = 0;

  for (const s of students) {
    const pend = (s.total || 0) - (s.paid || 0);
    const lastP = (Array.isArray(s.payments) && s.payments.length > 0) ? s.payments[s.payments.length - 1] : null;
    const lastPaidStr = lastP ? formatRu(lastP.amount) : formatRu(s.paid || 0);
    const lastDateStr = lastP?.date ? new Date(lastP.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const lastNoteStr = lastP?.note || '';
    const msg = tpl
      .replace(/\{name\}/g, s.name || '')
      .replace(/\{pending\}/g, formatRu(pend))
      .replace(/\{paid\}/g, formatRu(s.paid || 0))
      .replace(/\{total\}/g, formatRu(s.total || 0))
      .replace(/\{lastPaid\}/g, lastPaidStr)
      .replace(/\{lastPaymentDate\}/g, lastDateStr)
      .replace(/\{lastNote\}/g, lastNoteStr)
      .replace(/\{batch\}/g, s.batch?.name || 'Current')
      .replace(/\{timing\}/g, s.timing || '');

    if (channel === 'email') {
      if (!s.email) {
        results.push({ name: s.name, status: 'failed', error: 'No email address' });
        failCount++;
        continue;
      }
      if (!process.env.SMTP_HOST) {
        return r.status(400).json({ error: 'SMTP is not configured in .env file.' });
      }
      try {
        await nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: +process.env.SMTP_PORT || 587,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        }).sendMail({
          from: process.env.SMTP_FROM,
          to: s.email,
          subject: subject || 'Fee Reminder — DISHA Computer Typing Institute',
          text: msg
        });
        results.push({ name: s.name, email: s.email, status: 'sent' });
        sentCount++;
      } catch (err) {
        results.push({ name: s.name, email: s.email, status: 'failed', error: err.message });
        failCount++;
      }
    } else if (channel === 'twilio') {
      if (!s.mobile) {
        results.push({ name: s.name, status: 'failed', error: 'No mobile number' });
        failCount++;
        continue;
      }
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return r.status(400).json({ error: 'Twilio WhatsApp is not configured in .env' });
      }
      let num = String(s.mobile).replace(/[^0-9+]/g, '');
      if (!num.startsWith('+')) num = (num.length === 10 ? '+91' : '+') + num;
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
      const authHeader = Buffer.from(sid + ':' + token).toString('base64');
      const p = new URLSearchParams();
      p.append('From', from.startsWith('whatsapp:') ? from : 'whatsapp:' + from);
      p.append('To', 'whatsapp:' + num);
      p.append('Body', msg);
      try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: 'Basic ' + authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: p.toString()
        });
        const data = await res.json();
        if (!res.ok || data.error_code || data.code) throw new Error(data.message || 'Twilio WhatsApp failed');
        results.push({ name: s.name, mobile: s.mobile, status: 'sent', sid: data.sid });
        sentCount++;
      } catch (err) {
        results.push({ name: s.name, mobile: s.mobile, status: 'failed', error: err.message });
        failCount++;
      }
    }
  }

  r.json({ total: students.length, sentCount, failCount, results });
}));

// --- CLOUD BACKUP ENDPOINTS ---
api.get('/backup/list', wrap(async(q,r)=>{
  const u = await User.findById(q.user.id);
  const backups = await Backup.find({ $or: [{ user: q.user.id }, { userEmail: u?.email || q.user.email }] }).select('-payload').sort({ createdAt: -1 });
  r.json(backups);
}));

api.post('/backup/create', wrap(async(q,r)=>{
  const data = await generateBackupData();
  const enc = encryptBackup(data);
  const u = await User.findById(q.user.id);
  const b = await Backup.create({
    user: q.user.id,
    userEmail: u?.email || q.user.email || '',
    label: q.body.label || `Manual Cloud Backup (${data.students.length} students)`,
    totalStudents: data.students.length,
    totalBatches: data.batches.length,
    totalDocs: data.docs.length,
    payload: enc
  });
  r.json({ ok: true, backup: { _id: b._id, createdAt: b.createdAt, label: b.label, totalStudents: b.totalStudents, totalBatches: b.totalBatches, totalDocs: b.totalDocs } });
}));

api.post('/backup/restore/:id', wrap(async(q,r)=>{
  const b = await Backup.findById(q.params.id);
  if (!b) return r.status(404).json({ error: 'Backup snapshot not found.' });
  const data = decryptBackup(b.payload);
  const stats = await restoreBackupData(data);
  r.json({ ok: true, stats });
}));

api.delete('/backup/:id', wrap(async(q,r)=>{
  await Backup.findByIdAndDelete(q.params.id);
  r.json({ ok: true });
}));

api.get('/backup/export/:id', wrap(async(q,r)=>{
  const b = await Backup.findById(q.params.id);
  if (!b) return r.status(404).json({ error: 'Backup not found' });
  r.setHeader('Content-Type', 'application/json');
  r.setHeader('Content-Disposition', `attachment; filename="disha-backup-${b._id}.dishabackup"`);
  r.send(JSON.stringify({ dishaBackup: true, payload: b.payload, label: b.label, createdAt: b.createdAt }));
}));

api.post('/backup/import', wrap(async(q,r)=>{
  let payloadStr = q.body.payload;
  if (!payloadStr && q.body.raw) payloadStr = q.body.raw;
  if (!payloadStr) return r.status(400).json({ error: 'No backup payload provided.' });
  let data;
  try {
    data = decryptBackup(payloadStr);
  } catch {
    try { data = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr; }
    catch { throw new Error('Failed to parse or decrypt backup payload.'); }
  }
  const stats = await restoreBackupData(data);
  r.json({ ok: true, stats });
}));

api.get('/backup/check-cloud', wrap(async(q,r)=>{
  const u = await User.findById(q.user.id);
  const backups = await Backup.find({ $or: [{ user: q.user.id }, { userEmail: u?.email || q.user.email }] }).select('-payload').sort({ createdAt: -1 });
  const studentCount = await Student.countDocuments();
  r.json({
    hasCloudBackups: backups.length > 0,
    latestBackup: backups[0] || null,
    totalBackups: backups.length,
    isEmptyDatabase: studentCount === 0
  });
}));

api.get('/backup/auto-status', wrap(async(q,r)=>{
  const setting = await Setting.findOne({ key: 'auto_backup' });
  r.json({ autoBackup: setting?.value !== false });
}));

api.put('/backup/auto-status', wrap(async(q,r)=>{
  const enabled = Boolean(q.body.enabled);
  await Setting.findOneAndUpdate({ key: 'auto_backup' }, { value: enabled }, { upsert: true });
  r.json({ ok: true, autoBackup: enabled });
}));

// --- DOCS ENDPOINTS ---
api.post('/docs/unlock',rateLimit({windowMs:15*60e3,max:10}),wrap(async(q,r)=>{const p=await Setting.findOne({key:'pin'});
 if(!await bcrypt.compare(String(q.body.pin),p.value))return r.status(403).json({error:'Wrong PIN.'});
 r.json({token:jwt.sign({doc:q.user.id},S,{expiresIn:'10m'})})}));
api.get('/docs',docAuth,wrap(async(q,r)=>r.json(await Doc.find({kind:q.query.kind}).populate('student','name').populate('batch','name').sort({createdAt:-1}))));
api.post('/docs',docAuth,upload.single('file'),wrap(async(q,r)=>{
  const s=await Student.findById(q.body.student);
  const doc = await Doc.create({kind:q.body.kind,student:s._id,batch:s.batch,original:q.file.originalname,file:q.file.filename});
  autoBackupTrigger(q.user.id, q.user.email);
  r.json(doc);
}));
api.get('/docs/:id/file',docAuth,wrap(async(q,r)=>{
  const d=await Doc.findById(q.params.id);
  if(!d) return r.status(404).json({error:'Document not found'});
  r.setHeader('Content-Type', 'application/pdf');
  r.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(d.original || 'document.pdf')}"`);
  r.sendFile(path.join(UP,d.file));
}));

api.get('/docs/:id/download',docAuth,wrap(async(q,r)=>{
  const d=await Doc.findById(q.params.id);
  if(!d) return r.status(404).json({error:'Document not found'});
  r.setHeader('Content-Type', 'application/pdf');
  r.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(d.original || 'document.pdf')}"`);
  r.sendFile(path.join(UP,d.file));
}));

api.delete('/docs/:id',docAuth,wrap(async(q,r)=>{
  const d=await Doc.findByIdAndDelete(q.params.id);fs.rmSync(path.join(UP,d.file),{force:true});
  autoBackupTrigger(q.user.id, q.user.email);
  r.json({ok:true});
}));

app.get('/api/health', (q, r) => r.json({ ok: true, db: m.connection.readyState === 1 }));
app.use('/api', api);

const dist = path.join(__dir, '../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      }
    }
  }));
  app.get('*', (q, r) => {
    r.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    r.sendFile(path.join(dist, 'index.html'));
  });
}

// Start Express server immediately so UI and static assets load in < 100ms
const srv = app.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log('DISHA running on :' + (process.env.PORT || 5000));
});
srv.on('error', err => {
  if (err.code === 'EADDRINUSE') console.log('Port ' + (process.env.PORT || 5000) + ' is already active.');
  else console.error(err);
});

// Connect to MongoDB and initialize defaults in background without blocking server boot
async function initDbDefaults() {
  try {
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const adminEmail = process.env.ADMIN_EMAIL.toLowerCase();
      const existing = await User.findOne({ email: adminEmail });
      if (!existing) {
        const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await User.create({ email: adminEmail, hash: adminHash, role: 'admin' });
        console.log('[db] Initialized admin user:', adminEmail);
      }
    }

    const pinSetting = await Setting.findOne({ key: 'pin' });
    if (!pinSetting) {
      const pinHash = await bcrypt.hash(process.env.DOC_PIN || '123456', 10);
      await Setting.create({ key: 'pin', value: pinHash });
    }

    const batchCount = await Batch.countDocuments();
    if (!batchCount) {
      await Batch.insertMany(['2026-06', '2026-12', '2027-06', '2027-12'].map(d => ({
        start: d,
        name: new Date(d + '-01').toLocaleString('en', { month: 'long', year: 'numeric' })
      })));
    }
  } catch (e) {
    console.error('[db] Error setting up defaults:', e.message);
  }
}

let isConnecting = false;
async function connectDB() {
  if (isConnecting || m.connection.readyState === 1) return;
  isConnecting = true;
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/disha';
  try {
    console.log('[db] Connecting to MongoDB...');
    await m.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log('[db] Connected to database');
    await initDbDefaults();
  } catch (err) {
    console.error('[db] Database connection error:', err.message);
    setTimeout(() => {
      isConnecting = false;
      connectDB();
    }, 3000);
    return;
  }
  isConnecting = false;
}

m.connection.on('disconnected', () => {
  console.log('[db] MongoDB disconnected. Reconnecting...');
  setTimeout(connectDB, 3000);
});

connectDB();
