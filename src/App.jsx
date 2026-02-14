import { Routes, Route } from 'react-router-dom'
import CasesList from './pages/CasesList'
import CaseEditor from './pages/CaseEditor'
import TacticalView from './pages/TacticalView'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CasesList />} />
      <Route path="/case/:id" element={<TacticalView />} />
      <Route path="/case/:id/edit" element={<CaseEditor />} />
    </Routes>
  )
}
