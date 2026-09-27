import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Navigation.css'

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <div className="nav__inner container">
        <Link to="/" className="nav__logo">
          <img src="/exampleco-logo.png" alt="ExampleCo" className="nav__logo-img" />
          <span className="nav__logo-name">VISI<em>GINE</em></span>
        </Link>

        <ul className={`nav__links${menuOpen ? ' nav__links--open' : ''}`}>
          <li><a href="#features" onClick={() => setMenuOpen(false)}>Features</a></li>
          <li><a href="#how-it-works" onClick={() => setMenuOpen(false)}>So funktioniert's</a></li>
          <li><a href="#analyzer" onClick={() => setMenuOpen(false)}>Live-Analyse</a></li>
          <li><a href="#pricing" onClick={() => setMenuOpen(false)}>Preise</a></li>
        </ul>

        <div className="nav__actions">
          <a href="#pricing" className="nav__cta">Analyse starten</a>
          <button
            className={`nav__burger${menuOpen ? ' nav__burger--open' : ''}`}
            aria-label="Menü"
            onClick={() => setMenuOpen(v => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </nav>
  )
}
