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
 * [X] Zoom: Centrado en la posición del puntero del ratón.
 * [X] Movimiento: Drag & Drop libre cuando no hay herramientas activas.
 * [X] Rotación: Restringida a un arco de 90° desde el pivote frontal.
 * [X] Avance: Movimiento lineal forzado en el eje local "Y" de la unidad.
 * [X] Slide: Movimiento lateral forzado en el eje local "X" de la unidad.
 * [X] Variaciones: Giros instantáneos de 90° y 180° con reposicionamiento de pivot.
 * * --- HISTORIAL DE CAMBIOS ---
 * v1.0 - Base estable con rotación, avance y slide.
 * v1.1 - Refactorización de estructura y adición de cabecera de control.
 * v1.2 - Restauración de Variaciones (90° L/R) y Media Vuelta (180°). (ACTUAL)
 * ============================================================
 */

const SETTINGS = {
  UNIT: { WIDTH: 100, HEIGHT: 60 },
  MAP: { WIDTH: 3000, HEIGHT: 2000 },
  VIEW: { WIDTH: 700, HEIGHT: 500 },
  ZOOM: { MIN: 0.3, MAX: 3, STEP: 1.05 }
}

function angleFromPivot(pivotX, pivotY, pointerX, pointerY) {
  const dx = pointerX - pivotX
  const dy = pointerY - pivotY
  const angleRad = Math.atan2(dx, -dy)
  return (angleRad * 180) / Math.PI
}

