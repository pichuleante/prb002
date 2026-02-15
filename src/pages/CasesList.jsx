import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../styles/CasesList.css'

export default function CasesList() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from('casos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCases(data || [])
    } catch (error) {
      console.error('Error loading cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCase = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      const { data, error } = await supabase
        .from('casos')
        .insert([{ title, description }])
        .select()

      if (error) throw error

      setCases([data[0], ...cases])
      setTitle('')
      setDescription('')
      setShowForm(false)
    } catch (error) {
      console.error('Error creating case:', error)
    }
  }

  const handleDeleteCase = async (id) => {
    if (!confirm('Are you sure you want to delete this case?')) return

    try {
      const { error } = await supabase
        .from('casos')
        .delete()
        .eq('id', id)

      if (error) throw error

      setCases(cases.filter(c => c.id !== id))
    } catch (error) {
      console.error('Error deleting case:', error)
    }
  }

  if (loading) return <div className="cases-container"><p>Loading...</p></div>

  return (
    <div className="cases-container">
      <div className="cases-header">
        <h1>Casos de Estudio</h1>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancelar' : 'Nuevo Caso'}
        </button>
      </div>

      {showForm && (
        <form className="case-form" onSubmit={handleCreateCase}>
          <input
            type="text"
            placeholder="Título del caso"
            value={nombre}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
          />
          <button type="submit" className="btn-primary">Crear Caso</button>
        </form>
      )}

      <div className="cases-list">
        {cases.length === 0 ? (
          <p className="empty-message">No hay casos. Crea uno nuevo para comenzar.</p>
        ) : (
          cases.map(caseItem => (
            <div key={caseItem.id} className="case-card">
              <div className="case-info">
                <h2>{caseItem.nombre}</h2>
                {caseItem.descripcion && <p>{caseItem.descripcion}</p>}
                <small>{new Date(caseItem.created_at).toLocaleDateString()}</small>
              </div>
              <div className="case-actions">
                <Link to={`/case/${caseItem.id}`} className="btn-primary">
                  Ver Mesa Táctica
                </Link>
                <Link to={`/case/${caseItem.id}/edit`} className="btn-secondary">
                  Editar
                </Link>
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteCase(caseItem.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
