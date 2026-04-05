import React, { useState } from 'react'
import './Signup.css'
import { useNavigate, Link } from 'react-router-dom'
import { saveUser, loginUser } from '../../../utils/authUtils'

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = (e) => {
    e.preventDefault();
    saveUser({ name, email, password }); 
    loginUser();                         
    navigate("/");
    window.location.reload();
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
        <button type="submit" className="signup-btn">Create Account</button>
        <div className="signup-divider">or</div>
        <p className="signup-footer">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </form>
    </div>
  )
}

export default Signup