function App() {
  const [units, setUnits] = useState([
    { id: 0, position: { x: 200, y: 220 }, rotation: 0, isSelected: false }
  ])
  const [stageScale, setStageScale] = useState(1)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })

  const [rotationDrag, setRotationDrag] = useState({ active: false, unitId: null, pivot: null, startAngle: 0, startRotation: 0, pivotX: 0, pivotY: 0 })
  const [advanceDrag, setAdvanceDrag] = useState({ active: false, unitId: null, startPointer: { x: 0, y: 0 }, startPosition: { x: 0, y: 0 }, rotationAtStart: 0 })
  const [slideDrag, setSlideDrag] = useState({ active: false, unitId: null, startPointer: { x: 0, y: 0 }, startPosition: { x: 0, y: 0 }, rotationAtStart: 0 })

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!stage || !pointer) return
    const oldScale = stageScale
    const mousePointTo = { x: (pointer.x - stagePosition.x) / oldScale, y: (pointer.y - stagePosition.y) / oldScale }
    const direction = e.evt.deltaY > 0 ? 1 : -1
    let newScale = direction > 0 ? oldScale / SETTINGS.ZOOM.STEP : oldScale * SETTINGS.ZOOM.STEP
    newScale = Math.max(SETTINGS.ZOOM.MIN, Math.min(SETTINGS.ZOOM.MAX, newScale))
    setStageScale(newScale)
    setStagePosition({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale })
  }, [stageScale, stagePosition])

  // --- LÓGICA DE VARIACIONES (INSTANTÁNEAS) ---
  const handleVariation = (unitId, type) => {
    setUnits(prev => prev.map(unit => {
      if (unit.id !== unitId) return unit
      const rad = (unit.rotation * Math.PI) / 180
      let nextRotation = unit.rotation
      let newPos = { ...unit.position }

      if (type === 'left') {
        nextRotation -= 90
        const radNext = (nextRotation * Math.PI) / 180
        newPos.x -= SETTINGS.UNIT.WIDTH * Math.cos(radNext)
        newPos.y -= SETTINGS.UNIT.WIDTH * Math.sin(radNext)
      } else if (type === 'right') {
        newPos.x += SETTINGS.UNIT.WIDTH * Math.cos(rad)
        newPos.y += SETTINGS.UNIT.WIDTH * Math.sin(rad)
        nextRotation += 90
      } else if (type === 'half') {
        newPos.x += SETTINGS.UNIT.HEIGHT * -Math.sin(rad) + SETTINGS.UNIT.WIDTH * Math.cos(rad)
        newPos.y += SETTINGS.UNIT.HEIGHT * Math.cos(rad) + SETTINGS.UNIT.WIDTH * Math.sin(rad)
        nextRotation += 180
      }

      return { ...unit, rotation: nextRotation, position: newPos }
    }))
  }

  const handlePointerMove = useCallback((e) => {
    const stage = e.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!stage || !pointer) return
    const worldX = (pointer.x - stagePosition.x) / stageScale
    const worldY = (pointer.y - stagePosition.y) / stageScale

    if (rotationDrag.active) {
      const angleNow = angleFromPivot(rotationDrag.pivotX, rotationDrag.pivotY, worldX, worldY)
      let delta = (((angleNow - rotationDrag.startAngle) + 540) % 360) - 180
      if (rotationDrag.pivot === 'right') delta = Math.max(-90, Math.min(0, delta))
      else delta = Math.max(0, Math.min(90, delta))
      const nextRot = rotationDrag.startRotation + delta
      setUnits(prev => prev.map(u => {
        if (u.id !== rotationDrag.unitId) return u
        let newPos = u.position
        if (rotationDrag.pivot === 'left') {
          const rad = (nextRot * Math.PI) / 180
          newPos = { x: rotationDrag.pivotX - SETTINGS.UNIT.WIDTH * Math.cos(rad), y: rotationDrag.pivotY - SETTINGS.UNIT.WIDTH * Math.sin(rad) }
        }
        return { ...u, rotation: nextRot, position: newPos }
      }))
    }
    if (advanceDrag.active) {
      const rad = (advanceDrag.rotationAtStart * Math.PI) / 180
      const fx = Math.sin(rad), fy = -Math.cos(rad)
      let t = Math.max(0, (worldX - advanceDrag.startPointer.x) * fx + (worldY - advanceDrag.startPointer.y) * fy)
      setUnits(prev => prev.map(u => u.id === advanceDrag.unitId ? { ...u, position: { x: advanceDrag.startPosition.x + fx * t, y: advanceDrag.startPosition.y + fy * t } } : u))
    }
    if (slideDrag.active) {
      const rad = (slideDrag.rotationAtStart * Math.PI) / 180
      const sx = Math.cos(rad), sy = Math.sin(rad)
      let t = Math.max(-SETTINGS.UNIT.WIDTH, Math.min(SETTINGS.UNIT.WIDTH, (worldX - slideDrag.startPointer.x) * sx + (worldY - slideDrag.startPointer.y) * sy))
      setUnits(prev => prev.map(u => u.id === slideDrag.unitId ? { ...u, position: { x: slideDrag.startPosition.x + sx * t, y: slideDrag.startPosition.y + sy * t } } : u))
    }
  }, [rotationDrag, advanceDrag, slideDrag, stageScale, stagePosition])

  const startRotationDrag = (unitId, e, pivot) => {
    e.cancelBubble = true
    const unit = units.find(u => u.id === unitId)
    const pointer = e.target.getStage().getPointerPosition()
    const wX = (pointer.x - stagePosition.x) / stageScale, wY = (pointer.y - stagePosition.y) / stageScale
    const rad = (unit.rotation * Math.PI) / 180
    let pX = unit.position.x, pY = unit.position.y
    if (pivot === 'left') { pX += SETTINGS.UNIT.WIDTH * Math.cos(rad); pY += SETTINGS.UNIT.WIDTH * Math.sin(rad); }
    setRotationDrag({ active: true, unitId, pivot, startAngle: angleFromPivot(pX, pY, wX, wY), startRotation: unit.rotation, pivotX: pX, pivotY: pY })
  }

  const handlePointerEnd = () => { setRotationDrag(p => ({ ...p, active: false })); setAdvanceDrag(p => ({ ...p, active: false })); setSlideDrag(p => ({ ...p, active: false })); }

  const isDraggingAny = rotationDrag.active || advanceDrag.active || slideDrag.active

  return (
    <div className="tactical-board-wrapper">
      <h1 className="board-title">Mesa táctica v1.2</h1>
      <div className="stage-container">
        <Stage
          width={SETTINGS.VIEW.WIDTH} height={SETTINGS.VIEW.HEIGHT}
          scaleX={stageScale} scaleY={stageScale} x={stagePosition.x} y={stagePosition.y}
          draggable={!isDraggingAny} onWheel={handleWheel} onMouseMove={handlePointerMove} onMouseUp={handlePointerEnd}
          onMouseDown={() => setUnits(units.map(u => ({ ...u, isSelected: false })))}
        >
          <Layer>
            <Rect x={0} y={0} width={SETTINGS.MAP.WIDTH} height={SETTINGS.MAP.HEIGHT} fill="#1e3320" listening={false} />
            {units.map(unit => (
              <Group key={unit.id} x={unit.position.x} y={unit.position.y} rotation={unit.rotation} draggable={!isDraggingAny}
                onDragEnd={(e) => setUnits(units.map(u => u.id === unit.id ? { ...u, position: { x: e.target.x(), y: e.target.y() } } : u))}
                onMouseDown={(e) => { e.cancelBubble = true; setUnits(units.map(u => ({ ...u, isSelected: u.id === unit.id }))) }}
              >
                <Rect width={SETTINGS.UNIT.WIDTH} height={SETTINGS.UNIT.HEIGHT} fill="#3d5c3a" stroke={unit.isSelected ? '#ffeb3b' : '#c9a227'} strokeWidth={unit.isSelected ? 3 : 2} />
                <Rect x={SETTINGS.UNIT.WIDTH / 2 - 4} y={-8} width={8} height={8} fill="#c9a227" />
                {unit.isSelected && (
                  <>
                    <Rect x={SETTINGS.UNIT.WIDTH - 10} y={-10} width={16} height={16} fill="#c9a227" cornerRadius={3} onMouseDown={(e) => startRotationDrag(unit.id, e, 'right')} />
                    <Rect x={-6} y={-10} width={16} height={16} fill="#c9a227" cornerRadius={3} onMouseDown={(e) => startRotationDrag(unit.id, e, 'left')} />
                    
                    {/* Botón Variación Izquierda */}
                    <Rect x={-18} y={SETTINGS.UNIT.HEIGHT / 2 - 9} width={14} height={18} fill="#ffab91" cornerRadius={3} onMouseDown={(e) => { e.cancelBubble = true; handleVariation(unit.id, 'left'); }} />
                    
                    {/* Botón Variación Derecha */}
                    <Rect x={SETTINGS.UNIT.WIDTH + 4} y={SETTINGS.UNIT.HEIGHT / 2 - 9} width={14} height={18} fill="#ffab91" cornerRadius={3} onMouseDown={(e) => { e.cancelBubble = true; handleVariation(unit.id, 'right'); }} />
                    
                    {/* Botón Media Vuelta */}
                    <Rect x={SETTINGS.UNIT.WIDTH / 2 - 6} y={SETTINGS.UNIT.HEIGHT + 4} width={12} height={18} fill="#ce93d8" cornerRadius={3} onMouseDown={(e) => { e.cancelBubble = true; handleVariation(unit.id, 'half'); }} />

                    <Rect x={SETTINGS.UNIT.WIDTH / 2 - 6} y={-18} width={12} height={18} fill="#4dd0e1" cornerRadius={3} 
                      onMouseDown={(e) => {
                        e.cancelBubble = true
                        const p = e.target.getStage().getPointerPosition()
                        setAdvanceDrag