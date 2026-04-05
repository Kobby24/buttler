import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Navbar from './Components/Navbar/Navbar'
 import Signup from './Components/Registration/Signup/Signup'
 import Signin from './Components/Registration/Signin/Signin'
import Contact from './Components/Contact/Contact'
import Home from "./Components/Home/Home";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} /> 
      </Routes>
    </Router>
  )
}

export default App