import { createRoot } from 'react-dom/client'
import './index.css'
import Router from './Router'

// Reset root font size to default 100%
document.documentElement.style.fontSize = ''
localStorage.removeItem('posecare_font_size')

createRoot(document.getElementById('root')).render(
  <Router />
)
