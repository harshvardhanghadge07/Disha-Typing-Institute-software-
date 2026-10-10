import {useState,useEffect,useCallback,lazy,Suspense,useRef} from 'react';
const Scene=lazy(()=>import('./Scenes.jsx'));
let TOKEN=sessionStorage.getItem('t')||'',DOC='';
const getApiBaseUrl=()=>{
 const customUrl=localStorage.getItem('disha_api_url');
 if(customUrl)return customUrl.replace(/\/$/,'');
 if(typeof window!=='undefined'&&window.location){
  if(window.location.protocol==='http:'||window.location.protocol==='https:'){
   return '';
  }
  if(window.Capacitor||window.location.protocol==='capacitor:'||window.location.protocol==='file:'){
   return (localStorage.getItem('disha_mobile_server_ip')||'http://10.141.172.221:5000').replace(/\/$/,'');
  }
 }
 return '';
};
const api=async(p,o={})=>{
 const h={Authorization:'Bearer '+TOKEN,'x-doc-token':DOC};
 if(!(o.body instanceof FormData)&&o.body){h['Content-Type']='application/json';o.body=JSON.stringify(o.body)}
 const baseUrl=getApiBaseUrl();
 const r=await fetch(baseUrl+'/api'+p,{...o,headers:h});
 if(o.blob&&r.ok)return r.blob();
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||'Something went wrong.');
 return j;
};

const ru=n=>'₹'+(n||0).toLocaleString('en-IN');
const Stage=({kind})=><div className="stage"><Suspense fallback={null}><Scene kind={kind}/></Suspense></div>;

function ForgotPassword({onBack}){
  const [e,setE]=useState('');
  const [msg,setMsg]=useState('');
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);
  const [mode,setMode]=useState('email');
  const [pin,setPin]=useState('');
  const [p,setP]=useState('');
  const [p2,setP2]=useState('');

  const sendEmail=async ev=>{
    ev.preventDefault();
    setLoading(true);setErr('');setMsg('');
    try{
      const r=await api('/forgot-password',{method:'POST',body:{email:e}});
      if(r.requiresPin) {
        setMode('pin');
        setMsg('SMTP email server is not configured. Enter the Institute Security PIN below to reset your password immediately.');
      } else {
        setMsg('Reset link sent! Check your email inbox (and spam folder).');
      }
    }catch(x){
      setErr(x.message);
    }finally{
      setLoading(false);
    }
  };

  const resetWithPin=async ev=>{
    ev.preventDefault();
    setErr('');
    if(p.length < 6) return setErr('New password must be at least 6 characters.');
    if(p !== p2) return setErr('Passwords do not match.');
    setLoading(true);
    try{
      await api('/reset-password-pin',{method:'POST',body:{email:e, pin, password:p}});
      setMsg('Password reset successfully! You can now log in with your new password.');
      setMode('done');
    }catch(x){
      setErr(x.message);
    }finally{
      setLoading(false);
    }
  };

  return <div className="login"><Stage kind="pc"/><form onSubmit={mode==='pin'?resetWithPin:sendEmail}>
    <h1>DISHA Typing Institute</h1>
    {mode==='email' && <>
      <p>Enter your account email to receive a password reset link or reset using PIN.</p>
      <label>Account Email<input type="email" value={e} onChange={x=>setE(x.target.value)} required autoFocus/></label>
    </>}

    {mode==='pin' && <>
      <p style={{color:'var(--brass)',fontSize:13,margin:'0 0 12px'}}>{msg || 'Enter your email, Institute Security PIN, and new password below.'}</p>
      <label>Account Email<input type="email" value={e} onChange={x=>setE(x.target.value)} required/></label>
      <label>Institute Security PIN<input type="password" value={pin} onChange={x=>setPin(x.target.value)} placeholder="Default: 123456" required autoFocus/></label>
      <label>New Password<input type="password" value={p} onChange={x=>setP(x.target.value)} minLength={6} required/></label>
      <label>Confirm New Password<input type="password" value={p2} onChange={x=>setP2(x.target.value)} minLength={6} required/></label>
    </>}

    {mode==='done' && <div role="alert" style={{color:'#22c55e',margin:'12px 0',fontSize:14}}>
      {msg}<br/>
      <button type="button" style={{marginTop:12,width:'100%'}} onClick={onBack}>Go to Login →</button>
    </div>}

    {mode!=='done' && <>
      {msg && !err && <div role="alert" style={{color:'#22c55e',margin:'8px 0',fontSize:13}}>{msg}</div>}
      <div className="err" role="alert">{err}</div>
      <button style={{width:'100%'}} disabled={loading}>{loading?'Saving…':(mode==='pin'?'Reset Password Now':'Send Reset Instructions')}</button>
      {mode==='email' && <button type="button" className="ghost" style={{width:'100%',marginTop:8,fontSize:12}} onClick={()=>setMode('pin')}>
        ⚡ Reset using Institute Security PIN instead
      </button>}
    </>}

    {mode!=='done' && <button type="button" className="ghost" style={{width:'100%',marginTop:8}} onClick={onBack}>← Back to login</button>}
  </form></div>;
}

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

function Login({onIn,onOpenServerModal}){const [e,setE]=useState(''),[p,setP]=useState(''),[err,setErr]=useState(''),[forgot,setForgot]=useState(false);
 const params=new URLSearchParams(window.location.search),resetToken=params.get('token');
 if(resetToken)return <ResetPassword token={resetToken}/>;
 if(forgot)return <ForgotPassword onBack={()=>setForgot(false)}/>;
 const go=async ev=>{ev.preventDefault();try{const r=await api('/login',{method:'POST',body:{email:e,password:p}});TOKEN=r.token;sessionStorage.setItem('t',TOKEN);onIn(r)}catch(x){setErr(x.message)}};
 return <div className="login"><Stage kind="pc"/><form onSubmit={go}><h1>DISHA Typing Institute</h1><p>Staff login. Student records are private.</p>
  <label>Email<input type="email" value={e} onChange={x=>setE(x.target.value)} required autoFocus/></label>
  <label>Password<input type="password" value={p} onChange={x=>setP(x.target.value)} required/></label>
  <div className="err" role="alert">{err}</div><button style={{width:'100%'}}>Log in</button>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
   <button type="button" className="ghost" style={{fontSize:13}} onClick={()=>setForgot(true)}>Forgot password?</button>
   {onOpenServerModal&&<button type="button" className="ghost" style={{fontSize:12,color:'var(--brass)'}} onClick={onOpenServerModal}>⚙️ Server IP</button>}
  </div>
 </form></div>}

