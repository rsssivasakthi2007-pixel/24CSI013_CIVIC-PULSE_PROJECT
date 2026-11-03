import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import { api } from './api';
import { useAuth } from './App.jsx';

const CENTER = [11.0168, 76.9558]; // Coimbatore - change to your city
const COLORS = { Pending: '#e67e22', 'In Progress': '#2980b9', Resolved: '#27ae60', Rejected: '#7f8c8d' };
const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
const CATS = ['Pothole', 'Garbage', 'Streetlight', 'Drainage', 'Other'];
const PRIOS = ['Low', 'Medium', 'High'];

const Badge = ({ s }) => <span className="badge" style={{ background: COLORS[s] || '#555' }}>{s}</span>;
const Bars = ({ title, data }) => {
  const max = Math.max(1, ...Object.values(data || {}));
  return <div className="card"><h4>{title}</h4>{Object.entries(data || {}).map(([k, v]) =>
    <div key={k} className="bar"><span>{k}</span><i style={{ width: (v / max) * 100 + '%' }} /><b>{v}</b></div>)}</div>;
};
const StatCards = ({ s }) => s && <div className="grid">
  <div className="card stat"><b>{s.total}</b>Total</div>
  <div className="card stat"><b>{s.byStatus?.Pending || 0}</b>Pending</div>
  <div className="card stat"><b>{s.byStatus?.['In Progress'] || 0}</b>In Progress</div>
  <div className="card stat"><b>{s.byStatus?.Resolved || 0}</b>Resolved</div>
  <div className="card stat"><b>{s.avgResolutionHours}h</b>Avg resolution</div>
</div>;

export function MapView({ items, height = 380 }) {
  return <MapContainer center={CENTER} zoom={12} style={{ height }} className="map">
    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {items.filter(c => c.location?.lat).map(c => <CircleMarker key={c._id} center={[c.location.lat, c.location.lng]} radius={9}
      pathOptions={{ color: COLORS[c.status], fillOpacity: .8 }}>
      <Popup><b>{c.title}</b><br />{c.category} · {c.priority}<br />{c.status}</Popup></CircleMarker>)}
  </MapContainer>;
}
function Picker({ pos, setPos }) { useMapEvents({ click: e => setPos([e.latlng.lat, e.latlng.lng]) }); return pos ? <Marker position={pos} /> : null; }

export function Public() {
  const [s, setS] = useState(), [list, setList] = useState([]);
  useEffect(() => { api('/public/stats').then(setS); api('/public/complaints').then(setList); }, []);
  return <><h2>Public Complaint Dashboard</h2>
    <p>Transparent view of civic issues in our city. <Link to="/register">Register</Link> to report one.</p>
    <StatCards s={s} />
    <div className="grid2"><Bars title="By category" data={s?.byCategory} /><Bars title="By department" data={s?.byDepartment} /></div>
    <h3>Complaint map</h3><MapView items={list} />
    <div className="legend">{STATUSES.map(x => <span key={x}><i style={{ background: COLORS[x] }} />{x}</span>)}</div></>;
}

