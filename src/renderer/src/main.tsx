import { createRoot } from 'react-dom/client'
import 'pdfjs-dist/web/pdf_viewer.css'
import App from './App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(<App />)
