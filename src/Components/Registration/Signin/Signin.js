import React, { useState } from 'react'
import './Signin.css'
import { useNavigate, Link } from 'react-router-dom'
import { loginUserApi } from '../../../api/authApi'
import { saveAuthSession } from '../../../utils/authUtils'

const Signin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const authData = await loginUserApi({ email, password });
      saveAuthSession(authData);
      navigate("/");
      window.location.reload();
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signin-page">
      <form className="signin-card" onSubmit={handleLogin}>
        <h2>Sign In</h2>
        <div className="signin-fields">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: '#e05a5a', margin: '0 0 10px 0' }}>{error}</p>}
        <button type="submit" className="signin-btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        <p className="signin-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  )
}

export default Signin
