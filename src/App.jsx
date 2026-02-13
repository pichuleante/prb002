import { useState, useCallback } from 'react'
import { Stage, Layer, Rect, Group } from 'react-konva'
import './App.css'

/**
 * ============================================================
 * DOCUMENTACIÓN DE LÓGICA Y CONTROL DE CAMBIOS - TACTICAL BOARD
 * ============================================================
 * * --- REGLAS DE ORO DEL SISTEMA ---
 * 1. COORDENADAS: El "Mundo" (Mapa) es independiente del "Stage" (Vista).
 * Fórmula: WorldPos = (PointerPos - StagePos) / Scale
 * 2. PIVOT DE ROTACIÓN: 
 * - 'Right': Punto fijo en la esquina delantera derecha de la unidad.
 * - 'Left': Punto fijo en la esquina delantera izquierda (calculado con UNIT_WIDTH).
 * 3. ORIENTACIÓN: 0° es "Norte" (hacia arriba en el eje Y). 
 * Cálculo: Math.atan2(dx, -dy) -> (angle * 180 / PI).
 * * --- CHECKLIST DE VERIFICACIÓN (QA) ---
 * [ ] Zoom: Centrado en la posición del puntero del ratón.
 * [ ] Movimiento: Drag & Drop libre cuando no hay herramientas activas.
 * [ ] Rotación: Restringida a un arco de 90° desde el pivote frontal.
 * [ ] Avance: Movimiento lineal forzado en el eje local "Y" de la unidad.
 * [ ] Slide: Movimiento lateral forzado en el eje local "X" de la unidad.
 * * --- HISTORIAL DE CAMBIOS ---
 * v1.0 - Base estable con rotación, avance y slide.
 * v1.1 - Refactorización de estructura y adición de cabecera de control. (ACTUAL)
 * ============================================================
 */

// --- CONFIGURACIÓN Y CONSTANTES ---
const SETTINGS = {
  UNIT: { WIDTH: 100, HEIGHT: 60 },
  MAP: { WIDTH: 3000, HEIGHT: 2000 },
  VIEW: { WIDTH: 700, HEIGHT: 500 },
  ZOOM: { MIN: 0.3, MAX: 3, STEP: 1.05 }
}

// --- UTILIDADES MATEMÁTICAS ---
function angleFromPivot(pivotX, pivotY, pointerX, pointerY) {
  const dx = pointerX - pivotX
  const dy = pointerY - pivotY
  const angleRad = Math.atan2(dx, -dy)
  return (angleRad * 180) / Math.PI
}

