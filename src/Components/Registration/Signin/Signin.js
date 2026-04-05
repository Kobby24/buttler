import React, { useState } from 'react'
import './Signin.css'
import { useNavigate, Link } from 'react-router-dom'
import { getUser, loginUser } from '../../../utils/authUtils'

const Signin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const savedUser = getUser();

    if (!savedUser) {
      alert("No account found. Please sign up first.");
      return;
    }

    if (savedUser.email === email && savedUser.password === password) {
      loginUser(); 
      navigate("/");
      window.location.reload();
    } else {
      alert("Invalid credentials");
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
        <button type="submit" className="signin-btn">Sign In</button>
        <p className="signin-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  )
}

export default Signin