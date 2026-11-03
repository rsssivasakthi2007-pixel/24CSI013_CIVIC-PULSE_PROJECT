import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, getToken } from './api';
import { Admin, Login, MyComplaints, NewComplaint, Public, Register } from './pages.jsx';
export const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);

export default function App() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false);
  const nav = useNavigate();
  useEffect(() => { (getToken() ? api('/auth/me').then(setUser).catch(() => localStorage.removeItem('cp_token')) : Promise.resolve()).finally(() => setReady(true)); }, []);
  const login = ({ token, user }) => { localStorage.setItem('cp_token', token); setUser(user); nav(user.role === 'admin' ? '/admin' : '/my'); };
  const logout = () => { localStorage.removeItem('cp_token'); setUser(null); nav('/'); };
  if (!ready) return <p style={{ padding: 20 }}>Loading...</p>;
  const guard = (role, el) => !user ? <Navigate to="/login" /> : user.role !== role ? <Navigate to="/" /> : el;
  return (
    <AuthCtx.Provider value={{ user, login }}>
      <nav className="nav">
        <Link to="/" className="brand">CivicPulse</Link>
        <Link to="/">Public Dashboard</Link>
        {user?.role === 'citizen' && <><Link to="/new">Report Issue</Link><Link to="/my">My Complaints</Link></>}
        {user?.role === 'admin' && <Link to="/admin">Admin Dashboard</Link>}
        <span style={{ flex: 1 }} />
        {user ? <><span>{user.name} ({user.role})</span><button onClick={logout}>Logout</button></> : <><Link to="/login">Login</Link><Link to="/register">Register</Link></>}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Public />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/new" element={guard('citizen', <NewComplaint />)} />
          <Route path="/my" element={guard('citizen', <MyComplaints />)} />
          <Route path="/admin" element={guard('admin', <Admin />)} />
        </Routes>
      </main>
    </AuthCtx.Provider>
  );
}
