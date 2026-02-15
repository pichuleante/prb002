import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../styles/CaseEditor.css'

export default function CaseEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [nombre, setTitle] = useState('')
  const [descripcion, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCase()
  }, [id])

  const loadCase = async () => {
    try {
      const { data, error } = await supabase
        .from('casos')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        navigate('/')
        return
      }

      setCaseData(data)
      setTitle(data.nombre)
      setDescription(data.descripcion || '')
    } catch (error) {
      console.error('Error loading case:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          nombre,
          descripcion,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      navigate('/')
    } catch (error) {
      console.error('Error saving case:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="editor-container"><p>Loading...</p></div>
  if (!caseData) return <div className="editor-container"><p>Case not found</p></div>

  return (
    <div className="editor-container">
      <div className="editor-header">
        <Link to="/" className="btn-secondary">← Atrás</Link>
        <h1>Editar Caso</h1>
      </div>

      <form className="editor-form" onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="title">Título</label>
          <input
            id="title"
            type="text"
            value={nombre}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Descripción</label>
          <textarea
            id="description"
            value={descripcion}
            onChange={(e) => setDescription(e.target.value)}
            rows="5"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link to="/" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
