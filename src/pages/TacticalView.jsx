import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import TacticalBoard from '../components/TacticalBoard'
import '../styles/TacticalView.css'

export default function TacticalView() {
  const { id } = useParams()
  const [caseData, setCaseData] = useState(null)
  const [units, setUnits] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCaseData()
  }, [id])

  const loadCaseData = async () => {
    try {
      const [caseRes, unitsRes, commentsRes] = await Promise.all([
        supabase.from('casos').select('*').eq('id', id).maybeSingle()
        
      ])

      if (caseRes.error) throw caseRes.error
      //if (unitsRes.error) throw unitsRes.error
      //if (commentsRes.error) throw commentsRes.error

      setCaseData(caseRes.data)
      //setUnits(unitsRes.data || [])
      //setComments(commentsRes.data || []) 
    } catch (error) {
      console.error('Error loading case data:', error)
    } finally {
      setLoading(false)
    }
  }
/*
  const handleSaveUnits = async (updatedUnits) => {
    try {
      await supabase.from('units').delete().eq('case_id', id)

      if (updatedUnits.length > 0) {
        const { error } = await supabase.from('units').insert(
          updatedUnits.map(u => ({
            case_id: id,
            position_x: u.position.x,
            position_y: u.position.y,
            rotation: u.rotation,
            type: u.type || 'default',
            name: u.name || `Unit ${u.id}`
          }))
        )
        if (error) throw error
      }

      setUnits(updatedUnits)
    } catch (error) {
      console.error('Error saving units:', error)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{ case_id: id, content: newComment }])
        .select()

      if (error) throw error

      setComments([data[0], ...comments])
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.filter(c => c.id !== commentId))
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }*/

  if (loading) return <div className="tactical-view"><p>Loading...</p></div>
  if (!caseData) return <div className="tactical-view"><p>Case not found</p></div>

  return (
    <div className="tactical-view">
      <div className="tactical-header">
        <Link to="/" className="btn-secondary">← Atrás</Link>
        <h1>{caseData.title}</h1>
        <Link to={`/case/${id}/edit`} className="btn-primary">Editar Caso</Link>
      </div>

      <div className="tactical-content">
        <div className="board-section">
          <TacticalBoard
            caseId={id}
            initialUnits={units}
            onUnitsChange={handleSaveUnits}
          />
        </div>

        <div className="sidebar">
          {caseData.description && (
            <div className="description-section">
              <h3>Descripción</h3>
              <p>{caseData.description}</p>
            </div>
          )}

          <div className="units-section">
            <h3>Unidades ({units.length})</h3>
            {units.length === 0 ? (
              <p className="empty">No hay unidades en este caso</p>
            ) : (
              <ul className="units-list">
                {units.map(unit => (
                  <li key={unit.id}>
                    <span>{unit.name}</span>
                    <span className="unit-type">{unit.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="comments-section">
            <h3>Comentarios ({comments.length})</h3>
            <form className="comment-form" onSubmit={handleAddComment}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Agregar comentario..."
                rows="2"
              />
              <button type="submit" className="btn-primary">Comentar</button>
            </form>

            <div className="comments-list">
              {comments.map(comment => (
                <div key={comment.id} className="comment">
                  <p>{comment.content}</p>
                  <div className="comment-meta">
                    <small>{new Date(comment.created_at).toLocaleString()}</small>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
