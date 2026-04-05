import React, { useState, useEffect } from 'react'
import './Navbar.css'
import { Link, useNavigate } from 'react-router-dom'
import { getUser, logoutUser, isAuthenticated } from '../../utils/authUtils'

const Navbar = () => {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated()) {  
      setUser(getUser())      
    } else {
      setUser(null)
    }
  }, [])

  const handleLogout = () => {
    logoutUser()
    setUser(null)
    navigate('/')
  }
  function refreshPage() {
    navigate('/')
    window.location.reload();
  }

  return (
    <header className="vto-header">
      <nav className="vto-nav">
        <Link to="/" className="vto-brand" onClick={refreshPage}>Buttler</Link>

        <ul className="vto-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/contact">Contact Us</Link></li>

          {user ? (
            <>
              <li className="vto-username">Hey, {user.name.split(' ')[0]}</li>
              <li className="vto-cta">
                <button onClick={handleLogout} className="vto-logout-btn">
                  Log Out
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/signup">Sign Up</Link></li>
              <li className="vto-cta"><Link to="/signin">Sign In</Link></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  )
}

export default Navbar