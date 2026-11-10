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
 let r;
 try {
   r = await fetch(baseUrl + '/api' + p, { ...o, headers: h });
 } catch (err) {
   if (!baseUrl) {
     try {
       r = await fetch('http://127.0.0.1:5000/api' + p, { ...o, headers: h });
     } catch {
       throw new Error('Could not connect to DISHA backend server. Please verify port 5000 is running.');
     }
   } else {
     throw new Error(`Connection to ${baseUrl} failed: ${err.message}`);
   }
 }
 if(o.blob&&r.ok)return r.blob();
 const text = await r.text();
 let j = {};
 try { j = JSON.parse(text); } catch { j = { error: text }; }
 if(!r.ok) throw new Error(j.error || j.message || `Request failed with status ${r.status}`);
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

function Home({batches,students,reload,cloudCheck,onRestoreCloud,onDismissBanner}){
 const [searchQuery, setSearchQuery] = useState('');
 const pend=students.reduce((t,s)=>t+s.pending,0);

 const deleteBatch = async (batchId, batchName, studentCount) => {
   let msg = `Delete batch "${batchName}"?`;
   if (studentCount > 0) {
     msg += `\n\n⚠️ Note: ${studentCount} student(s) currently enrolled in this batch will be set to Unassigned (their records and fees will be preserved).`;
   }
   if (!confirm(msg)) return;
   try {
     await api('/batches/' + batchId, { method: 'DELETE' });
     if (reload) await reload();
   } catch (err) {
     alert(err.message);
   }
 };

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
            <th style={{textAlign:'center'}}>Actions</th>
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
              <td style={{textAlign:'center'}}>
                {b._id !== 'unassigned' && reload && (
                  <button 
                    type="button" 
                    className="del" 
                    style={{padding:'3px 8px',fontSize:12,cursor:'pointer'}} 
                    title={`Delete batch "${b.name}"`}
                    onClick={() => deleteBatch(b._id, b.name, b.totalStudents)}
                  >
                    🗑️ Delete
                  </button>
                )}
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

const COMPUTERS = ['User2', 'User3', 'User4', 'User5', 'User6', 'User7'];

const TIME_SLOTS = [
  '6:00 AM – 7:00 AM',
  '7:00 AM – 8:00 AM',
  '8:00 AM – 9:00 AM',
  '9:00 AM – 10:00 AM',
  '10:00 AM – 11:00 AM',
  '11:00 AM – 12:00 PM',
  '12:00 PM – 1:00 PM',
  '1:00 PM – 2:00 PM',
  '2:00 PM – 3:00 PM',
  '3:00 PM – 4:00 PM',
  '4:00 PM – 5:00 PM',
  '5:00 PM – 6:00 PM',
  '6:00 PM – 7:00 PM',
  '7:00 PM – 8:00 PM',
  '8:00 PM – 9:00 PM',
  '9:00 PM – 10:00 PM'
];

const formatShortDate = (d) => {
  if (!d) return '';
  const parts = String(d).split('T')[0].split('-');
  if (parts.length === 3) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    if (m >= 0 && m < 12) return `${day} ${months[m]} ${y.slice(-2)}`;
  }
  return String(d).slice(0, 10);
};

const matchTimingSlot = (studentTiming, slot) => {
  if (!studentTiming || !slot) return false;
  const clean = s => s.toLowerCase().replace(/\s+/g, '').replace(/–/g, '-');
  const st = clean(studentTiming);
  const sl = clean(slot);
  if (st === sl) return true;
  const noZeros = s => s.replace(/:00/g, '');
  return noZeros(st) === noZeros(sl);
};

const matchComputer = (studentComp, comp) => {
  if (!studentComp || !comp) return false;
  return studentComp.trim().toLowerCase() === comp.trim().toLowerCase();
};

