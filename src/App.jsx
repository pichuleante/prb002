import { Routes, Route } from 'react-router-dom'
import CasesList from './pages/CasesList'
import CaseEditor from './pages/CaseEditor'
import TacticalView from './pages/TacticalView'
import AuthIcon from './components/AuthIcon'

export default function App() {
  return (
    <>
      <AuthIcon />
      <Routes>
        <Route path="/" element={<CasesList />} />
        <Route path="/case/:id" element={<TacticalView />} />
        <Route path="/case/:id/edit" element={<CaseEditor />} />
      </Routes>
    </>
  )
}