function AuthForm({ mode }) {
  const { login } = useAuth(); const reg = mode === 'register';
  const [f, setF] = useState({ name: '', email: '', password: '' }), [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => { e.preventDefault(); setErr(''); try { login(await api(reg ? '/auth/register' : '/auth/login', { method: 'POST', body: f })); } catch (x) { setErr(x.message); } };
  return <form className="card form" onSubmit={submit}><h2>{reg ? 'Citizen Registration' : 'Login (Citizen / Admin)'}</h2>
    {reg && <input placeholder="Full name" value={f.name} onChange={set('name')} required />}
    <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
    <input type="password" placeholder="Password (min 6)" value={f.password} onChange={set('password')} required />
    {err && <p className="err">{err}</p>}<button>{reg ? 'Register' : 'Login'}</button></form>;
}
export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;

export function NewComplaint() {
  const [f, setF] = useState({ title: '', description: '', category: 'Auto', address: '' });
  const [pos, setPos] = useState(null), [photo, setPhoto] = useState(null), [ai, setAi] = useState(null), [msg, setMsg] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const suggest = () => f.title && f.description && api('/complaints/classify', { method: 'POST', body: f }).then(setAi);
  const here = () => navigator.geolocation?.getCurrentPosition(p => setPos([p.coords.latitude, p.coords.longitude]));
  const submit = async e => {
    e.preventDefault(); setMsg('');
    if (!pos) return setMsg('Please pick a location on the map');
    const fd = new FormData(); Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    fd.append('lat', pos[0]); fd.append('lng', pos[1]); if (photo) fd.append('photo', photo);
    try { const c = await api('/complaints', { method: 'POST', form: fd });
      setMsg(`Submitted! Auto-assigned to ${c.department} with ${c.priority} priority.`); setF({ title: '', description: '', category: 'Auto', address: '' }); setPhoto(null); setAi(null);
    } catch (x) { setMsg(x.message); }
  };
  return <form className="card form wide" onSubmit={submit}><h2>Report a civic issue</h2>
    <input placeholder="Title" value={f.title} onChange={set('title')} onBlur={suggest} required />
    <textarea placeholder="Describe the problem" rows={4} value={f.description} onChange={set('description')} onBlur={suggest} required />
    {ai && <p className="ai">AI suggestion: <b>{ai.category}</b> → {ai.department} · priority <b>{ai.priority}</b></p>}
    <select value={f.category} onChange={set('category')}><option value="Auto">Category: Auto-detect (AI)</option>{CATS.map(c => <option key={c}>{c}</option>)}</select>
    <input placeholder="Landmark / address (optional)" value={f.address} onChange={set('address')} />
    <label>Photo <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} /></label>
    <div><button type="button" onClick={here}>Use my location</button> or click on the map {pos && <small>({pos[0].toFixed(4)}, {pos[1].toFixed(4)})</small>}</div>
    <MapContainer center={pos || CENTER} zoom={13} style={{ height: 300 }} className="map"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Picker pos={pos} setPos={setPos} /></MapContainer>
    {msg && <p className="ai">{msg}</p>}<button>Submit complaint</button></form>;
}

function Filters({ f, setF, extra }) {
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return <div className="filters"><input placeholder="Search..." value={f.q} onChange={set('q')} />
    <select value={f.status} onChange={set('status')}><option value="">All status</option>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
    <select value={f.category} onChange={set('category')}><option value="">All categories</option>{CATS.map(x => <option key={x}>{x}</option>)}</select>
    <select value={f.priority} onChange={set('priority')}><option value="">All priorities</option>{PRIOS.map(x => <option key={x}>{x}</option>)}</select>
    {extra}</div>;
}
const useList = () => {
  const [f, setF] = useState({ q: '', status: '', category: '', priority: '', department: '' }), [list, setList] = useState([]);
  const load = () => api('/complaints?' + new URLSearchParams(Object.entries(f).filter(([, v]) => v))).then(setList);
  useEffect(() => { load(); }, [f]);
  return { f, setF, list, load };
};
const Timeline = ({ h }) => <ul className="timeline">{h.map((x, i) => <li key={i}><b>{x.status}</b> – {x.note} <small>({x.by}, {new Date(x.at).toLocaleString()})</small></li>)}</ul>;