function App() {
  // --- ESTADO ---
  const [units, setUnits] = useState([
    { id: 0, position: { x: 200, y: 220 }, rotation: 0, isSelected: false }
  ])
  const [stageScale, setStageScale] = useState(1)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })

  // Estados de interacción (Drags específicos)
  const [rotationDrag, setRotationDrag] = useState({ active: false, unitId: null, pivot: null, startAngle: 0, startRotation: 0, pivotX: 0, pivotY: 0 })
  const [advanceDrag, setAdvanceDrag] = useState({ active: false, unitId: null, startPointer: { x: 0, y: 0 }, startPosition: { x: 0, y: 0 }, rotationAtStart: 0 })
  const [slideDrag, setSlideDrag] = useState({ active: false, unitId: null, startPointer: { x: 0, y: 0 }, startPosition: { x: 0, y: 0 }, rotationAtStart: 0 })

  // --- HANDLERS DE CÁMARA (ZOOM & PAN) ---
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!stage || !pointer) return

    const oldScale = stageScale
    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? 1 : -1
    let newScale = direction > 0 ? oldScale / SETTINGS.ZOOM.STEP : oldScale * SETTINGS.ZOOM.STEP
    newScale = Math.max(SETTINGS.ZOOM.MIN, Math.min(SETTINGS.ZOOM.MAX, newScale))

    setStageScale(newScale)
    setStagePosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }, [stageScale, stagePosition])

  // --- HANDLERS DE MOVIMIENTO Y LÓGICA ---
  const handlePointerMove = useCallback((e) => {
    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!stage || !pointer) return

    const worldX = (pointer.x - stagePosition.x) / stageScale
    const worldY = (pointer.y - stagePosition.y) / stageScale

    // 1. Lógica de Rotación
    if (rotationDrag.active && rotationDrag.unitId !== null) {
      const angleNow = angleFromPivot(rotationDrag.pivotX, rotationDrag.pivotY, worldX, worldY)
      let delta = (((angleNow - rotationDrag.startAngle) + 540) % 360) - 180

      // Restricciones de ángulo según pivote
      if (rotationDrag.pivot === 'right') delta = Math.max(-90, Math.min(0, delta))
      else delta = Math.max(0, Math.min(90, delta))

      const nextRot = rotationDrag.startRotation + delta

      setUnits(prev => prev.map(u => {
        if (u.id !== rotationDrag.unitId) return u
        let newPos = u.position
        if (rotationDrag.pivot === 'left') {
          const rad = (nextRot * Math.PI) / 180
          newPos = {
            x: rotationDrag.pivotX - SETTINGS.UNIT.WIDTH * Math.cos(rad),
            y: rotationDrag.pivotY - SETTINGS.UNIT.WIDTH * Math.sin(rad)
          }
        }
        return { ...u, rotation: nextRot, position: newPos }
      }))
      return
    }

    // 2. Lógica de Avance (Eje Y Local)
    if (advanceDrag.active) {
      const rad = (advanceDrag.rotationAtStart * Math.PI) / 180
      const fx = Math.sin(rad), fy = -Math.cos(rad)
      const dx = worldX - advanceDrag.startPointer.x, dy = worldY - advanceDrag.startPointer.y
      let t = Math.max(0, dx * fx + dy * fy)

      setUnits(prev => prev.map(u => u.id === advanceDrag.unitId 
        ? { ...u, position: { x: advanceDrag.startPosition.x + fx * t, y: advanceDrag.startPosition.y + fy * t } } 
        : u))
      return
    }

    // 3. Lógica de Slide (Eje X Local)
    if (slideDrag.active) {
      const rad = (slideDrag.rotationAtStart * Math.PI) / 180
      const sx = Math.cos(rad), sy = Math.sin(rad)
      const dx = worldX - slideDrag.startPointer.x, dy = worldY - slideDrag.startPointer.y
      let t = Math.max(-SETTINGS.UNIT.WIDTH, Math.min(SETTINGS.UNIT.WIDTH, dx * sx + dy * sy))

      setUnits(prev => prev.map(u => u.id === slideDrag.unitId 
        ? { ...u, position: { x: slideDrag.startPosition.x + sx * t, y: slideDrag.startPosition.y + sy * t } } 
        : u))
    }
  }, [rotationDrag, advanceDrag, slideDrag, stageScale, stagePosition])

  // --- INICIO DE DRAGS ---
  const startRotationDrag = (unitId, e, pivot) => {
    e.cancelBubble = true
    const unit = units.find(u => u.id === unitId)
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    const wX = (pointer.x - stagePosition.x) / stageScale
    const wY = (pointer.y - stagePosition.y) / stageScale

    const rad = (unit.rotation * Math.PI) / 180
    let pX = unit.position.x, pY = unit.position.y
    if (pivot === 'left') {
      pX += SETTINGS.UNIT.WIDTH * Math.cos(rad)
      pY += SETTINGS.UNIT.WIDTH * Math.sin(rad)
    }

    setRotationDrag({ active: true, unitId, pivot, startAngle: angleFromPivot(pX, pY, wX, wY), startRotation: unit.rotation, pivotX: pX, pivotY: pY })
  }

  const handlePointerEnd = () => {
    setRotationDrag(p => ({ ...p, active: false }))
    setAdvanceDrag(p => ({ ...p, active: false }))
    setSlideDrag(p => ({ ...p, active: false }))
  }

  // --- RENDERING ---
  const isDraggingAny = rotationDrag.active || advanceDrag.active || slideDrag.active

  return (
    <div className="tactical-board-wrapper">
      <h1 className="board-title">Mesa táctica v1.1</h1>
      
      <div className="stage-container">
        <Stage
          width={SETTINGS.VIEW.WIDTH}
          height={SETTINGS.VIEW.HEIGHT}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          draggable={!isDraggingAny}
          onWheel={handleWheel}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerEnd}
          onMouseDown={() => setUnits(units.map(u => ({ ...u, isSelected: false })))}
        >
          <Layer>
            <Rect x={0} y={0} width={SETTINGS.MAP.WIDTH} height={SETTINGS.MAP.HEIGHT} fill="#1e3320" listening={false} />

            {units.map(unit => (
              <Group
                key={unit.id}
                x={unit.position.x}
                y={unit.position.y}
                rotation={unit.rotation}
                draggable={!isDraggingAny}
                onDragEnd={(e) => setUnits(units.map(u => u.id === unit.id ? { ...u, position: { x: e.target.x(), y: e.target.y() } } : u))}
                onMouseDown={(e) => { e.cancelBubble = true; setUnits(units.map(u => ({ ...u, isSelected: u.id === unit.id }))) }}
              >
                {/* Cuerpo de la Unidad */}
                <Rect width={SETTINGS.UNIT.WIDTH} height={SETTINGS.UNIT.HEIGHT} fill="#3d5c3a" stroke={unit.isSelected ? '#ffeb3b' : '#c9a227'} strokeWidth={unit.isSelected ? 3 : 2} />
                
                {/* Indicador Frontal */}
                <Rect x={SETTINGS.UNIT.WIDTH / 2 - 4} y={-8} width={8} height={8} fill="#c9a227" />

                {unit.isSelected && (
                  <>
                    {/* Controles de Rotación (Esquinas) */}
                    <Rect x={SETTINGS.UNIT.WIDTH - 10} y={-10} width={16} height={16} fill="#c9a227" cornerRadius={3} onMouseDown={(e) => startRotationDrag(unit.id, e, 'right')} />
                    <Rect x={-6} y={-10} width={16} height={16} fill="#c9a227" cornerRadius={3} onMouseDown={(e) => startRotationDrag(unit.id, e, 'left')} />
                    
                    {/* Control de Avance */}
                    <Rect x={SETTINGS.UNIT.WIDTH / 2 - 6} y={-18} width={12} height={18} fill="#4dd0e1" cornerRadius={3} 
                      onMouseDown={(e) => {
                        e.cancelBubble = true
                        const p = e.target.getStage().getPointerPosition()
                        setAdvanceDrag({ active: true, unitId: unit.id, startPointer: { x: (p.x - stagePosition.x)/stageScale, y: (p.y - stagePosition.y)/stageScale }, startPosition: unit.position, rotationAtStart: unit.rotation })
                      }} 
                    />

                    {/* Control de Slide (Centro) */}
                    <Rect x={SETTINGS.UNIT.WIDTH / 2 - 6} y={SETTINGS.UNIT.HEIGHT / 2 - 6} width={12} height={12} fill="#90caf9" cornerRadius={3}
                      onMouseDown={(e) => {
                        e.cancelBubble = true
                        const p = e.target.getStage().getPointerPosition()
                        setSlideDrag({ active: true, unitId: unit.id, startPointer: { x: (p.x - stagePosition.x)/stageScale, y: (p.y - stagePosition.y)/stageScale }, startPosition: unit.position, rotationAtStart: unit.rotation })
                      }}
                    />
                  </>
                )}
              </Group>
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}

export default App