const handlePhotoSelect = (file, callback) => {
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('Please select a valid image file (JPG, PNG, WebP)');
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 350;
      const maxH = 450;
      let width = img.width;
      let height = img.height;
      if (width > maxW || height > maxH) {
        if (width / height > maxW / maxH) {
          width = maxW;
          height = Math.round((img.height * maxW) / img.width);
        } else {
          height = maxH;
          width = Math.round((img.width * maxH) / img.height);
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

function PaymentBoxes({ payments, paid }) {
  if (Array.isArray(payments) && payments.length > 0) {
    return (
      <div className="payment-box-list">
        {payments.map((p, idx) => (
          <div key={idx} className="payment-box" title={p.note ? `${p.note} (${formatShortDate(p.date)})` : `Payment #${idx+1} (${formatShortDate(p.date)})`}>
            <span className="p-amt">{ru(p.amount)}</span>
            <span className="p-date">{formatShortDate(p.date)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (Number(paid) > 0) {
    return (
      <div className="payment-box-list">
        <div className="payment-box" title="Initial Recorded Payment">
          <span className="p-amt">{ru(paid)}</span>
          <span className="p-date">Paid</span>
        </div>
      </div>
    );
  }
  return <span style={{ fontSize: 12, color: 'var(--mute)' }}>₹0 paid</span>;
}

function PaymentModal({ student, onClose, reload }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(student);

  const totalFee = currentStudent.total || 0;
  const paidFee = currentStudent.paid || 0;
  const pendingFee = (currentStudent.pending !== undefined) ? currentStudent.pending : (totalFee - paidFee);

  const handleAddPayment = async (e) => {
    e?.preventDefault();
    const num = Number(amount);
    if (!num || isNaN(num) || num <= 0) return alert('Please enter a valid payment amount.');
    setBusy(true);
    try {
      const updated = await api(`/students/${currentStudent._id}/payments`, {
        method: 'POST',
        body: { amount: num, date, note }
      });
      setCurrentStudent(updated);
      setAmount('');
      setNote('');
      await reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePayment = async (idx) => {
    if (!confirm('Delete this recorded payment?')) return;
    setBusy(true);
    try {
      const updated = await api(`/students/${currentStudent._id}/payments/${idx}`, {
        method: 'DELETE'
      });
      setCurrentStudent(updated);
      await reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div className="card" style={{ maxWidth: 520, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: 'var(--brass)', fontSize: 18 }}>💳 Record Fee Payment</h3>
          <button type="button" className="ghost" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ background: 'rgba(212, 162, 76, 0.08)', border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 6 }}>{currentStudent.name}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
            <span>Total Fee: <b>{ru(totalFee)}</b></span>
            <span>Total Paid: <b style={{ color: 'var(--teal)' }}>{ru(paidFee)}</b></span>
            <span>Pending Balance: <b className={pendingFee > 0 ? 'pend' : 'clear'}>{ru(pendingFee)}</b></span>
          </div>
        </div>

        <h4 style={{ margin: '0 0 8px', color: 'var(--text)', fontSize: 14 }}>Recorded Payment Installments:</h4>
        <div style={{ background: '#0c1519', border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          {Array.isArray(currentStudent.payments) && currentStudent.payments.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {currentStudent.payments.map((p, idx) => (
                <div key={idx} style={{
                  background: 'rgba(212, 162, 76, 0.12)', border: '1px solid var(--brass)',
                  borderRadius: 8, padding: '6px 14px', display: 'inline-flex', flexDirection: 'column',
                  alignItems: 'center', position: 'relative'
                }}>
                  <button
                    type="button"
                    title="Remove this payment"
                    disabled={busy}
                    onClick={() => handleDeletePayment(idx)}
                    style={{
                      position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                      borderRadius: '50%', background: 'var(--bad)', color: '#fff',
                      border: 0, padding: 0, fontSize: 10, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer'
                    }}
                  >✕</button>
                  <span style={{ fontWeight: 700, color: 'var(--brass)', fontSize: 14 }}>{ru(p.amount)}</span>
                  <span style={{ fontSize: 11, color: 'var(--mute)' }}>{formatShortDate(p.date)}</span>
                  {p.note && <span style={{ fontSize: 10, color: 'var(--text)', opacity: 0.85, marginTop: 2 }}>{p.note}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--mute)', fontSize: 13 }}>No installment payments recorded yet.</div>
          )}
        </div>

        <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ margin: 0, color: 'var(--brass)', fontSize: 14 }}>+ Add New Payment Installment:</h4>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            <label>Payment Amount (₹)*
              <input
                type="number"
                min="1"
                placeholder="e.g. 2000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label>Payment Date*
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </label>
            <label>Payment Mode / Note
              <input
                type="text"
                placeholder="Cash, GPay, UPI..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="ghost" onClick={onClose} disabled={busy}>Close</button>
            <button type="submit" disabled={busy || !amount}>{busy ? 'Recording…' : '✓ Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StudentProfileModal({ student, onClose, onEdit }) {
  if (!student) return null;
  const printProfile = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div className="card" style={{ maxWidth: 680, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 10, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--brass)', fontSize: 18 }}>MAHARASHTRA STATE COUNCIL OF EXAMINATION</h3>
            <small style={{ color: 'var(--mute)' }}>G.C.C.C.T. EXAMINATION — Student Admission Record</small>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={printProfile}>🖨️ Print Form</button>
            <button type="button" className="ghost" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', fontSize: 14 }}>
              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>1. General Register No:</span>
              <span>{student.grNo || '—'}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>3. Student Name:</span>
              <span style={{ fontWeight: 700, color: '#fff' }}>{student.name}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>4. Mother's Name:</span>
              <span>{student.motherName || '—'}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>5. Subject(s):</span>
              <span>{student.subjects?.map(s => `${s.name} (${s.speed} WPM)`).join(', ') || '—'}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>7. Gender:</span>
              <span>{student.gender || '—'}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>8. Date of Birth:</span>
              <span>{student.dob ? formatShortDate(student.dob) : '—'}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>9. Date of Admission:</span>
              <span>{student.admissionDate ? formatShortDate(student.admissionDate) : '—'}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>13. Qualification:</span>
              <span>{student.qualification || '—'}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>14. Address:</span>
              <span>{student.address || '—'}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>15. Mobile Number:</span>
              <span>{student.mobile || '—'}</span>

              <span style={{ color: 'var(--brass)', fontWeight: 600 }}>16. Aadhaar Number:</span>
              <span style={{ letterSpacing: 1, fontWeight: 600 }}>{student.aadharNo || '—'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 120, height: 150, border: '2px solid var(--brass)', borderRadius: 8,
              overflow: 'hidden', background: '#0c1519', display: 'flex', alignItems: 'center',
              justifyContent: 'center'
            }}>
              {student.photo ? (
                <img src={student.photo} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--mute)', fontSize: 12, padding: 8 }}>
                  <span style={{ fontSize: 32, display: 'block', marginBottom: 4 }}>👤</span>
                  Passport Size Photo
                </div>
              )}
            </div>
            <small style={{ color: 'var(--mute)', marginTop: 6 }}>Passport Photo</small>
          </div>
        </div>

        <div className="card" style={{ background: 'rgba(15, 27, 34, 0.6)', border: '1px solid var(--line)', margin: '14px 0' }}>
          <h4 style={{ margin: '0 0 10px', color: 'var(--brass)', fontSize: 15 }}>💻 Practice Timing & Computer Allocation</h4>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14 }}>
            <div>Computer: <b style={{ color: 'var(--brass)' }}>{student.computer || 'Not Assigned'}</b></div>
            <div>Practice Timing: <b>{student.timing || 'Not Assigned'}</b></div>
            <div>Batch: <b>{student.batch?.name || 'Unassigned'}</b></div>
          </div>
        </div>

        <div className="card" style={{ background: 'rgba(15, 27, 34, 0.6)', border: '1px solid var(--line)', margin: '14px 0' }}>
          <h4 style={{ margin: '0 0 10px', color: 'var(--brass)', fontSize: 15 }}>💰 Fee Payments Breakdown</h4>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 14 }}>
            <span>Total Fee: <b>{ru(student.total)}</b></span>
            <span>Total Paid: <b style={{ color: 'var(--teal)' }}>{ru(student.paid)}</b></span>
            <span>Pending Balance: <b className={(student.pending || 0) > 0 ? 'pend' : 'clear'}>{ru(student.pending || 0)}</b></span>
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--mute)', display: 'block', marginBottom: 6 }}>Recorded Installments:</span>
            <PaymentBoxes payments={student.payments} paid={student.paid} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          {onEdit && <button type="button" onClick={() => onEdit(student)}>✏️ Edit Student</button>}
          <button type="button" className="ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ComputerTiming({ students, batches, reload, onOpenProfile, onEditStudent, onAddStudentForSlot }) {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' (computers at top) or 'timeline' (hours at top)
  const [assignTarget, setAssignTarget] = useState(null); // { slot, comp }
  const [assignStudentId, setAssignStudentId] = useState('');
  const [busy, setBusy] = useState(false);

  const filteredStudents = students.filter(s => {
    if (selectedBatch && s.batch?._id !== selectedBatch) return false;
    if (search) {
      const q = search.toLowerCase();
      return (s.name || '').toLowerCase().includes(q) || (s.mobile || '').includes(q) || (s.computer || '').toLowerCase().includes(q);
    }
    return true;
  });

  const practicingStudents = students.filter(s => s.computer && s.timing);
  let occupiedCount = 0;
  TIME_SLOTS.forEach(slot => {
    COMPUTERS.forEach(comp => {
      const has = students.some(s => matchComputer(s.computer, comp) && matchTimingSlot(s.timing, slot));
      if (has) occupiedCount++;
    });
  });
  const totalSlots = TIME_SLOTS.length * COMPUTERS.length;
  const freeSlots = Math.max(0, totalSlots - occupiedCount);

  const handleAssignSubmit = async (e) => {
    e?.preventDefault();
    if (!assignStudentId || !assignTarget) return;
    const targetStudent = students.find(s => s._id === assignStudentId);
    if (!targetStudent) return;
    setBusy(true);
    try {
      await api(`/students/${targetStudent._id}`, {
        method: 'PUT',
        body: {
          ...targetStudent,
          computer: assignTarget.comp,
          timing: assignTarget.slot
        }
      });
      setAssignTarget(null);
      setAssignStudentId('');
      await reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="timing-header-card">
        <div>
          <h2>💻 Computer Timing Section</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--mute)', fontSize: 13 }}>
            Dedicated timetable for 6 practice computers (User2 to User7) from 6:00 AM to 10:00 PM.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="ghost" onClick={handlePrint} title="Print Timetable">
            🖨️ Print Timetable
          </button>
          <div className="btn-group" style={{ display: 'inline-flex', background: '#0c1519', borderRadius: 8, padding: 3, border: '1px solid var(--line)' }}>
            <button
              type="button"
              className={viewMode === 'table' ? '' : 'ghost'}
              style={{ fontSize: 12, padding: '4px 10px', minHeight: 32 }}
              onClick={() => setViewMode('table')}
            >
              📋 Computers at Top
            </button>
            <button
              type="button"
              className={viewMode === 'timeline' ? '' : 'ghost'}
              style={{ fontSize: 12, padding: '4px 10px', minHeight: 32 }}
              onClick={() => setViewMode('timeline')}
            >
              📊 Hours as Columns
            </button>
          </div>
        </div>
      </div>

      <div className="stats" style={{ marginBottom: 16 }}>
        <div className="stat"><b>{practicingStudents.length}</b>Practicing Students</div>
        <div className="stat"><b style={{ color: 'var(--brass)' }}>{occupiedCount}</b>Occupied Slots</div>
        <div className="stat"><b style={{ color: 'var(--teal)' }}>{freeSlots}</b>Available Slots</div>
        <div className="stat"><b>6</b>Computers (User2–User7)</div>
      </div>

      <div className="bar" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">All Batches ({students.length} students)</option>
          {batches.map(b => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        <input
          placeholder="Search student name, computer or mobile in timetable…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        {search && (
          <button type="button" className="ghost" onClick={() => setSearch('')}>✕ Clear</button>
        )}
      </div>

      {viewMode === 'table' ? (
        /* View 1: 6 Computers as Columns User2 to User7 at top, 16 hourly slots as rows */
        <div className="timetable-wrapper">
          <table className="timetable-grid">
            <thead>
              <tr>
                <th className="time-col">⏰ Practice Hours</th>
                {COMPUTERS.map(c => (
                  <th key={c} style={{ minWidth: 140 }}>
                    <div style={{ fontSize: 16, color: 'var(--brass)' }}>🖥️ {c}</div>
                    <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--mute)' }}>Computer {c}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map(slot => (
                <tr key={slot}>
                  <td className="time-cell">
                    <b>{slot}</b>
                  </td>
                  {COMPUTERS.map(comp => {
                    const matched = filteredStudents.filter(s => matchComputer(s.computer, comp) && matchTimingSlot(s.timing, slot));
                    return (
                      <td key={comp} className="comp-slot">
                        {matched.length > 0 ? (
                          matched.map(st => (
                            <div
                              key={st._id}
                              className="student-slot-chip"
                              title={`Click to view profile of ${st.name} (${comp} · ${slot})`}
                              onClick={() => onOpenProfile ? onOpenProfile(st) : onEditStudent(st)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {st.photo ? (
                                  <img src={st.photo} alt={st.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: 12 }}>👤</span>
                                )}
                                <span className="student-name">{st.name}</span>
                              </div>
                              <span className="student-sub">
                                {st.subjects?.[0]?.name ? `${st.subjects[0].name} ${st.subjects[0].speed || ''} WPM` : (st.batch?.name || 'Practicing')}
                              </span>
                            </div>
                          ))
                        ) : (
                          <button
                            type="button"
                            className="empty-slot-btn"
                            title={`Assign student to ${comp} from ${slot}`}
                            onClick={() => setAssignTarget({ slot, comp })}
                          >
                            + Available
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* View 2: 16 Hourly Slots as Columns from 6 AM to 10 PM, 6 Computers as rows */
        <div className="timetable-wrapper">
          <table className="timetable-grid">
            <thead>
              <tr>
                <th style={{ width: 120, position: 'sticky', left: 0, zIndex: 3, background: '#0a1318' }}>
                  🖥️ Computer
                </th>
                {TIME_SLOTS.map(slot => (
                  <th key={slot} style={{ minWidth: 130 }}>
                    <div style={{ fontSize: 12 }}>{slot}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPUTERS.map(comp => (
                <tr key={comp}>
                  <td className="time-cell" style={{ position: 'sticky', left: 0, zIndex: 1, background: '#0a1318' }}>
                    <div style={{ fontSize: 15, color: 'var(--brass)', fontWeight: 700 }}>🖥️ {comp}</div>
                  </td>
                  {TIME_SLOTS.map(slot => {
                    const matched = filteredStudents.filter(s => matchComputer(s.computer, comp) && matchTimingSlot(s.timing, slot));
                    return (
                      <td key={slot} className="comp-slot">
                        {matched.length > 0 ? (
                          matched.map(st => (
                            <div
                              key={st._id}
                              className="student-slot-chip"
                              onClick={() => onOpenProfile ? onOpenProfile(st) : onEditStudent(st)}
                            >
                              <span className="student-name">{st.name}</span>
                              <span className="student-sub">{st.subjects?.[0]?.name || st.batch?.name || 'Active'}</span>
                            </div>
                          ))
                        ) : (
                          <button
                            type="button"
                            className="empty-slot-btn"
                            onClick={() => setAssignTarget({ slot, comp })}
                          >
                            + Free
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assignTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, color: 'var(--brass)', fontSize: 17 }}>
                Assign Seat: {assignTarget.comp}
              </h3>
              <button type="button" className="ghost" onClick={() => setAssignTarget(null)}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 14px' }}>
              Assign an existing student to <b>{assignTarget.comp}</b> for the practice slot <b>{assignTarget.slot}</b>:
            </p>

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>Select Student:
                <select value={assignStudentId} onChange={e => setAssignStudentId(e.target.value)} required>
                  <option value="">-- Choose student ({students.length} available) --</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.computer ? `(Currently: ${s.computer} · ${s.timing})` : '(No PC assigned)'}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    const target = assignTarget;
                    setAssignTarget(null);
                    if (onAddStudentForSlot) onAddStudentForSlot(target.comp, target.slot);
                  }}
                >
                  + Register New Student Here
                </button>
                <button type="submit" disabled={busy || !assignStudentId}>
                  {busy ? 'Saving…' : '✓ Assign Seat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const blank = {
  name: '',
  mobile: '',
  email: '',
  timing: '9:00 AM – 10:00 AM',
  computer: 'User2',
  subjects: [{ name: 'English', speed: 30 }],
  paid: 0,
  payments: [],
  grNo: '',
  motherName: '',
  gender: 'Male',
  dob: '',
  admissionDate: new Date().toISOString().slice(0, 10),
  qualification: 'H.S.C.',
  address: '',
  aadharNo: '',
  photo: ''
};

function Students({ batches, fees, subjects = ['English', 'Marathi', 'Hindi', 'GCC-TBC'], reload, students, mode, initialStudentForm, onClearInitialStudentForm }) {
  const [b, setB] = useState('');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [f, setF] = useState(null);
  const [nb, setNb] = useState('');
  const [newSub, setNewSub] = useState('');
  const [feeInputs, setFeeInputs] = useState(fees || { 30: 7000, 40: 5000, 50: 5000, 3000: 3000 });
  const [showBatchManager, setShowBatchManager] = useState(false);

  // Modals
  const [activePaymentStudent, setActivePaymentStudent] = useState(null);
  const [activeProfileStudent, setActiveProfileStudent] = useState(null);

  // Form payment installment inputs
  const [formPayAmt, setFormPayAmt] = useState('');
  const [formPayDate, setFormPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [formPayNote, setFormPayNote] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (fees) setFeeInputs(fees);
  }, [fees]);

  useEffect(() => {
    if (initialStudentForm) {
      setF(initialStudentForm);
      if (onClearInitialStudentForm) onClearInitialStudentForm();
    }
  }, [initialStudentForm, onClearInitialStudentForm]);

  const deleteBatch = async (batchId, batchName) => {
    const target = batches.find(x => x._id === batchId);
    const name = batchName || target?.name || 'this batch';
    const count = students.filter(s => s.batch?._id === batchId).length;
    let msg = `Delete batch "${name}"?`;
    if (count > 0) {
      msg += `\n\n⚠️ Note: ${count} student(s) currently enrolled in this batch will be set to Unassigned (their records and fee data will remain intact).`;
    }
    if (!confirm(msg)) return;
    try {
      await api('/batches/' + batchId, { method: 'DELETE' });
      if (b === batchId) setB('');
      await reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const list = students.filter(s => {
    const matchesBatch = !b || s.batch?._id === b;
    if (!matchesBatch) return false;
    if (!q) return true;
    const query = q.toLowerCase();
    return [
      s.name, s.mobile, s.email, s.grNo, s.aadharNo, s.computer, s.motherName
    ].filter(Boolean).join(' ').toLowerCase().includes(query);
  });

  const sortedList = [...list].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' });
      case 'pending_desc':
        return (b.pending || 0) - (a.pending || 0);
      case 'pending_asc':
        return (a.pending || 0) - (b.pending || 0);
      case 'paid_desc':
        return (b.paid || 0) - (a.paid || 0);
      case 'paid_asc':
        return (a.paid || 0) - (b.paid || 0);
      case 'total_desc':
        return (b.total || 0) - (a.total || 0);
      case 'total_asc':
        return (a.total || 0) - (b.total || 0);
      case 'gr_asc':
        return (a.grNo || '').localeCompare(b.grNo || '', undefined, { numeric: true });
      case 'pc_asc':
        return (a.computer || '').localeCompare(b.computer || '', undefined, { numeric: true });
      case 'timing_asc': {
        const slotA = TIME_SLOTS.findIndex(s => matchTimingSlot(a.timing, s));
        const slotB = TIME_SLOTS.findIndex(s => matchTimingSlot(b.timing, s));
        const idxA = slotA === -1 ? 999 : slotA;
        const idxB = slotB === -1 ? 999 : slotB;
        return idxA - idxB;
      }
      case 'newest': {
        const dateA = new Date(a.admissionDate || a.createdAt || 0).getTime();
        const dateB = new Date(b.admissionDate || b.createdAt || 0).getTime();
        return dateB - dateA;
      }
      case 'oldest': {
        const dateA = new Date(a.admissionDate || a.createdAt || 0).getTime();
        const dateB = new Date(b.admissionDate || b.createdAt || 0).getTime();
        return dateA - dateB;
      }
      default:
        return (a.name || '').localeCompare(b.name || '');
    }
  });

  const tot = f ? f.subjects.reduce((t, s) => t + (fees[s.speed] !== undefined ? Number(fees[s.speed]) : (s.speed == 3000 ? 3000 : 0)), 0) : 0;
  const currentPaid = f ? (Array.isArray(f.payments) && f.payments.length > 0 ? f.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : (Number(f.paid) || 0)) : 0;
  const currentPending = Math.max(0, tot - currentPaid);

  const save = async () => {
    try {
      const body = {
        ...f,
        batch: f.batch || b || batches[0]?._id,
        paid: currentPaid
      };
      if (f._id) {
        await api('/students/' + f._id, { method: 'PUT', body });
      } else {
        await api('/students', { method: 'POST', body });
      }
      setF(null);
      reload();
    } catch (x) {
      alert(x.message);
    }
  };

  const sub = (i, k, v) => setF({ ...f, subjects: f.subjects.map((s, j) => j === i ? { ...s, [k]: k === 'speed' ? +v : v } : s) });

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

  // Add payment installment inside the edit form
  const handleAddFormPayment = () => {
    const num = Number(formPayAmt);
    if (!num || isNaN(num) || num <= 0) return alert('Enter a valid payment installment amount');
    const newPayments = Array.isArray(f.payments) ? [...f.payments] : [];
    newPayments.push({
      amount: num,
      date: formPayDate || new Date().toISOString().slice(0, 10),
      note: formPayNote.trim()
    });
    setF({
      ...f,
      payments: newPayments,
      paid: newPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    });
    setFormPayAmt('');
    setFormPayNote('');
  };

  const handleRemoveFormPayment = (idx) => {
    const newPayments = f.payments.filter((_, i) => i !== idx);
    setF({
      ...f,
      payments: newPayments,
      paid: newPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    });
  };

  const feeOptionsList = { ...fees, 3000: fees[3000] || 3000 };

  return (
    <>
      <h2>{mode === 'fees' ? 'Fees & Subject Management' : 'Students Management'}</h2>

      {mode === 'fees' && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, color: 'var(--brass)', marginBottom: 8 }}>💰 Manage Institute Fee Structure & Rates</h3>
            <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 12px' }}>Set standard course fee rates for typing speed levels and flat fee options (e.g. ₹3,000).</p>
            <div className="grid" style={{ marginBottom: 14 }}>
              {Object.entries(feeInputs).map(([k, v]) => (
                <label key={k}>
                  {['30', '40', '50'].includes(String(k)) ? `${k} WPM Fee (₹)` : `Fee Option ₹${k} (₹)`}
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

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, color: 'var(--brass)', marginBottom: 8 }}>📚 Manage Institute Typing Subjects</h3>
            <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 12px' }}>Add custom subjects (e.g. English, Marathi, Hindi, GCC-TBC, Shorthand) to offer at your institute.</p>
            <div className="chip-bar" style={{ marginBottom: 14 }}>
              {subjects.map(s => (
                <span key={s} className="chip-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: 13 }}>
                  {s} <button type="button" style={{ background: 'none', border: 0, color: 'var(--bad)', padding: 0, cursor: 'pointer', fontWeight: 700 }} onClick={() => handleDeleteSubject(s)}>✕</button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddSubject} className="bar" style={{ maxWidth: 480, margin: 0 }}>
              <input placeholder="New subject name (e.g. Hindi, GCC-TBC)" value={newSub} onChange={e => setNewSub(e.target.value)} />
              <button type="submit">+ Add Subject</button>
            </form>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, color: 'var(--brass)', marginBottom: 8 }}>📅 Manage Institute Batches</h3>
            <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 12px' }}>Create new 6-month batches or remove obsolete batches. Students in deleted batches will safely become unassigned without losing records.</p>
            <div className="chip-bar" style={{ marginBottom: 14 }}>
              {batches.map(x => {
                const count = students.filter(s => s.batch?._id === x._id).length;
                return (
                  <span key={x._id} className="chip-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', fontSize: 13 }}>
                    <span>{x.name} <small style={{ opacity: 0.75 }}>({count} {count === 1 ? 'student' : 'students'})</small></span>
                    <button
                      type="button"
                      title={`Delete batch "${x.name}"`}
                      style={{ background: 'none', border: 0, color: 'var(--bad)', padding: '0 2px', cursor: 'pointer', fontWeight: 700, fontSize: 14, lineHeight: 1 }}
                      onClick={() => deleteBatch(x._id, x.name)}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
              {!batches.length && <span style={{ color: 'var(--mute)', fontSize: 13 }}>No batches created yet.</span>}
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const d = new Date('1 ' + nb);
              if (isNaN(d)) return alert('Use a format like June 2028');
              try {
                await api('/batches', { method: 'POST', body: { name: nb, start: d.toISOString().slice(0, 7) } });
                setNb('');
                reload();
              } catch (x) { alert(x.message) }
            }} className="bar" style={{ maxWidth: 480, margin: 0 }}>
              <input placeholder="New batch, e.g. June 2028" value={nb} onChange={e => setNb(e.target.value)} />
              <button type="submit">+ Create Batch</button>
            </form>
          </div>
        </>
      )}

      <div className="bar" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <select value={b} onChange={e => setB(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All batches ({students.length})</option>
          {batches.map(x => {
            const count = students.filter(s => s.batch?._id === x._id).length;
            return <option key={x._id} value={x._id}>{x.name} ({count})</option>;
          })}
        </select>
        {b && (
          <button
            type="button"
            className="del"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            title="Delete currently selected batch"
            onClick={() => deleteBatch(b)}
          >
            🗑️ Delete batch
          </button>
        )}
        <input
          placeholder="Search by name, mobile, GR No, Aadhaar or PC…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />

        {/* Sort by A-Z Button */}
        <button
          type="button"
          className={sortBy === 'name_asc' || sortBy === 'name_desc' ? '' : 'ghost'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 42, whiteSpace: 'nowrap' }}
          title="Click to toggle Name Sort (A-Z / Z-A)"
          onClick={() => setSortBy(prev => prev === 'name_asc' ? 'name_desc' : 'name_asc')}
        >
          {sortBy === 'name_desc' ? '🔤 Name (Z → A) ▼' : '🔤 Name (A → Z) ▲'}
        </button>

        {/* Extended Sort Options */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ minWidth: 190, maxWidth: 240 }}
          title="Sort by filter"
        >
          <option value="name_asc">🔤 Sort: Name (A to Z)</option>
          <option value="name_desc">🔤 Sort: Name (Z to A)</option>
          <option value="pending_desc">⚠️ Sort: Pending Fees (Highest First)</option>
          <option value="pending_asc">✅ Sort: Pending Fees (Cleared First)</option>
          <option value="paid_desc">💰 Sort: Fees Paid (Highest First)</option>
          <option value="total_desc">📊 Sort: Total Course Fee (High → Low)</option>
          <option value="timing_asc">⏰ Sort: Practice Timing (Earliest First)</option>
          <option value="pc_asc">🖥️ Sort: Computer (User2 → User7)</option>
          <option value="gr_asc">📋 Sort: General Register No.</option>
          <option value="newest">📅 Sort: Admission Date (Newest First)</option>
          <option value="oldest">📅 Sort: Admission Date (Oldest First)</option>
        </select>

        <button onClick={() => setF({ ...blank, batch: b || batches[0]?._id, subjects: [{ name: subjects[0] || 'English', speed: 30 }] })}>
          + Add New Student
        </button>
      </div>

      <div className="bar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input placeholder="New batch, e.g. June 2028" value={nb} onChange={e => setNb(e.target.value)} />
        <button className="ghost" onClick={async () => {
          const d = new Date('1 ' + nb);
          if (isNaN(d)) return alert('Use a format like June 2028');
          await api('/batches', { method: 'POST', body: { name: nb, start: d.toISOString().slice(0, 7) } });
          setNb('');
          reload();
        }}>Create batch</button>
        <button
          type="button"
          className="ghost"
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowBatchManager(v => !v)}
        >
          {showBatchManager ? '▲ Hide Batches' : `📅 Manage All Batches (${batches.length})`}
        </button>
      </div>

      {showBatchManager && (
        <div className="card" style={{ marginBottom: 16, background: 'rgba(16, 28, 34, 0.75)', borderColor: 'rgba(212, 162, 76, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ margin: 0, color: 'var(--brass)', fontSize: 15 }}>📅 Institute Batches Registry ({batches.length})</h4>
            <button type="button" className="ghost" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => setShowBatchManager(false)}>✕ Close</button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--mute)', margin: '0 0 10px' }}>Click the ✕ next to any batch to delete it. Enrolled students will be moved to Unassigned safely.</p>
          <div className="chip-bar" style={{ margin: 0 }}>
            {batches.map(x => {
              const count = students.filter(s => s.batch?._id === x._id).length;
              return (
                <span key={x._id} className="chip-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 13 }}>
                  <span><b>{x.name}</b> <small style={{ opacity: 0.75 }}>({count} {count === 1 ? 'student' : 'students'})</small></span>
                  <button
                    type="button"
                    title={`Delete batch "${x.name}"`}
                    style={{ background: 'none', border: 0, color: 'var(--bad)', padding: '0 2px', cursor: 'pointer', fontWeight: 700, fontSize: 14, lineHeight: 1 }}
                    onClick={() => deleteBatch(x._id, x.name)}
                  >
                    ✕
                  </button>
                </span>
              );
            })}
            {!batches.length && <span style={{ color: 'var(--mute)', fontSize: 13 }}>No batches created yet.</span>}
          </div>
        </div>
      )}

      {/* STUDENT REGISTRATION & EDIT FORM MODAL / CARD */}
      {f && (
        <div className="card" style={{ marginBottom: 24, border: '2px solid var(--brass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
            <h3 style={{ margin: 0, color: 'var(--brass)', fontSize: 18 }}>
              {f._id ? '✏️ Edit Student Record' : '📝 Register New Student (Maharashtra GCC-TBC Form)'}
            </h3>
            <button type="button" className="ghost" style={{ padding: '2px 8px' }} onClick={() => setF(null)}>✕ Cancel</button>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
            {/* Passport Size Photo Box (Top Right / Left in form) */}
            <div className="passport-photo-container">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelect(file, url => setF({ ...f, photo: url }));
                }}
              />
              <div
                className="passport-photo-box"
                onClick={() => fileInputRef.current?.click()}
                title="Click to upload student's passport size photo"
              >
                {f.photo ? (
                  <img src={f.photo} alt="Student passport preview" />
                ) : (
                  <div className="passport-photo-placeholder">
                    <span>📷</span>
                    <b>Passport Size Photo</b>
                    <small>Click to upload</small>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="ghost"
                  style={{ fontSize: 11, padding: '3px 8px', minHeight: 28 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {f.photo ? 'Change' : 'Upload'}
                </button>
                {f.photo && (
                  <button
                    type="button"
                    className="del"
                    style={{ fontSize: 11, padding: '3px 8px', minHeight: 28 }}
                    onClick={() => setF({ ...f, photo: '' })}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Main Form Fields */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div className="form-section-title">
                📋 GCC-TBC Examination Form Details (Points 1, 3, 4, 7, 8, 9, 13, 14, 15, 16)
              </div>

              <div className="grid">
                <label>1. General Register No.
                  <input
                    placeholder="e.g. 642 / 643"
                    value={f.grNo || ''}
                    onChange={e => setF({ ...f, grNo: e.target.value })}
                  />
                </label>
                <label>3. Student Full Name*
                  <input
                    placeholder="e.g. Abhishek Pawar"
                    value={f.name || ''}
                    onChange={e => setF({ ...f, name: e.target.value })}
                    required
                  />
                </label>
                <label>4. Mother's Name
                  <input
                    placeholder="e.g. Rajiya"
                    value={f.motherName || ''}
                    onChange={e => setF({ ...f, motherName: e.target.value })}
                  />
                </label>
                <label>7. Gender
                  <select value={f.gender || 'Male'} onChange={e => setF({ ...f, gender: e.target.value })}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>8. Date of Birth
                  <input
                    type="date"
                    value={f.dob || ''}
                    onChange={e => setF({ ...f, dob: e.target.value })}
                  />
                </label>
                <label>9. Date of Admission
                  <input
                    type="date"
                    value={f.admissionDate || ''}
                    onChange={e => setF({ ...f, admissionDate: e.target.value })}
                  />
                </label>
                <label>13. Latest Educational Qualification
                  <input
                    placeholder="e.g. H.S.C., S.S.C., Graduate"
                    value={f.qualification || ''}
                    onChange={e => setF({ ...f, qualification: e.target.value })}
                  />
                </label>
                <label>15. Mobile Number*
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={f.mobile || ''}
                    onChange={e => setF({ ...f, mobile: e.target.value })}
                  />
                </label>
                <label>16. Aadhaar Number (12 digits)
                  <input
                    placeholder="e.g. 3183 7897 9250"
                    value={f.aadharNo || ''}
                    onChange={e => setF({ ...f, aadharNo: e.target.value })}
                  />
                </label>
                <label>Email Address
                  <input
                    type="email"
                    placeholder="e.g. student@gmail.com"
                    value={f.email || ''}
                    onChange={e => setF({ ...f, email: e.target.value })}
                  />
                </label>
              </div>

              <label style={{ marginTop: 10, display: 'block' }}>14. Address
                <textarea
                  rows="2"
                  placeholder="e.g. Gawali Pokhari, Jalna"
                  value={f.address || ''}
                  onChange={e => setF({ ...f, address: e.target.value })}
                />
              </label>

              {/* Computer Timing & Allocation */}
              <div className="form-section-title" style={{ marginTop: 20 }}>
                💻 Computer Timing & Practice Seat (Computers User2 to User7)
              </div>
              <div className="grid">
                <label>Practice Computer No.*
                  <select value={f.computer || 'User2'} onChange={e => setF({ ...f, computer: e.target.value })}>
                    <option value="">-- None / Unassigned --</option>
                    {COMPUTERS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>Practice Time Slot (Hourly)*
                  <select value={f.timing || '9:00 AM – 10:00 AM'} onChange={e => setF({ ...f, timing: e.target.value })}>
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </label>
                <label>Institute Batch
                  <select value={f.batch?._id || f.batch || ''} onChange={e => setF({ ...f, batch: e.target.value })}>
                    <option value="">-- No batch (Unassigned) --</option>
                    {batches.map(x => (
                      <option key={x._id} value={x._id}>{x.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Course Subjects & Speeds */}
              <div className="form-section-title" style={{ marginTop: 20 }}>
                📚 5. Enrolled Examination Subjects & Rates
              </div>
              {f.subjects.map((s, i) => (
                <div className="bar" key={i}>
                  <select
                    value={s.name}
                    onChange={async e => {
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
                    }}
                  >
                    {subjects.map(subName => <option key={subName} value={subName}>{subName}</option>)}
                    {!subjects.includes(s.name) && <option value={s.name}>{s.name}</option>}
                    <option value="__custom__">+ Add Custom Subject Name…</option>
                  </select>
                  <select value={s.speed} onChange={e => sub(i, 'speed', e.target.value)}>
                    {Object.entries(feeOptionsList).map(([vKey, vVal]) => {
                      const label = ['30', '40', '50'].includes(String(vKey)) ? `${vKey} WPM · ${ru(vVal)}` : ru(vVal);
                      return <option key={vKey} value={vKey}>{label}</option>;
                    })}
                  </select>
                  <button type="button" className="del" onClick={() => setF({ ...f, subjects: f.subjects.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ))}
              <button
                type="button"
                className="ghost"
                style={{ marginBottom: 14 }}
                onClick={() => setF({ ...f, subjects: [...f.subjects, { name: subjects[0] || 'English', speed: 30 }] })}
              >
                + Add Another Subject
              </button>

              {/* Multiple Fee Payments Section */}
              <div className="form-section-title" style={{ marginTop: 20 }}>
                💰 Multiple Fee Payments & Payment Records
              </div>
              <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 10px' }}>
                Record each installment separately with its amount and date. Total paid and pending fees will calculate automatically.
              </p>

              {/* Recorded Payment Boxes */}
              <div style={{ background: '#0c1519', border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 8 }}>Recorded Installment Boxes:</div>
                {Array.isArray(f.payments) && f.payments.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {f.payments.map((p, pIdx) => (
                      <div key={pIdx} className="payment-box" style={{ position: 'relative' }}>
                        <button
                          type="button"
                          title="Remove this installment"
                          onClick={() => handleRemoveFormPayment(pIdx)}
                          style={{
                            position: 'absolute', top: -5, right: -5, width: 16, height: 16,
                            borderRadius: '50%', background: 'var(--bad)', color: '#fff',
                            border: 0, padding: 0, fontSize: 9, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer'
                          }}
                        >✕</button>
                        <span className="p-amt">{ru(p.amount)}</span>
                        <span className="p-date">{formatShortDate(p.date)}</span>
                      </div>
                    ))}
                  </div>
                ) : Number(f.paid) > 0 ? (
                  <div className="payment-box">
                    <span className="p-amt">{ru(f.paid)}</span>
                    <span className="p-date">Initial</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--mute)' }}>No installment payments recorded yet. Add the first one below.</span>
                )}
              </div>

              {/* Add Payment Installment Sub-form */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(212, 162, 76, 0.05)', padding: 10, borderRadius: 8, border: '1px solid var(--line)', marginBottom: 14 }}>
                <label style={{ flex: 1, minWidth: 110, margin: 0 }}>Installment (₹)
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 3000"
                    value={formPayAmt}
                    onChange={e => setFormPayAmt(e.target.value)}
                  />
                </label>
                <label style={{ flex: 1, minWidth: 130, margin: 0 }}>Payment Date
                  <input
                    type="date"
                    value={formPayDate}
                    onChange={e => setFormPayDate(e.target.value)}
                  />
                </label>
                <label style={{ flex: 1, minWidth: 120, margin: 0 }}>Note (Optional)
                  <input
                    placeholder="Cash / UPI / GPay"
                    value={formPayNote}
                    onChange={e => setFormPayNote(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  style={{ minHeight: 42 }}
                  onClick={handleAddFormPayment}
                >
                  + Add Payment
                </button>
              </div>

              {/* Running Total & Pending Banner */}
              <div style={{ background: 'rgba(15, 27, 34, 0.9)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', margin: '14px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <span>Total Fee: <b>{ru(tot)}</b></span>
                <span>Total Paid: <b style={{ color: 'var(--teal)' }}>{ru(currentPaid)}</b></span>
                <span>Pending Balance: <b className={currentPending > 0 ? 'pend' : 'clear'}>{ru(currentPending)}</b></span>
              </div>

              <div className="bar" style={{ marginTop: 16 }}>
                <button onClick={save}>💾 Save Student Record</button>
                <button className="ghost" onClick={() => setF(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENTS TABLE */}
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th
                className="sortable-th"
                onClick={() => setSortBy(prev => prev === 'name_asc' ? 'name_desc' : 'name_asc')}
                title="Click to sort by Name (A-Z / Z-A)"
              >
                Student & Photo
                <span className="sort-badge">
                  {sortBy === 'name_asc' ? '▲ (A-Z)' : sortBy === 'name_desc' ? '▼ (Z-A)' : '↕'}
                </span>
              </th>
              <th>Batch</th>
              <th
                className="sortable-th"
                onClick={() => setSortBy(prev => prev === 'timing_asc' ? 'pc_asc' : 'timing_asc')}
                title="Click to sort by Timing or Computer"
              >
                Computer & Practice Time
                <span className="sort-badge">
                  {sortBy === 'timing_asc' ? '▲ (Time)' : sortBy === 'pc_asc' ? '▲ (PC)' : '↕'}
                </span>
              </th>
              <th>Subjects & Speed</th>
              <th
                className="sortable-th"
                onClick={() => setSortBy(prev => prev === 'total_desc' ? 'total_asc' : 'total_desc')}
                title="Click to sort by Total Course Fee"
              >
                Total Fee
                <span className="sort-badge">
                  {sortBy === 'total_desc' ? '▼' : sortBy === 'total_asc' ? '▲' : '↕'}
                </span>
              </th>
              <th
                className="sortable-th"
                onClick={() => setSortBy(prev => prev === 'paid_desc' ? 'paid_asc' : 'paid_desc')}
                title="Click to sort by Paid Amount"
              >
                Recorded Payments (Date Underneath)
                <span className="sort-badge">
                  {sortBy === 'paid_desc' ? '▼' : sortBy === 'paid_asc' ? '▲' : '↕'}
                </span>
              </th>
              <th
                className="sortable-th"
                onClick={() => setSortBy(prev => prev === 'pending_desc' ? 'pending_asc' : 'pending_desc')}
                title="Click to sort by Pending Balance"
              >
                Pending
                <span className="sort-badge">
                  {sortBy === 'pending_desc' ? '▼' : sortBy === 'pending_asc' ? '▲' : '↕'}
                </span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedList.map(s => (
              <tr key={s._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {s.photo ? (
                      <img src={s.photo} alt={s.name} className="student-avatar" />
                    ) : (
                      <div className="student-avatar">
                        {(s.name || 'S').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <b style={{ color: '#fff', fontSize: 14 }}>{s.name}</b>
                      {s.grNo && <small style={{ display: 'block', color: 'var(--brass)' }}>GR: {s.grNo}</small>}
                      <small style={{ color: 'var(--mute)', display: 'block' }}>{s.mobile}</small>
                    </div>
                  </div>
                </td>
                <td>{s.batch?.name || <em style={{ color: 'var(--mute)' }}>Unassigned</em>}</td>
                <td>
                  {s.computer ? (
                    <div>
                      <b style={{ color: 'var(--brass)' }}>🖥️ {s.computer}</b>
                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{s.timing || '—'}</div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--mute)', fontSize: 12 }}>{s.timing || 'Not assigned'}</span>
                  )}
                </td>
                <td>
                  {s.subjects?.map(x => `${x.name} ${['30', '40', '50'].includes(String(x.speed)) ? x.speed + ' WPM' : ru(x.speed)}`).join(', ')}
                </td>
                <td><b>{ru(s.total)}</b></td>
                <td>
                  {/* Payment Amount with date underneath in small box */}
                  <PaymentBoxes payments={s.payments} paid={s.paid} />
                  <div style={{ fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--mute)' }}>Total: <b style={{ color: 'var(--teal)' }}>{ru(s.paid)}</b></span>
                    <button
                      type="button"
                      className="ghost"
                      style={{ padding: '2px 8px', fontSize: 11, minHeight: 24, color: 'var(--brass)', borderColor: 'rgba(212, 162, 76, 0.4)' }}
                      title="Record new payment installment"
                      onClick={() => setActivePaymentStudent(s)}
                    >
                      + 💳 Pay
                    </button>
                  </div>
                </td>
                <td className={s.pending > 0 ? 'pend' : 'clear'}>
                  {s.pending > 0 ? ru(s.pending) : 'Cleared'}
                </td>
                <td>
                  <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="ghost"
                      style={{ padding: '4px 8px' }}
                      title="View Student Admission Card"
                      onClick={() => setActiveProfileStudent(s)}
                    >
                      👁️
                    </button>
                    {s.mobile && (
                      <button
                        className="ghost"
                        style={{ color: '#25D366', padding: '4px 8px' }}
                        title="Open WhatsApp Reminder"
                        onClick={() => {
                          const n = s.mobile.replace(/[^0-9]/g, '');
                          const num = n.length === 10 ? '91' + n : n;
                          const text = encodeURIComponent(`Dear ${s.name}, your pending fee is ${ru(s.pending)}. Please clear it at DISHA Typing Institute.`);
                          window.open('https://wa.me/' + num + '?text=' + text, '_blank');
                        }}
                      >
                        💬
                      </button>
                    )}
                    <button className="ghost" style={{ padding: '4px 8px' }} onClick={() => setF(s)}>Edit</button>
                    <button
                      className="del"
                      style={{ padding: '4px 8px' }}
                      onClick={async () => {
                        if (confirm('Delete ' + s.name + '?')) {
                          await api('/students/' + s._id, { method: 'DELETE' });
                          reload();
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <div className="empty">No students found matching your filters. Add the first one.</div>}
      </div>

      {/* QUICK PAYMENT RECORDING MODAL */}
      {activePaymentStudent && (
        <PaymentModal
          student={activePaymentStudent}
          onClose={() => setActivePaymentStudent(null)}
          reload={reload}
        />
      )}

      {/* STUDENT FULL GCC-TBC PROFILE MODAL */}
      {activeProfileStudent && (
        <StudentProfileModal
          student={activeProfileStudent}
          onClose={() => setActiveProfileStudent(null)}
          onEdit={st => {
            setActiveProfileStudent(null);
            setF(st);
          }}
        />
      )}
    </>
  );
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

  const [studentToEdit, setStudentToEdit] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const navTabs = [
    { id: 'home', label: 'Home', short: 'Home', icon: '🏠' },
    { id: 'students', label: 'Students', short: 'Students', icon: '👥' },
    { id: 'timing', label: 'Computer Timing', short: 'Timing', icon: '💻' },
    { id: 'fees', label: 'Fees & Rates', short: 'Fees', icon: '💰' },
    { id: 'notify', label: 'Fee Reminders', short: 'Alerts', icon: '💬' },
    { id: 'backup', label: 'Cloud Backup', short: 'Cloud', icon: '☁️' },
    { id: 'docs', label: 'Private Documents', short: 'Vault', icon: '🔐' }
  ];

  return (
    <div className="shell">
      {/* Mobile Top Header */}
      <header className="mobile-top-header">
        <div className="mobile-brand">
          <span className="brand-title">DISHA</span>
          <span className="brand-badge">TYPING INST.</span>
        </div>
        <div className="mobile-header-actions">
          {deferredPrompt && (
            <button type="button" className="btn-mobile-install" onClick={handleInstallPWA}>
              📱 Install
            </button>
          )}
          <button type="button" className="btn-mobile-settings" title="Server IP" onClick={() => setShowServerModal(true)}>
            ⚙️ IP
          </button>
          <button type="button" className="ghost btn-mobile-logout" title="Log out" onClick={out}>
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <nav className="desktop-nav">
        <div className="brand">DISHA</div>
        {navTabs.map(t => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span style={{marginRight:8}}>{t.icon}</span> {t.label}
          </button>
        ))}
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
        {tab === 'home' && <Home batches={batches} students={students} reload={reload} cloudCheck={cloudCheck} onRestoreCloud={handleRestoreFromCloud} onDismissBanner={() => setCloudCheck(null)} />}
        {tab === 'timing' && (
          <ComputerTiming
            students={students}
            batches={batches}
            reload={reload}
            onOpenProfile={s => setSelectedProfile(s)}
            onEditStudent={s => { setStudentToEdit(s); setTab('students'); }}
            onAddStudentForSlot={(comp, slot) => {
              setStudentToEdit({
                ...blank,
                computer: comp,
                timing: slot,
                batch: batches[0]?._id,
                subjects: [{ name: subjects[0] || 'English', speed: 30 }]
              });
              setTab('students');
            }}
          />
        )}
        {(tab === 'students' || tab === 'fees') && (
          <Students
            key={tab}
            mode={tab}
            batches={batches}
            fees={fees}
            subjects={subjects}
            reload={reload}
            students={students}
            initialStudentForm={studentToEdit}
            onClearInitialStudentForm={() => setStudentToEdit(null)}
          />
        )}
        {tab === 'notify' && <Notify batches={batches} students={students} />}
        {tab === 'backup' && <CloudBackup userEmail={u?.email} reload={reload} />}
        {tab === 'docs' && <Docs students={students} batches={batches} />}
      </main>

      {/* Full Student Profile Modal */}
      {selectedProfile && (
        <StudentProfileModal
          student={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onEdit={s => {
            setSelectedProfile(null);
            setStudentToEdit(s);
            setTab('students');
          }}
        />
      )}

      {/* Mobile Bottom Tab Navigation */}
      <nav className="mobile-bottom-nav">
        {navTabs.map(t => (
          <button 
            key={t.id} 
            type="button"
            className={`mobile-tab-btn ${tab === t.id ? 'active' : ''}`} 
            onClick={() => { setTab(t.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <span className="mobile-tab-icon">{t.icon}</span>
            <span className="mobile-tab-label">{t.short}</span>
          </button>
        ))}
      </nav>

      {showServerModal && <ServerConfigModal onClose={() => setShowServerModal(false)} />}
    </div>
  );
}

