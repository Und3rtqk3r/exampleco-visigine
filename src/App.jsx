import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navigation from './components/Navigation/Navigation'
import Hero from './components/Hero/Hero'
import Features from './components/Features/Features'
import HowItWorks from './components/HowItWorks/HowItWorks'
import Analyzer from './components/Analyzer/Analyzer'
import Pricing from './components/Pricing/Pricing'
import Footer from './components/Footer/Footer'
import Impressum from './pages/Impressum'
import Datenschutz from './pages/Datenschutz'
import Admin from './pages/Admin'
import './App.css'

function HomePage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) e.target.classList.add('visible')
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <main>
      <Hero />
      <Features />
      <HowItWorks />
      <Analyzer />
      <Pricing />
    </main>
  )
}

function Layout() {
  const location = useLocation()
  const isLegal = location.pathname === '/impressum' || location.pathname === '/datenschutz'
  const isAdmin = location.pathname === '/admin'

  return (
    <>
      {!isAdmin && <Navigation />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/datenschutz" element={<Datenschutz />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      {!isAdmin && !isLegal && <Footer />}
      {isLegal && <Footer minimal />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
