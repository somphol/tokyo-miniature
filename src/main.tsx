import { createRoot } from 'react-dom/client'
import App from './App'
import { installScene } from './capture'
import './style.css'

installScene()
createRoot(document.getElementById('root')!).render(<App />)
