import {useState,useEffect,useCallback,lazy,Suspense} from 'react';
const Scene=lazy(()=>import('./Scenes.jsx'));
let TOKEN=sessionStorage.getItem('t')||'',DOC='';
const api=async(p,o={})=>{const h={Authorization:'Bearer '+TOKEN,'x-doc-token':DOC};if(!(o.body instanceof FormData)&&o.body){h['Content-Type']='application/json';o.body=JSON.stringify(o.body)}
 const r=await fetch((import.meta.env.VITE_API_URL||'')+'/api'+p,{...o,headers:h});if(o.blob&&r.ok)return r.blob();const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Something went wrong.');return j};
const ru=n=>'₹'+(n||0).toLocaleString('en-IN');
const Stage=({kind})=><div className="stage"><Suspense fallback={null}><Scene kind={kind}/></Suspense></div>;
function ForgotPassword({onBack}){const [e,setE]=useState(''),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[loading,setLoading]=useState(false);
 const send=async ev=>{ev.preventDefault();setLoading(true);setErr('');
  try{await api('/forgot-password',{method:'POST',body:{email:e}});setMsg('Reset link sent! Check your email inbox (and spam folder).')}
  catch(x){setErr(x.message)}finally{setLoading(false)}};
 return <div className="login"><Stage kind="pc"/><form onSubmit={send}>
  <h1>DISHA Typing Institute</h1><p>Enter your email and we'll send a reset link.</p>
  <label>Email<input type="email" value={e} onChange={x=>setE(x.target.value)} required autoFocus/></label>
  {msg?<div role="alert" style={{color:'#22c55e',margin:'8px 0',fontSize:14}}>{msg}</div>:<div className="err" role="alert">{err}</div>}
  {!msg&&<button style={{width:'100%'}} disabled={loading}>{loading?'Sending…':'Send reset link'}</button>}
  <button type="button" className="ghost" style={{width:'100%',marginTop:8}} onClick={onBack}>← Back to login</button>
 </form></div>}
function ResetPassword({token}){const [p,setP]=useState(''),[p2,setP2]=useState(''),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[loading,setLoading]=useState(false);
 const go=async ev=>{ev.preventDefault();setErr('');if(p!==p2)return setErr('Passwords do not match.');setLoading(true);
  try{await api('/reset-password',{method:'POST',body:{token,password:p}});setMsg('Password reset! You can now log in.')}
  catch(x){setErr(x.message)}finally{setLoading(false)}};
 return <div className="login"><Stage kind="pc"/><form onSubmit={go}>
  <h1>DISHA Typing Institute</h1><p>Enter your new password below.</p>
  <label>New password<input type="password" value={p} onChange={x=>setP(x.target.value)} required minLength={6} autoFocus/></label>
  <label>Confirm password<input type="password" value={p2} onChange={x=>setP2(x.target.value)} required minLength={6}/></label>
  {msg?<div style={{color:'#22c55e',margin:'8px 0',fontSize:14}}>{msg}<br/><a href="/" style={{color:'#00d4ff'}}>Go to login →</a></div>:<div className="err">{err}</div>}
  {!msg&&<button style={{width:'100%'}} disabled={loading}>{loading?'Saving…':'Set new password'}</button>}
 </form></div>}
function Login({onIn}){const [e,setE]=useState(''),[p,setP]=useState(''),[err,setErr]=useState(''),[forgot,setForgot]=useState(false);
 const params=new URLSearchParams(window.location.search),resetToken=params.get('token');
 if(resetToken)return <ResetPassword token={resetToken}/>;
 if(forgot)return <ForgotPassword onBack={()=>setForgot(false)}/>;
 const go=async ev=>{ev.preventDefault();try{const r=await api('/login',{method:'POST',body:{email:e,password:p}});TOKEN=r.token;sessionStorage.setItem('t',TOKEN);onIn(r)}catch(x){setErr(x.message)}};
 return <div className="login"><Stage kind="pc"/><form onSubmit={go}><h1>DISHA Typing Institute</h1><p>Staff login. Student records are private.</p>
  <label>Email<input type="email" value={e} onChange={x=>setE(x.target.value)} required autoFocus/></label>
  <label>Password<input type="password" value={p} onChange={x=>setP(x.target.value)} required/></label>
  <div className="err" role="alert">{err}</div><button style={{width:'100%'}}>Log in</button>
  <button type="button" className="ghost" style={{width:'100%',marginTop:8,fontSize:13}} onClick={()=>setForgot(true)}>Forgot password?</button>
 </form></div>}

function Home({batches,students}){const pend=students.reduce((t,s)=>t+s.pending,0);
 return <><div className="hero"><div><h1>Every batch, typed up neatly.</h1><p>Manage 6-month batches, fees and certificates for DISHA Computer Typing Institute.</p>
  <div className="stats"><div className="stat"><b>{batches.length}</b>Batches</div><div className="stat"><b>{students.length}</b>Students</div><div className="stat"><b>{ru(pend)}</b>Fees pending</div></div></div>
  <Stage kind="tw"/></div></>}
const blank={name:'',mobile:'',email:'',timing:'',subjects:[{name:'English',speed:30}],paid:0};
function Students({batches,fees,reload,students,mode}){const [b,setB]=useState(''),[q,setQ]=useState(''),[f,setF]=useState(null),[nb,setNb]=useState('');
 const list=students.filter(s=>(!b||s.batch?._id===b)&&(!q||[s.name,s.mobile,s.email].join(' ').toLowerCase().includes(q.toLowerCase())));
 const tot=f?f.subjects.reduce((t,s)=>t+(fees[s.speed]||0),0):0;
 const save=async()=>{try{const body={...f,batch:f.batch||b||batches[0]?._id,paid:+f.paid};f._id?await api('/students/'+f._id,{method:'PUT',body}):await api('/students',{method:'POST',body});setF(null);reload()}catch(x){alert(x.message)}};
 const sub=(i,k,v)=>setF({...f,subjects:f.subjects.map((s,j)=>j===i?{...s,[k]:k==='speed'?+v:v}:s)});
 return <><h2>{mode==='fees'?'Fees':'Students'}</h2><div className="bar"><select value={b} onChange={e=>setB(e.target.value)}><option value="">All batches</option>{batches.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select>
  <input placeholder="Search name, mobile or email" value={q} onChange={e=>setQ(e.target.value)}/><button onClick={()=>setF({...blank,batch:b})}>Add student</button></div>
  <div className="bar"><input placeholder="New batch, e.g. June 2028" value={nb} onChange={e=>setNb(e.target.value)}/><button className="ghost" onClick={async()=>{const d=new Date('1 '+nb);if(isNaN(d))return alert('Use a format like June 2028');await api('/batches',{method:'POST',body:{name:nb,start:d.toISOString().slice(0,7)}});setNb('');reload()}}>Create batch</button></div>
  {f&&<div className="card"><h3>{f._id?'Edit student':'New student'}</h3><div className="grid" style={{marginTop:14}}>
   {[['name','Full name'],['mobile','Mobile number'],['email','Email address'],['timing','Practice timing']].map(([k,l])=><label key={k}>{l}<input value={f[k]||''} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}
   <label>Batch<select value={f.batch?._id||f.batch||b||batches[0]?._id} onChange={e=>setF({...f,batch:e.target.value})}>{batches.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></label>
   <label>Fees paid (₹)<input type="number" min="0" value={f.paid} onChange={e=>setF({...f,paid:e.target.value})}/></label></div>
   {f.subjects.map((s,i)=><div className="bar" key={i}><select value={s.name} onChange={e=>sub(i,'name',e.target.value)}><option>English</option><option>Marathi</option></select>
    <select value={s.speed} onChange={e=>sub(i,'speed',e.target.value)}>{[30,40,50].map(v=><option key={v} value={v}>{v} WPM · {ru(fees[v])}</option>)}</select>
    <button className="del" onClick={()=>setF({...f,subjects:f.subjects.filter((_,j)=>j!==i)})}>Remove</button></div>)}
   {f.subjects.length<2&&<button className="ghost" onClick={()=>setF({...f,subjects:[...f.subjects,{name:f.subjects[0]?.name==='English'?'Marathi':'English',speed:30}]})}>Add subject</button>}
   <p>Total {ru(tot)} · Pending <b className="pend">{ru(tot-f.paid)}</b></p><div className="bar"><button onClick={save}>Save student</button><button className="ghost" onClick={()=>setF(null)}>Cancel</button></div></div>}
  <div className="tw"><table><thead><tr><th>Name</th><th>Batch</th><th>Timing</th><th>Subjects</th><th>Total</th><th>Paid</th><th>Pending</th><th></th></tr></thead><tbody>
   {list.map(s=><tr key={s._id}><td>{s.name}<br/><small>{s.mobile}</small></td><td>{s.batch?.name}</td><td>{s.timing}</td><td>{s.subjects.map(x=>x.name+' '+x.speed).join(', ')}</td><td>{ru(s.total)}</td><td>{ru(s.paid)}</td>
   <td className={s.pending>0?'pend':'clear'}>{s.pending>0?ru(s.pending):'Cleared'}</td><td>{s.mobile&&<button className="ghost" style={{color:'#25D366',padding:'4px 8px',marginRight:4}} title="Open WhatsApp" onClick={()=>{const n=s.mobile.replace(/[^0-9]/g,'');const num=n.length===10?'91'+n:n;const text=encodeURIComponent(`Dear ${s.name}, your pending fee is ${ru(s.pending)}. Please clear it at DISHA Typing Institute.`);window.open('https://wa.me/'+num+'?text='+text,'_blank')}}>💬</button>}<button className="ghost" onClick={()=>setF(s)}>Edit</button><button className="del" onClick={async()=>{if(confirm('Delete '+s.name+'?')){await api('/students/'+s._id,{method:'DELETE'});reload()}}}>Delete</button></td></tr>)}</tbody></table>
   {!list.length&&<div className="empty">No students here yet. Add the first one.</div>}</div></>}
function Notify({students}){const [s,setS]=useState(''),[sub,setSub]=useState('Fee reminder'),[msg,setMsg]=useState(''),[st,setSt]=useState(''),[busy,setBusy]=useState(false);
 const pick=students.find(x=>x._id===s);
 const formatMobile=m=>{let n=String(m||'').replace(/[^0-9]/g,'');return n.length===10?'91'+n:n};
 const sendEmail=async()=>{setBusy(true);setSt('');try{await api('/notify',{method:'POST',body:{student:s,subject:sub,message:msg}});setSt('Sent email to '+pick.email)}catch(x){setSt(x.message)}finally{setBusy(false)}};
 const sendTwilio=async()=>{setBusy(true);setSt('');try{await api('/notify/whatsapp',{method:'POST',body:{student:s,message:msg}});setSt('Sent WhatsApp to '+pick.mobile+' via Twilio')}catch(x){setSt(x.message)}finally{setBusy(false)}};
 const openDirectWA=()=>{if(!pick?.mobile)return setSt('No mobile number saved for this student');const num=formatMobile(pick.mobile);window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank');setSt('Opened WhatsApp chat with '+pick.name+' ('+pick.mobile+')')};
 return <><h2>Notifications</h2><div className="card">
  <label>Student<select value={s} onChange={e=>{const id=e.target.value;setS(id);setSt('');const t=students.find(x=>x._id===id);if(t)setMsg(`Dear ${t.name}, your pending fee is ${ru(t.pending)}. Please clear it at the institute. - DISHA Computer Typing Institute`)}}><option value="">Choose a student</option>{students.map(x=><option key={x._id} value={x._id}>{x.name} {x.mobile?`(${x.mobile})`:''} - Pending: {ru(x.pending)}</option>)}</select></label>
  {pick&&<div style={{background:'rgba(255,255,255,0.04)',padding:'8px 12px',borderRadius:6,marginBottom:12,fontSize:13,display:'flex',gap:16,flexWrap:'wrap'}}><span>📱 Mobile: <b>{pick.mobile||'None'}</b></span><span>✉️ Email: <b>{pick.email||'None'}</b></span><span>💰 Pending: <b className={pick.pending>0?'pend':'clear'}>{ru(pick.pending)}</b></span></div>}
  <label>Subject (for email)<input value={sub} onChange={e=>setSub(e.target.value)}/></label><label>Message<textarea rows="5" value={msg} onChange={e=>setMsg(e.target.value)}/></label>
  <p className={st.startsWith('Sent')||st.startsWith('Opened')?'ok':'err'}>{st}</p>
  <div className="btn-group">
   <button className="wa" type="button" disabled={!pick||!pick.mobile} onClick={openDirectWA}>💬 Open in WhatsApp (Direct)</button>
   <button className="wa" type="button" style={{background:'#128C7E'}} disabled={!pick||!pick.mobile||busy} onClick={sendTwilio}>{busy?'Sending…':'⚡ Send WhatsApp via Twilio'}</button>
   <button type="button" disabled={!pick||!pick.email||busy} onClick={sendEmail}>{busy?'Sending…':'✉️ Send Email'}</button>
  </div></div></>}
function Docs({students}){const [pin,setPin]=useState(''),[open,setOpen]=useState(!!DOC),[kind,setKind]=useState('results'),[docs,setDocs]=useState([]),[st,setSt]=useState(''),[s,setS]=useState('');
 const load=useCallback(()=>api('/docs?kind='+kind).then(setDocs).catch(x=>{setSt(x.message);DOC='';setOpen(false)}),[kind]);useEffect(()=>{open&&load()},[open,load]);
 if(!open)return <><h2>Private documents</h2><div className="card" style={{maxWidth:360}}><label>Documents PIN<input type="password" value={pin} onChange={e=>setPin(e.target.value)}/></label><p className="err">{st}</p>
  <button onClick={async()=>{try{DOC=(await api('/docs/unlock',{method:'POST',body:{pin}})).token;setOpen(true);setSt('')}catch(x){setSt(x.message)}}}>Unlock</button></div></>;
 const view=async d=>{const b=await api('/docs/'+d._id+'/file',{blob:true});window.open(URL.createObjectURL(b))};
 return <><h2>Private documents</h2><div className="bar"><select value={kind} onChange={e=>setKind(e.target.value)}><option value="results">Results</option><option value="certificates">Certificates</option></select>
  <select value={s} onChange={e=>setS(e.target.value)}><option value="">Choose student for upload</option>{students.map(x=><option key={x._id} value={x._id}>{x.name} ({x.batch?.name})</option>)}</select>
  <input type="file" accept="application/pdf" disabled={!s} onChange={async e=>{const fd=new FormData();fd.append('kind',kind);fd.append('student',s);fd.append('file',e.target.files[0]);try{await api('/docs',{method:'POST',body:fd});load()}catch(x){setSt(x.message)}e.target.value=''}}/></div><p className="err">{st}</p>
  <table><thead><tr><th>Student</th><th>Batch</th><th>File</th><th></th></tr></thead><tbody>{docs.map(d=><tr key={d._id}><td>{d.student?.name}</td><td>{d.batch?.name}</td><td>{d.original}</td>
  <td><button className="ghost" onClick={()=>view(d)}>Open PDF</button><button className="del" onClick={async()=>{if(confirm('Delete this PDF?')){await api('/docs/'+d._id,{method:'DELETE'});load()}}}>Delete</button></td></tr>)}</tbody></table>
  {!docs.length&&<div className="empty">No {kind} uploaded yet.</div>}<button className="ghost" onClick={()=>{DOC='';setOpen(false)}}>Lock documents</button></>}
export default function App(){const [u,setU]=useState(TOKEN?{}:null),[tab,setTab]=useState('home'),[batches,setBatches]=useState([]),[students,setStudents]=useState([]),[fees,setFees]=useState({30:7000,40:5000,50:5000});
 const out=useCallback(()=>{TOKEN='';DOC='';sessionStorage.clear();setU(null)},[]);
 const reload=useCallback(async()=>{try{const[b,s,f]=await Promise.all([api('/batches'),api('/students'),api('/fees')]);setBatches(b);setStudents(s);setFees(f)}catch{out()}},[out]);
 useEffect(()=>{u&&reload()},[u,reload]);
 useEffect(()=>{if(!u)return;let t;const r=()=>{clearTimeout(t);t=setTimeout(out,15*60e3)};r();const ev=['click','keydown','mousemove'];ev.forEach(e=>addEventListener(e,r));return()=>{clearTimeout(t);ev.forEach(e=>removeEventListener(e,r))}},[u,out]);
 if(!u)return <Login onIn={setU}/>;
 const T=[['home','Home'],['students','Students'],['fees','Fees'],['notify','Notifications'],['docs','Private documents']];
 return <div className="shell"><nav><div className="brand">DISHA</div>{T.map(([k,l])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{l}</button>)}<div className="sp"/><button onClick={out}>Log out</button></nav>
  <main>{tab==='home'&&<Home batches={batches} students={students}/>}{(tab==='students'||tab==='fees')&&<Students key={tab} mode={tab} {...{batches,fees,reload,students}}/>}
  {tab==='notify'&&<Notify students={students}/>}{tab==='docs'&&<Docs students={students}/>}</main></div>}