function CloudRestoreBanner({cloudCheck, onRestore, onDismiss}){
  if(!cloudCheck?.hasCloudBackups || !cloudCheck?.isEmptyDatabase) return null;
  const b = cloudCheck.latestBackup;
  return <div className="restore-banner">
    <div>
      <b>☁️ Cloud Backup Snapshot Found!</b>
      <p style={{margin:'4px 0 0',fontSize:13,color:'var(--mute)'}}>
        Saved under <strong>{b?.userEmail||'your account'}</strong> on {new Date(b?.createdAt).toLocaleDateString()} with <strong>{b?.totalStudents} students</strong> and <strong>{b?.totalBatches} batches</strong>.
      </p>
    </div>
    <div style={{display:'flex',gap:8}}>
      <button onClick={()=>onRestore(b._id)}>🔄 Restore All Data Now</button>
      <button className="ghost" onClick={onDismiss}>Dismiss</button>
    </div>
  </div>;
}

function Home({batches,students,cloudCheck,onRestoreCloud,onDismissBanner}){
 const [searchQuery, setSearchQuery] = useState('');
 const pend=students.reduce((t,s)=>t+s.pending,0);

 const batchStats = batches.map(b => {
   const bStudents = students.filter(s => s.batch?._id === b._id);
   const bTotalStudents = bStudents.length;
   const bPendingStudents = bStudents.filter(s => (s.pending || 0) > 0).length;
   const bPaidTotal = bStudents.reduce((sum, s) => sum + (s.paid || 0), 0);
   const bTotalFees = bStudents.reduce((sum, s) => sum + (s.total || 0), 0);
   const bPendingFees = bStudents.reduce((sum, s) => sum + (s.pending || 0), 0);
   const percent = bTotalFees > 0 ? Math.round((bPaidTotal / bTotalFees) * 100) : 100;
   return {
     _id: b._id,
     name: b.name,
     start: b.start,
     totalStudents: bTotalStudents,
     pendingStudents: bPendingStudents,
     paidTotal: bPaidTotal,
     totalFees: bTotalFees,
     pendingFees: bPendingFees,
     percent
   };
 });

 const unassigned = students.filter(s => !s.batch?._id);
 if (unassigned.length > 0) {
   const uTotalStudents = unassigned.length;
   const uPendingStudents = unassigned.filter(s => (s.pending || 0) > 0).length;
   const uPaidTotal = unassigned.reduce((sum, s) => sum + (s.paid || 0), 0);
   const uTotalFees = unassigned.reduce((sum, s) => sum + (s.total || 0), 0);
   const uPendingFees = unassigned.reduce((sum, s) => sum + (s.pending || 0), 0);
   const percent = uTotalFees > 0 ? Math.round((uPaidTotal / uTotalFees) * 100) : 100;
   batchStats.push({
     _id: 'unassigned',
     name: 'Unassigned / General',
     totalStudents: uTotalStudents,
     pendingStudents: uPendingStudents,
     paidTotal: uPaidTotal,
     totalFees: uTotalFees,
     pendingFees: uPendingFees,
     percent
   });
 }

 const filteredBatchStats = batchStats.filter(b => 
   !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return <><CloudRestoreBanner cloudCheck={cloudCheck} onRestore={onRestoreCloud} onDismiss={onDismissBanner}/>
  <div className="hero"><div><h1>Every batch, typed up neatly.</h1><p>Manage 6-month batches, fees, automated reminders, cloud backups and certificates for DISHA Computer Typing Institute.</p>
  <div className="stats"><div className="stat"><b>{batches.length}</b>Batches</div><div className="stat"><b>{students.length}</b>Students</div><div className="stat"><b>{ru(pend)}</b>Fees pending</div></div></div>
  <Stage kind="tw"/></div>

  <div className="card" style={{marginTop:24}}>
    <div style={{display:'flex',justify:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:16}}>
      <div>
        <h3 style={{fontSize:18,color:'var(--brass)',margin:0}}>📊 Batchwise Fees & Dues Overview</h3>
        <p style={{margin:'4px 0 0',color:'var(--mute)',fontSize:13}}>Real-time pending fee breakdown for every active batch at DISHA Typing Institute.</p>
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <input 
          placeholder="🔍 Search batch name…" 
          value={searchQuery} 
          onChange={e=>setSearchQuery(e.target.value)} 
          style={{maxWidth:220,padding:'6px 10px',fontSize:13}}
        />
        <span className="status-badge pending" style={{fontSize:13,padding:'4px 12px'}}>
          Total Pending: {ru(pend)}
        </span>
      </div>
    </div>

    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>Batch Name</th>
            <th>Enrolled Students</th>
            <th>Students with Dues</th>
            <th>Total Fees</th>
            <th>Collected Fees</th>
            <th>Pending Dues</th>
            <th>Collection Progress</th>
          </tr>
        </thead>
        <tbody>
          {filteredBatchStats.map(b => (
            <tr key={b._id}>
              <td><strong>{b.name}</strong></td>
              <td>{b.totalStudents} students</td>
              <td>{b.pendingStudents > 0 ? <span className="pend">{b.pendingStudents} pending</span> : <span className="clear">All cleared</span>}</td>
              <td>{ru(b.totalFees)}</td>
              <td>{ru(b.paidTotal)}</td>
              <td className={b.pendingFees > 0 ? 'pend' : 'clear'}>{ru(b.pendingFees)}</td>
              <td style={{minWidth:140}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div className="progress-bar" style={{flex:1,margin:0}}>
                    <div className="progress-fill" style={{width: `${b.percent}%`, background: b.percent === 100 ? 'var(--teal)' : 'var(--brass)'}}/>
                  </div>
                  <span style={{fontSize:12,color:'var(--mute)',width:36}}>{b.percent}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!batchStats.length && <div className="empty">No batch records found.</div>}
    </div>
  </div>
 </>;
}

const blank={name:'',mobile:'',email:'',timing:'',subjects:[{name:'English',speed:30}],paid:0};
function Students({batches,fees,subjects=['English','Marathi','Hindi','GCC-TBC'],reload,students,mode}){
 const [b,setB]=useState(''),[q,setQ]=useState(''),[f,setF]=useState(null),[nb,setNb]=useState(''),[newSub,setNewSub]=useState('');
 const [feeInputs, setFeeInputs] = useState(fees || {30:7000, 40:5000, 50:5000, 3000:3000});

 useEffect(() => {
   if (fees) setFeeInputs(fees);
 }, [fees]);

 const list=students.filter(s=>(!b||s.batch?._id===b)&&(!q||[s.name,s.mobile,s.email].join(' ').toLowerCase().includes(q.toLowerCase())));
 const tot=f?f.subjects.reduce((t,s)=>t+(fees[s.speed] !== undefined ? Number(fees[s.speed]) : (s.speed == 3000 ? 3000 : 0)), 0):0;
 const save=async()=>{try{const body={...f,batch:f.batch||b||batches[0]?._id,paid:+f.paid};f._id?await api('/students/'+f._id,{method:'PUT',body}):await api('/students',{method:'POST',body});setF(null);reload()}catch(x){alert(x.message)}};
 const sub=(i,k,v)=>setF({...f,subjects:f.subjects.map((s,j)=>j===i?{...s,[k]:k==='speed'?+v:v}:s)});

 const handleAddSubject = async (e) => {
   e?.preventDefault();
   if (!newSub.trim()) return alert('Please enter a subject name');
   try {
     await api('/subjects', { method: 'POST', body: { name: newSub.trim() } });
     setNewSub('');
     await reload();
   } catch (x) { alert(x.message); }
 };

 const handleDeleteSubject = async (name) => {
   if (!confirm(`Remove subject "${name}" from institute registry?`)) return;
   try {
     await api('/subjects/' + encodeURIComponent(name), { method: 'DELETE' });
     await reload();
   } catch (x) { alert(x.message); }
 };

 const handleSaveFees = async () => {
   try {
     await api('/fees', { method: 'PUT', body: feeInputs });
     alert('Institute Fee Rules updated successfully!');
     await reload();
   } catch (x) {
     alert('Failed to save fees: ' + x.message);
   }
 };

 // Available fee options ensuring 30, 40, 50, 3000 are present
 const feeOptionsList = { ...fees, 3000: fees[3000] || 3000 };

 return <>
  <h2>{mode==='fees'?'Fees & Subject Management':'Students'}</h2>

  {mode==='fees' && <>
    <div className="card" style={{marginBottom:20}}>
      <h3 style={{fontSize:17,color:'var(--brass)',marginBottom:8}}>💰 Manage Institute Fee Structure & Rates</h3>
      <p style={{fontSize:13,color:'var(--mute)',margin:'0 0 12px'}}>Set standard course fee rates for typing speed levels and flat fee options (e.g. ₹3,000).</p>
      <div className="grid" style={{marginBottom:14}}>
        {Object.entries(feeInputs).map(([k, v]) => (
          <label key={k}>
            {['30','40','50'].includes(String(k)) ? `${k} WPM Fee (₹)` : `Fee Option ₹${k} (₹)`}
            <input
              type="number"
              min="0"
              value={v}
              onChange={e => setFeeInputs({ ...feeInputs, [k]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <button onClick={handleSaveFees}>💾 Save Fee Rates</button>
    </div>

    <div className="card" style={{marginBottom:20}}>
      <h3 style={{fontSize:17,color:'var(--brass)',marginBottom:8}}>📚 Manage Institute Typing Subjects</h3>
      <p style={{fontSize:13,color:'var(--mute)',margin:'0 0 12px'}}>Add custom subjects (e.g. English, Marathi, Hindi, GCC-TBC, Shorthand) to offer at your institute.</p>
      <div className="chip-bar" style={{marginBottom:14}}>
        {subjects.map(s => <span key={s} className="chip-btn" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',fontSize:13}}>
          {s} <button type="button" style={{background:'none',border:0,color:'var(--bad)',padding:0,cursor:'pointer',fontWeight:700}} onClick={()=>handleDeleteSubject(s)}>✕</button>
        </span>)}
      </div>
      <form onSubmit={handleAddSubject} className="bar" style={{maxWidth:480,margin:0}}>
        <input placeholder="New subject name (e.g. Hindi, GCC-TBC)" value={newSub} onChange={e=>setNewSub(e.target.value)}/>
        <button type="submit">+ Add Subject</button>
      </form>
    </div>
  </>}

  <div className="bar">
    <select value={b} onChange={e=>setB(e.target.value)}><option value="">All batches</option>{batches.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select>
    <input placeholder="Search name, mobile or email" value={q} onChange={e=>setQ(e.target.value)}/>
    <button onClick={()=>setF({...blank,batch:b,subjects:[{name:subjects[0]||'English',speed:30}]})}>Add student</button>
  </div>

  <div className="bar">
    <input placeholder="New batch, e.g. June 2028" value={nb} onChange={e=>setNb(e.target.value)}/>
    <button className="ghost" onClick={async()=>{const d=new Date('1 '+nb);if(isNaN(d))return alert('Use a format like June 2028');await api('/batches',{method:'POST',body:{name:nb,start:d.toISOString().slice(0,7)}});setNb('');reload()}}>Create batch</button>
  </div>

  {f&&<div className="card">
    <h3>{f._id?'Edit student':'New student'}</h3>
    <div className="grid" style={{marginTop:14}}>
      {[['name','Full name'],['mobile','Mobile number'],['email','Email address'],['timing','Practice timing']].map(([k,l])=><label key={k}>{l}<input value={f[k]||''} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}
      <label>Batch<select value={f.batch?._id||f.batch||b||batches[0]?._id} onChange={e=>setF({...f,batch:e.target.value})}>{batches.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></label>
      <label>Fees paid (₹)<input type="number" min="0" value={f.paid} onChange={e=>setF({...f,paid:e.target.value})}/></label>
    </div>

    <label style={{fontWeight:600,color:'var(--text)',marginBottom:6}}>Enrolled Subjects & Fee Option</label>
    {f.subjects.map((s,i)=><div className="bar" key={i}>
      <select value={s.name} onChange={async e=>{
        const val = e.target.value;
        if (val === '__custom__') {
          const customName = prompt('Enter new subject name (e.g. Hindi, GCC-TBC, Shorthand):');
          if (customName && customName.trim()) {
            await api('/subjects', { method: 'POST', body: { name: customName.trim() } });
            sub(i, 'name', customName.trim());
            await reload();
          }
        } else {
          sub(i, 'name', val);
        }
      }}>
        {subjects.map(subName => <option key={subName} value={subName}>{subName}</option>)}
        {!subjects.includes(s.name) && <option value={s.name}>{s.name}</option>}
        <option value="__custom__">+ Add Custom Subject Name…</option>
      </select>
      <select value={s.speed} onChange={e=>sub(i,'speed',e.target.value)}>
        {Object.entries(feeOptionsList).map(([vKey, vVal]) => {
          const label = ['30','40','50'].includes(String(vKey)) ? `${vKey} WPM · ${ru(vVal)}` : ru(vVal);
          return <option key={vKey} value={vKey}>{label}</option>;
        })}
      </select>
      <button type="button" className="del" onClick={()=>setF({...f,subjects:f.subjects.filter((_,j)=>j!==i)})}>Remove</button>
    </div>)}

    <button type="button" className="ghost" style={{marginBottom:14}} onClick={()=>setF({...f,subjects:[...f.subjects,{name:subjects[0]||'English',speed:30}]})}>+ Add Subject</button>

    <p>Total {ru(tot)} · Pending <b className="pend">{ru(tot-f.paid)}</b></p>
    <div className="bar"><button onClick={save}>Save student</button><button className="ghost" onClick={()=>setF(null)}>Cancel</button></div>
  </div>}

  <div className="tw"><table><thead><tr><th>Name</th><th>Batch</th><th>Timing</th><th>Subjects & Option</th><th>Total</th><th>Paid</th><th>Pending</th><th></th></tr></thead><tbody>
   {list.map(s=><tr key={s._id}>
     <td>{s.name}<br/><small>{s.mobile}</small></td>
     <td>{s.batch?.name}</td>
     <td>{s.timing}</td>
     <td>{s.subjects.map(x=>x.name+' '+(['30','40','50'].includes(String(x.speed))?x.speed+' WPM':ru(x.speed))).join(', ')}</td>
     <td>{ru(s.total)}</td>
     <td>{ru(s.paid)}</td>
     <td className={s.pending>0?'pend':'clear'}>{s.pending>0?ru(s.pending):'Cleared'}</td>
     <td>{s.mobile&&<button className="ghost" style={{color:'#25D366',padding:'4px 8px',marginRight:4}} title="Open WhatsApp" onClick={()=>{const n=s.mobile.replace(/[^0-9]/g,'');const num=n.length===10?'91'+n:n;const text=encodeURIComponent(`Dear ${s.name}, your pending fee is ${ru(s.pending)}. Please clear it at DISHA Typing Institute.`);window.open('https://wa.me/'+num+'?text='+text,'_blank')}}>💬</button>}<button className="ghost" onClick={()=>setF(s)}>Edit</button><button className="del" onClick={async()=>{if(confirm('Delete '+s.name+'?')){await api('/students/'+s._id,{method:'DELETE'});reload()}}}>Delete</button></td>
   </tr>)}</tbody></table>
   {!list.length&&<div className="empty">No students here yet. Add the first one.</div>}</div></>;
}

function Notify({batches, students}){
  const [subTab,setSubTab]=useState('batch');
  const [s,setS]=useState(''),[sub,setSub]=useState('Fee reminder'),[msg,setMsg]=useState(''),[st,setSt]=useState(''),[busy,setBusy]=useState(false);
  const [selectedBatch,setSelectedBatch]=useState('');
  const [pendingOnly,setPendingOnly]=useState(true);
  const [batchTemplate,setBatchTemplate]=useState('Dear {name}, your pending fee for DISHA Typing Institute ({batch} batch) is {pending}. (Total: {total}, Paid: {paid}). Kindly clear your balance at the earliest. Thank you!');
  const [emailSubject,setEmailSubject]=useState('Fee Reminder — DISHA Computer Typing Institute');
  const [previewList,setPreviewList]=useState([]);
  const [batchStatus,setBatchStatus]=useState('');
  const [batchResults,setBatchResults]=useState(null);
  const [sentStatuses,setSentStatuses]=useState({});

  const formatMobile=m=>{let n=String(m||'').replace(/[^0-9]/g,'');return n.length===10?'91'+n:n};

  const loadBatchPreview = useCallback(async()=>{
    try{
      const res = await api('/notify/batch-preview', {
        method:'POST',
        body:{ batch: selectedBatch, pendingOnly, template: batchTemplate }
      });
      setPreviewList(res.students||[]);
    } catch(x){
      setBatchStatus(x.message);
    }
  }, [selectedBatch, pendingOnly, batchTemplate]);

  useEffect(()=>{
    if(subTab==='batch') loadBatchPreview();
  }, [subTab, loadBatchPreview]);

  const insertChip = chip => setBatchTemplate(prev => prev + ' ' + chip);

  const applyPreset = preset => {
    if(preset==='std') setBatchTemplate('Dear {name}, your pending fee for DISHA Typing Institute ({batch} batch) is {pending}. (Total: {total}, Paid: {paid}). Kindly clear your balance at the earliest. Thank you!');
    if(preset==='urg') setBatchTemplate('URGENT FEE NOTICE: Dear {name}, your pending balance of {pending} for your {batch} batch typing course is past due. Please settle your dues today.');
    if(preset==='short') setBatchTemplate('Hi {name}! Friendly balance reminder from DISHA Typing Institute ({batch}): your remaining pending fee is {pending}. Thank you!');
  };

  const openSingleWA = (student) => {
    if(!student.mobile) return alert('No mobile number saved for ' + student.name);
    const num = formatMobile(student.mobile);
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(student.message), '_blank');
    setSentStatuses(prev => ({...prev, [student._id]: 'Opened WhatsApp'}));
  };

  const runBatchSend = async (channel) => {
    setBusy(true); setBatchStatus(''); setBatchResults(null);
    try {
      const res = await api('/notify/batch-send', {
        method: 'POST',
        body: { batch: selectedBatch, pendingOnly, template: batchTemplate, channel, subject: emailSubject }
      });
      setBatchResults(res);
      setBatchStatus(`Successfully processed ${channel==='twilio'?'WhatsApp':'Email'} messages: ${res.sentCount} sent, ${res.failCount} failed.`);
    } catch(x) {
      setBatchStatus(x.message);
    } finally {
      setBusy(false);
    }
  };

  const pick=students.find(x=>x._id===s);
  const sendEmail=async()=>{setBusy(true);setSt('');try{await api('/notify',{method:'POST',body:{student:s,subject:sub,message:msg}});setSt('Sent email to '+pick.email)}catch(x){setSt(x.message)}finally{setBusy(false)}};
  const sendTwilio=async()=>{setBusy(true);setSt('');try{await api('/notify/whatsapp',{method:'POST',body:{student:s,message:msg}});setSt('Sent WhatsApp to '+pick.mobile+' via Twilio')}catch(x){setSt(x.message)}finally{setBusy(false)}};
  const openDirectWA=()=>{if(!pick?.mobile)return setSt('No mobile number saved for this student');const num=formatMobile(pick.mobile);window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank');setSt('Opened WhatsApp chat with '+pick.name+' ('+pick.mobile+')')};

  const totalPendingSum = previewList.reduce((t, x) => t + (x.pending || 0), 0);

  return <>
    <h2>Notifications & Fee Reminders</h2>
    <div className="subnav">
      <button className={subTab==='batch'?'active':''} onClick={()=>setSubTab('batch')}>📢 Batch Fee Reminders ("Send to All")</button>
      <button className={subTab==='single'?'active':''} onClick={()=>setSubTab('single')}>👤 Single Student Message</button>
    </div>

    {subTab==='batch' && <div className="card">
      <div className="grid">
        <label>Select Batch
          <select value={selectedBatch} onChange={e=>setSelectedBatch(e.target.value)}>
            <option value="">All Batches</option>
            {batches.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}
          </select>
        </label>
        <label style={{display:'flex',alignItems:'center',gap:8,marginTop:22,cursor:'pointer'}}>
          <input type="checkbox" checked={pendingOnly} onChange={e=>setPendingOnly(e.target.checked)} style={{width:'auto'}}/>
          <span>Send only to students with pending fees (&gt; ₹0)</span>
        </label>
      </div>

      <div style={{background:'rgba(212, 162, 76, 0.08)',border:'1px solid var(--line)',borderRadius:8,padding:'10px 14px',margin:'12px 0',display:'flex',justify:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <span>Found <strong>{previewList.length} students</strong> matching target batch</span>
        <span>Total Pending Balance: <strong className="pend">{ru(totalPendingSum)}</strong></span>
      </div>

      <label>Personalized Message Template
        <textarea rows="4" value={batchTemplate} onChange={e=>setBatchTemplate(e.target.value)}/>
      </label>

      <div style={{fontSize:12,color:'var(--mute)',marginBottom:4}}>Click placeholder tag to insert:</div>
      <div className="chip-bar">
        {['{name}', '{pending}', '{paid}', '{total}', '{batch}', '{timing}'].map(chip=>
          <button key={chip} type="button" className="chip-btn" onClick={()=>insertChip(chip)}>+ {chip}</button>
        )}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontSize:12,color:'var(--mute)'}}>Presets:</span>
        <button type="button" className="ghost" style={{fontSize:12,padding:'3px 8px'}} onClick={()=>applyPreset('std')}>Standard Fee Reminder</button>
        <button type="button" className="ghost" style={{fontSize:12,padding:'3px 8px'}} onClick={()=>applyPreset('urg')}>Urgent Dues Notice</button>
        <button type="button" className="ghost" style={{fontSize:12,padding:'3px 8px'}} onClick={()=>applyPreset('short')}>Short WhatsApp</button>
      </div>

      {previewList.length > 0 && <div className="preview-card">
        <h4>Live Personalized Message Preview (Student #1: {previewList[0]?.name})</h4>
        <p>{previewList[0]?.message}</p>
      </div>}

      <div style={{margin:'20px 0 10px'}}>
        <label>Email Subject (for bulk email channel)
          <input value={emailSubject} onChange={e=>setEmailSubject(e.target.value)}/>
        </label>
      </div>

      {batchStatus && <p className={batchStatus.includes('Successfully')?'ok':'err'}>{batchStatus}</p>}

      <div className="btn-group">
        <button className="wa" type="button" style={{background:'#128C7E'}} disabled={!previewList.length || busy} onClick={()=>runBatchSend('twilio')}>
          {busy?'Sending…':'⚡ Send Personalized WhatsApp to All (via Twilio)'}
        </button>
        <button type="button" disabled={!previewList.length || busy} onClick={()=>runBatchSend('email')}>
          {busy?'Sending…':'✉️ Send Personalized Email to All (via SMTP)'}
        </button>
      </div>

      <h3 style={{margin:'24px 0 12px',fontSize:16}}>Student Batch Message Queue ({previewList.length} Students)</h3>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Mobile</th>
              <th>Batch</th>
              <th>Pending Fee</th>
              <th>Personalized Message</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {previewList.map(item => <tr key={item._id}>
              <td><strong>{item.name}</strong></td>
              <td>{item.mobile || <span style={{color:'var(--bad)'}}>No Mobile</span>}</td>
              <td>{item.batchName}</td>
              <td className="pend">{ru(item.pending)}</td>
              <td style={{maxWidth:280,fontSize:12,whiteSpace:'pre-wrap',color:'var(--mute)'}}>{item.message}</td>
              <td>
                {sentStatuses[item._id] ? <span className="status-badge sent">{sentStatuses[item._id]}</span> :
                <button className="wa" style={{padding:'4px 10px',fontSize:12}} disabled={!item.mobile} onClick={()=>openSingleWA(item)}>
                  💬 WhatsApp
                </button>}
              </td>
            </tr>)}
          </tbody>
        </table>
        {!previewList.length && <div className="empty">No students found matching current filter criteria.</div>}
      </div>
    </div>}

    {subTab==='single' && <div className="card">
      <label>Student<select value={s} onChange={e=>{const id=e.target.value;setS(id);setSt('');const t=students.find(x=>x._id===id);if(t)setMsg(`Dear ${t.name}, your pending fee is ${ru(t.pending)}. Please clear it at the institute. - DISHA Computer Typing Institute`)}}><option value="">Choose a student</option>{students.map(x=><option key={x._id} value={x._id}>{x.name} {x.mobile?`(${x.mobile})`:''} - Pending: {ru(x.pending)}</option>)}</select></label>
      {pick&&<div style={{background:'rgba(255,255,255,0.04)',padding:'8px 12px',borderRadius:6,marginBottom:12,fontSize:13,display:'flex',gap:16,flexWrap:'wrap'}}><span>📱 Mobile: <b>{pick.mobile||'None'}</b></span><span>✉️ Email: <b>{pick.email||'None'}</b></span><span>💰 Pending: <b className={pick.pending>0?'pend':'clear'}>{ru(pick.pending)}</b></span></div>}
      <label>Subject (for email)<input value={sub} onChange={e=>setSub(e.target.value)}/></label><label>Message<textarea rows="5" value={msg} onChange={e=>setMsg(e.target.value)}/></label>
      <p className={st.startsWith('Sent')||st.startsWith('Opened')?'ok':'err'}>{st}</p>
      <div className="btn-group">
       <button className="wa" type="button" disabled={!pick||!pick.mobile} onClick={openDirectWA}>💬 Open in WhatsApp (Direct)</button>
       <button className="wa" type="button" style={{background:'#128C7E'}} disabled={!pick||!pick.mobile||busy} onClick={sendTwilio}>{busy?'Sending…':'⚡ Send WhatsApp via Twilio'}</button>
       <button type="button" disabled={!pick||!pick.email||busy} onClick={sendEmail}>{busy?'Sending…':'✉️ Send Email'}</button>
      </div>
    </div>}
  </>;
}

function CloudBackup({ userEmail, reload }){
  const [backups, setBackups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const fileInputRef = useRef(null);

  const loadBackups = useCallback(async () => {
    try {
      const list = await api('/backup/list');
      setBackups(list || []);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleCreateBackup = async () => {
    setBusy(true); setErrorMsg(''); setStatusMsg('');
    try {
      const res = await api('/backup/create', {
        method: 'POST',
        body: { label: customLabel || undefined }
      });
      setStatusMsg(`Cloud backup created successfully! Saved ${res.backup?.totalStudents} students and ${res.backup?.totalBatches} batches.`);
      setCustomLabel('');
      await loadBackups();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreBackup = async (id) => {
    if (!confirm('Are you sure you want to restore data from this cloud snapshot? Current institute database records will be restored to this exact state.')) return;
    setBusy(true); setErrorMsg(''); setStatusMsg('');
    try {
      const res = await api('/backup/restore/' + id, { method: 'POST' });
      setStatusMsg(`Data restored successfully! Restored ${res.stats?.students} students, ${res.stats?.batches} batches, and ${res.stats?.docs} documents.`);
      await reload();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBackup = async (id) => {
    if (!confirm('Delete this cloud backup snapshot?')) return;
    try {
      await api('/backup/' + id, { method: 'DELETE' });
      await loadBackups();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleExportBackup = (id) => {
    const url = getApiBaseUrl() + '/api/backup/export/' + id;
    window.open(url, '_blank');
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true); setErrorMsg(''); setStatusMsg('');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
        const payload = parsed.payload || text;
        const res = await api('/backup/import', { method: 'POST', body: { payload } });
        setStatusMsg(`Imported file backup successfully! Restored ${res.stats?.students} students, ${res.stats?.batches} batches, and ${res.stats?.docs} documents.`);
        await reload();
        await loadBackups();
      } catch (err) {
        setErrorMsg('Import failed: ' + err.message);
      } finally {
        setBusy(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return <>
    <h2>Cloud Backup & Restore</h2>
    <div className="card">
      <div style={{display:'flex',justify:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:16}}>
        <div>
          <h3 style={{fontSize:18,color:'var(--brass)',margin:0}}>☁️ Secure Cloud Backup System</h3>
          <p style={{margin:'4px 0 0',color:'var(--mute)',fontSize:13}}>
            All institute data (students, fees, batches, documents) is encrypted and linked to account: <strong>{userEmail}</strong>.
            You can reinstall the app or log in on a new device anytime to restore your data.
          </p>
        </div>
        <span className="status-badge sent" style={{fontSize:13,padding:'4px 12px'}}>
          ✓ Auto Cloud Sync Enabled
        </span>
      </div>

      <div className="bar" style={{alignItems:'flex-end'}}>
        <label style={{margin:0,flex:2}}>Backup Label (Optional)
          <input placeholder="e.g. Pre-Exam Snapshot" value={customLabel} onChange={e=>setCustomLabel(e.target.value)}/>
        </label>
        <button disabled={busy} onClick={handleCreateBackup}>
          {busy ? 'Backing up…' : '☁️ Create Cloud Backup Now'}
        </button>
        <button className="ghost" type="button" disabled={busy} onClick={()=>fileInputRef.current?.click()}>
          📤 Import Backup File
        </button>
        <input type="file" ref={fileInputRef} accept=".dishabackup,.json" style={{display:'none'}} onChange={handleImportFile}/>
      </div>

      {statusMsg && <p className="ok" style={{margin:'10px 0',fontWeight:600}}>{statusMsg}</p>}
      {errorMsg && <p className="err" style={{margin:'10px 0'}}>{errorMsg}</p>}
    </div>

    <h3 style={{margin:'20px 0 10px'}}>Available Cloud Snapshots ({backups.length})</h3>
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Label</th>
            <th>Students</th>
            <th>Batches</th>
            <th>Documents</th>
            <th>Account ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {backups.map(b => <tr key={b._id}>
            <td>{new Date(b.createdAt).toLocaleString()}</td>
            <td><strong>{b.label}</strong></td>
            <td>{b.totalStudents}</td>
            <td>{b.totalBatches}</td>
            <td>{b.totalDocs}</td>
            <td><small>{b.userEmail || userEmail}</small></td>
            <td style={{display:'flex',gap:6}}>
              <button style={{padding:'4px 10px',fontSize:12}} disabled={busy} onClick={()=>handleRestoreBackup(b._id)}>
                🔄 Restore
              </button>
              <button className="ghost" style={{padding:'4px 10px',fontSize:12}} onClick={()=>handleExportBackup(b._id)}>
                📥 Download
              </button>
              <button className="del" style={{fontSize:12}} onClick={()=>handleDeleteBackup(b._id)}>
                Delete
              </button>
            </td>
          </tr>)}
        </tbody>
      </table>
      {!backups.length && <div className="empty">No cloud backup snapshots yet. Click "Create Cloud Backup Now" above.</div>}
    </div>
  </>;
}

function Docs({students, batches=[]}){
  const [pin,setPin]=useState(''),[open,setOpen]=useState(!!DOC),[kind,setKind]=useState('results'),[docs,setDocs]=useState([]),[st,setSt]=useState(''),[s,setS]=useState('');
  const [activePdf, setActivePdf] = useState(null);
  const [batchFilter, setBatchFilter] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [docMode, setDocMode] = useState('single');
  const [uploadingStudentId, setUploadingStudentId] = useState(null);

  const load=useCallback(()=>api('/docs?kind='+kind).then(setDocs).catch(x=>{setSt(x.message);DOC='';setOpen(false)}),[kind]);
  useEffect(()=>{open&&load()},[open,load]);

  if(!open)return <><h2>Private documents</h2><div className="card" style={{maxWidth:360}}><label>Documents PIN<input type="password" value={pin} onChange={e=>setPin(e.target.value)}/></label><p className="err">{st}</p>
   <button onClick={async()=>{try{DOC=(await api('/docs/unlock',{method:'POST',body:{pin}})).token;setOpen(true);setSt('')}catch(x){setSt(x.message)}}}>Unlock</button></div></>;

  const viewPdf=async d=>{
    setSt('Loading PDF…');
    try {
      const b=await api('/docs/'+d._id+'/file',{blob:true});
      const blobUrl = URL.createObjectURL(new Blob([b], { type: 'application/pdf' }));
      setActivePdf({ url: blobUrl, filename: d.original || 'document.pdf', doc: d });
      setSt('');
    } catch(x) {
      setSt('Failed to open PDF: ' + x.message);
    }
  };

  const downloadPdf=async d=>{
    try {
      const b=await api('/docs/'+d._id+'/file',{blob:true});
      const blobUrl = URL.createObjectURL(new Blob([b], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = d.original || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch(x) {
      alert('Download failed: ' + x.message);
    }
  };

  const q = docSearch.toLowerCase().trim();

  const filteredStudents = students.filter(stItem => {
    const matchesBatch = !batchFilter || stItem.batch?._id === batchFilter;
    const matchesSearch = !q || [stItem.name, stItem.mobile, stItem.email, stItem.batch?.name].join(' ').toLowerCase().includes(q);
    return matchesBatch && matchesSearch;
  });

  const docsByStudent = {};
  docs.forEach(d => {
    if (d.student?._id) docsByStudent[d.student._id] = d;
  });

  const handleBatchStudentUpload = async (studentId, file) => {
    if (!file) return;
    setUploadingStudentId(studentId);
    setSt('');
    try {
      const fd = new FormData();
      fd.append('kind', kind);
      fd.append('student', studentId);
      fd.append('file', file);
      await api('/docs', { method: 'POST', body: fd });
      await load();
      setSt('Document uploaded successfully!');
    } catch (x) {
      setSt('Upload failed: ' + x.message);
    } finally {
      setUploadingStudentId(null);
    }
  };

  const filteredDocs = docs.filter(d => {
    const matchesBatch = !batchFilter || d.batch?._id === batchFilter;
    const matchesSearch = !q || [d.student?.name, d.batch?.name, d.original].join(' ').toLowerCase().includes(q);
    return matchesBatch && matchesSearch;
  });

  return <>
    <h2>Private Documents ({kind==='results'?'Results':'Certificates'})</h2>
    
    <div className="subnav">
      <button className={docMode==='single'?'active':''} onClick={()=>setDocMode('single')}>👤 Single Student Upload</button>
      <button className={docMode==='batch'?'active':''} onClick={()=>setDocMode('batch')}>⚡ Batchwise Document Uploads</button>
    </div>

    <div className="card" style={{marginBottom:16}}>
      <div className="bar" style={{margin:0}}>
        <label style={{margin:0,flex:1}}>Document Type
          <select value={kind} onChange={e=>{setKind(e.target.value);setActivePdf(null);}}>
            <option value="results">Results (PDF)</option>
            <option value="certificates">Certificates (PDF)</option>
          </select>
        </label>
        <label style={{margin:0,flex:1}}>Filter Target Batch
          <select value={batchFilter} onChange={e=>{setBatchFilter(e.target.value);setS('');}}>
            <option value="">All Batches</option>
            {batches.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}
          </select>
        </label>
        <label style={{margin:0,flex:1.5}}>Search Documents & Students
          <input 
            placeholder="🔍 Search student, mobile or filename…" 
            value={docSearch} 
            onChange={e=>setDocSearch(e.target.value)}
          />
        </label>
      </div>
    </div>

    {docMode === 'single' && <>
      <div className="bar">
        <select value={s} onChange={e=>setS(e.target.value)}>
          <option value="">Choose student for upload {batchFilter ? `(${filteredStudents.length} in selected batch)` : ''}</option>
          {filteredStudents.map(x=><option key={x._id} value={x._id}>{x.name} ({x.batch?.name || 'No batch'})</option>)}
        </select>
        <input type="file" accept="application/pdf" disabled={!s} onChange={async e=>{
          const fd=new FormData();
          fd.append('kind',kind);
          fd.append('student',s);
          fd.append('file',e.target.files[0]);
          try{await api('/docs',{method:'POST',body:fd});load();setSt('File uploaded successfully!');}catch(x){setSt(x.message)}
          e.target.value='';
        }}/>
      </div>
      {st && <p className={st.includes('failed')||st.includes('Error')?'err':'ok'}>{st}</p>}
    </>}

    {docMode === 'batch' && <div className="card">
      <div style={{display:'flex',justify:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:14}}>
        <div>
          <h3 style={{fontSize:16,color:'var(--brass)',margin:0}}>⚡ Batchwise Upload Table for {kind==='results'?'Results':'Certificates'}</h3>
          <p style={{fontSize:13,color:'var(--mute)',margin:'4px 0 0'}}>Upload documents for students in {batchFilter ? batches.find(b=>b._id===batchFilter)?.name : 'All Batches'} with 1 click.</p>
        </div>
        <span className="status-badge sent">{filteredStudents.length} Students in Batch</span>
      </div>
      {st && <p className={st.includes('failed')||st.includes('Error')?'err':'ok'}>{st}</p>}

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Batch</th>
              <th>Timing</th>
              <th>Current Document Status</th>
              <th>Upload PDF File</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(stItem => {
              const existingDoc = docsByStudent[stItem._id];
              const isUploading = uploadingStudentId === stItem._id;
              return (
                <tr key={stItem._id}>
                  <td><strong>{stItem.name}</strong><br/><small>{stItem.mobile}</small></td>
                  <td>{stItem.batch?.name || 'No batch'}</td>
                  <td>{stItem.timing || '-'}</td>
                  <td>
                    {existingDoc ? (
                      <span className="status-badge sent" style={{cursor:'pointer'}} onClick={()=>viewPdf(existingDoc)} title="Click to view preview">
                        ✓ {existingDoc.original}
                      </span>
                    ) : (
                      <span className="status-badge failed">❌ No {kind} uploaded</span>
                    )}
                  </td>
                  <td>
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={isUploading}
                      style={{fontSize:12,padding:'4px 8px'}}
                      onChange={(e) => handleBatchStudentUpload(stItem._id, e.target.files[0])}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredStudents.length && <div className="empty">No students found for current batch filter.</div>}
      </div>
    </div>}

    {activePdf && <div className="card" style={{border:'1px solid var(--teal)',position:'relative'}}>
      <div style={{display:'flex',justify:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:10}}>
        <div>
          <h3 style={{fontSize:16,color:'var(--brass)',margin:0}}>📄 {activePdf.filename}</h3>
          <span style={{fontSize:12,color:'var(--mute)'}}>Student: <strong>{activePdf.doc?.student?.name}</strong> · Batch: <strong>{activePdf.doc?.batch?.name}</strong></span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{padding:'4px 12px',fontSize:13}} onClick={()=>downloadPdf(activePdf.doc)}>📥 Download PDF</button>
          <button className="ghost" style={{padding:'4px 12px',fontSize:13}} onClick={()=>window.open(activePdf.url, '_blank')}>🔗 New Window</button>
          <button className="ghost" style={{padding:'4px 12px',fontSize:13,color:'var(--bad)'}} onClick={()=>setActivePdf(null)}>✖ Close Preview</button>
        </div>
      </div>
      <iframe src={activePdf.url} title={activePdf.filename} width="100%" height="600px" style={{border:'1px solid var(--line)',borderRadius:8,background:'#fff'}}/>
    </div>}

    <div className="tw" style={{marginTop:16}}>
      <h3 style={{fontSize:16,margin:'12px 0'}}>Uploaded {kind==='results'?'Results':'Certificates'} ({filteredDocs.length} files)</h3>
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Batch</th>
            <th>File Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDocs.map(d=><tr key={d._id}>
            <td><strong>{d.student?.name}</strong></td>
            <td>{d.batch?.name}</td>
            <td>{d.original}</td>
            <td style={{display:'flex',gap:6}}>
              <button style={{padding:'4px 10px',fontSize:12}} onClick={()=>viewPdf(d)}>👁️ Preview PDF</button>
              <button className="ghost" style={{padding:'4px 10px',fontSize:12}} onClick={()=>downloadPdf(d)}>📥 Download</button>
              <button className="del" style={{fontSize:12}} onClick={async()=>{if(confirm('Delete this PDF?')){await api('/docs/'+d._id,{method:'DELETE'});if(activePdf?.doc?._id===d._id)setActivePdf(null);load();}}}>Delete</button>
            </td>
          </tr>)}
        </tbody>
      </table>
      {!filteredDocs.length&&<div className="empty">No {kind} uploaded yet for selected batch filter.</div>}
    </div>
    <div style={{marginTop:16}}><button className="ghost" onClick={()=>{DOC='';setOpen(false);setActivePdf(null);}}>Lock documents</button></div>
  </>;
}

function ServerConfigModal({ onClose }) {
  const [url, setUrl] = useState(localStorage.getItem('disha_api_url') || '');
  const save = (e) => {
    e.preventDefault();
    if (url.trim()) {
      localStorage.setItem('disha_api_url', url.trim());
    } else {
      localStorage.removeItem('disha_api_url');
    }
    alert('Server Connection saved! Reloading application...');
    window.location.reload();
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ maxWidth: 440, width: '100%', margin: 0, background: 'var(--panel)', border: '1px solid var(--brass)' }}>
        <h3 style={{ color: 'var(--brass)', margin: '0 0 8px' }}>📱 Mobile Server Connection</h3>
        <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 14px', lineHeight: 1.5 }}>
          When using DISHA on mobile devices, enter your main PC backend IP address (e.g. <code>http://192.168.1.100:5000</code>) or host server URL below.
        </p>
        <form onSubmit={save}>
          <label>Backend API URL
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="http://192.168.1.100:5000" autoFocus />
          </label>
          <div className="btn-group" style={{ marginTop: 16 }}>
            <button type="submit" style={{ flex: 1 }}>Save Connection</button>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [u, setU] = useState(() => sessionStorage.getItem('email') ? { email: sessionStorage.getItem('email') } : null);
  const [tab, setTab] = useState('home');
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [subjects, setSubjects] = useState(['English', 'Marathi', 'Hindi', 'GCC-TBC']);
  const [cloudCheck, setCloudCheck] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showServerModal, setShowServerModal] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const out = useCallback(() => {
    TOKEN = ''; DOC = '';
    sessionStorage.removeItem('t');
    sessionStorage.removeItem('email');
    setU(null);
  }, []);

  const reload = useCallback(async () => {
    try {
      const [b, s, f, subList, cc] = await Promise.all([
        api('/batches'),
        api('/students'),
        api('/fees'),
        api('/subjects').catch(() => ['English', 'Marathi', 'Hindi', 'GCC-TBC']),
        api('/backup/check-cloud').catch(() => null)
      ]);
      setBatches(b); setStudents(s); setFees(f);
      if (Array.isArray(subList)) setSubjects(subList);
      if (cc) setCloudCheck(cc);
    } catch { out() }
  }, [out]);

  useEffect(() => { u && reload() }, [u, reload]);
  useEffect(() => {
    if (!u) return; let t;
    const r = () => { clearTimeout(t); t = setTimeout(out, 15 * 60e3) }; r();
    const ev = ['click', 'keydown', 'mousemove'];
    ev.forEach(e => addEventListener(e, r));
    return () => { clearTimeout(t); ev.forEach(e => removeEventListener(e, r)) }
  }, [u, out]);

  const handleRestoreFromCloud = async (id) => {
    try {
      await api('/backup/restore/' + id, { method: 'POST' });
      alert('Cloud backup restored successfully!');
      await reload();
    } catch (e) {
      alert('Failed to restore backup: ' + e.message);
    }
  };

  if (!u) return (
    <>
      <Login 
        onIn={res => { setU({ email: res.email }); sessionStorage.setItem('email', res.email || ''); }}
        onOpenServerModal={() => setShowServerModal(true)}
      />
      {showServerModal && <ServerConfigModal onClose={() => setShowServerModal(false)} />}
    </>
  );

  const T = [['home', 'Home'], ['students', 'Students'], ['fees', 'Fees & Subjects'], ['notify', 'Fee Reminders'], ['backup', 'Cloud Backup'], ['docs', 'Private documents']];
  return (
    <div className="shell">
      <nav>
        <div className="brand">DISHA</div>
        {T.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        <div className="sp" />
        {deferredPrompt && <button type="button" className="btn-mobile-install" onClick={handleInstallPWA}>📱 Install App</button>}
        <button type="button" className="btn-mobile-settings" onClick={() => setShowServerModal(true)}>⚙️ Mobile Server IP</button>
        <button onClick={out}>Log out</button>
      </nav>
      <main>
        {deferredPrompt && (
          <div className="pwa-banner">
            <div className="pwa-banner-text">
              <b>📱 Install DISHA Mobile App:</b> Add this app to your mobile phone home screen for instant touch access!
            </div>
            <button className="btn-mobile-install" onClick={handleInstallPWA}>Install Now</button>
          </div>
        )}
        {tab === 'home' && <Home batches={batches} students={students} cloudCheck={cloudCheck} onRestoreCloud={handleRestoreFromCloud} onDismissBanner={() => setCloudCheck(null)} />}
        {(tab === 'students' || tab === 'fees') && <Students key={tab} mode={tab} {...{ batches, fees, subjects, reload, students }} />}
        {tab === 'notify' && <Notify batches={batches} students={students} />}
        {tab === 'backup' && <CloudBackup userEmail={u?.email} reload={reload} />}
        {tab === 'docs' && <Docs students={students} batches={batches} />}
      </main>
      {showServerModal && <ServerConfigModal onClose={() => setShowServerModal(false)} />}
    </div>
  );
}