function Feedback({ c, done }) {
  const [r, setR] = useState(5), [t, setT] = useState('');
  return <div className="fb"><select value={r} onChange={e => setR(e.target.value)}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}</select>
    <input placeholder="Feedback" value={t} onChange={e => setT(e.target.value)} />
    <button onClick={() => api(`/complaints/${c._id}/feedback`, { method: 'POST', body: { rating: r, comment: t } }).then(done)}>Send</button></div>;
}
export function MyComplaints() {
  const { f, setF, list, load } = useList(); const [open, setOpen] = useState(null);
  const edit = async c => { const title = prompt('Title', c.title); if (title) { await api('/complaints/' + c._id, { method: 'PUT', body: { title } }); load(); } };
  const del = async c => { if (confirm('Delete this complaint?')) { await api('/complaints/' + c._id, { method: 'DELETE' }); load(); } };
  return <><h2>My Complaints</h2><Filters f={f} setF={setF} />
    {list.map(c => <div className="card" key={c._id}>
      <div className="row"><h4>{c.title}</h4><Badge s={c.status} /></div>
      <p>{c.description}</p>
      <small>{c.category} · {c.department} · Priority: {c.priority}{c.resolutionHours != null && ` · Resolved in ${c.resolutionHours}h`}</small>
      {c.photo && <div><img src={c.photo} className="thumb" /></div>}
      <div className="row2"><button onClick={() => setOpen(open === c._id ? null : c._id)}>History</button>
        {c.status === 'Pending' && <><button onClick={() => edit(c)}>Edit</button><button className="danger" onClick={() => del(c)}>Delete</button></>}</div>
      {open === c._id && <Timeline h={c.history} />}
      {c.status === 'Resolved' && (c.feedback?.rating ? <p>Your feedback: {c.feedback.rating} ★ {c.feedback.comment}</p> : <Feedback c={c} done={load} />)}
    </div>)}
    {!list.length && <p>No complaints found. <Link to="/new">Report one</Link></p>}</>;
}

export function Admin() {
  const { f, setF, list, load } = useList(); const [s, setS] = useState(), [open, setOpen] = useState(null);
  const refresh = () => { load(); api('/admin/stats').then(setS); };
  useEffect(() => { api('/admin/stats').then(setS); }, []);
  const upd = async (c, body) => { const note = body.status ? prompt('Note for the citizen (optional)') : ''; await api('/complaints/' + c._id, { method: 'PUT', body: { ...body, note } }); refresh(); };
  const del = async c => { if (confirm('Delete complaint?')) { await api('/complaints/' + c._id, { method: 'DELETE' }); refresh(); } };
  const depts = s?.departments || [];
  return <><h2>Admin Dashboard</h2><StatCards s={s} />
    {s?.avgRating && <p>Average citizen rating: <b>{s.avgRating} ★</b></p>}
    <div className="grid2"><Bars title="By category" data={s?.byCategory} /><Bars title="By department" data={s?.byDepartment} /></div>
    <MapView items={list} height={300} />
    <h3>Manage complaints</h3>
    <Filters f={f} setF={setF} extra={<select value={f.department} onChange={e => setF({ ...f, department: e.target.value })}><option value="">All departments</option>{depts.map(d => <option key={d}>{d}</option>)}</select>} />
    <div className="scroll"><table><thead><tr><th>Complaint</th><th>By</th><th>Category</th><th>Department</th><th>Priority</th><th>Status</th><th>Time</th><th /></tr></thead><tbody>
      {list.map(c => <>
        <tr key={c._id}><td><b>{c.title}</b><br /><small>{c.description.slice(0, 60)}</small>{c.photo && <> <a href={c.photo} target="_blank">photo</a></>}</td>
          <td>{c.citizen?.name}</td><td>{c.category}</td>
          <td><select value={c.department} onChange={e => upd(c, { department: e.target.value })}>{depts.map(d => <option key={d}>{d}</option>)}</select></td>
          <td><select value={c.priority} onChange={e => upd(c, { priority: e.target.value })}>{PRIOS.map(p => <option key={p}>{p}</option>)}</select></td>
          <td><select value={c.status} onChange={e => upd(c, { status: e.target.value })}>{STATUSES.map(p => <option key={p}>{p}</option>)}</select></td>
          <td>{c.resolutionHours != null ? c.resolutionHours + 'h' : '-'}{c.feedback?.rating && <><br />{c.feedback.rating}★</>}</td>
          <td><button onClick={() => setOpen(open === c._id ? null : c._id)}>History</button> <button className="danger" onClick={() => del(c)}>Del</button></td></tr>
        {open === c._id && <tr key={c._id + 'h'}><td colSpan={8}><Timeline h={c.history} />{c.feedback?.comment && <p>Feedback: {c.feedback.comment}</p>}</td></tr>}
      </>)}</tbody></table></div></>;
}
