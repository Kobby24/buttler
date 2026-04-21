import React, { useState } from 'react'
import './Signup.css'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../../../api/authApi'
import { saveAuthSession } from '../../../utils/authUtils'

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const authData = await registerUser({ name, email, password });
      saveAuthSession(authData);
      navigate("/");
      window.location.reload();
    } catch (err) {
      setError(err.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <form className="signup-card" onSubmit={handleSignup}>
        <h2>Sign Up</h2>
        <div className="signup-fields">
          <input type="text" placeholder="Full Name" onChange={(e) => setName(e.target.value)} required />
          <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p style={{ color: '#e05a5a', margin: '0 0 10px 0' }}>{error}</p>}
        <button type="submit" className="signup-btn" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        <div className="signup-divider">or</div>
        <p className="signup-footer">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </form>
    </div>
  )
}

export default Signup
