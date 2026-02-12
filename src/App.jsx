import { useState, useCallback } from 'react'
import { Stage, Layer, Rect, Group } from 'react-konva'
import './App.css'

const UNIT_WIDTH = 100
const UNIT_HEIGHT = 60
const MAP_WIDTH = UNIT_WIDTH * 30
const MAP_HEIGHT = UNIT_WIDTH * 20
const VIEW_WIDTH = 700
const VIEW_HEIGHT = 500

// Calcula ángulo (en grados) donde 0º = hacia arriba desde un pivote dado
function angleFromPivot(pivotX, pivotY, pointerX, pointerY) {
  const dx = pointerX - pivotX
  const dy = pointerY - pivotY
  const angleRad = Math.atan2(dx, -dy)
  return (angleRad * 180) / Math.PI
}

function App() {
  // Posición de la esquina superior izquierda (sistema base de la unidad)
  const [position, setPosition] = useState({ x: 200, y: 220 })
  // Rotación actual en grados (0º a 90º hacia delante)
  const [rotation, setRotation] = useState(0)
  // Estado de selección de la unidad
  const [isSelected, setIsSelected] = useState(false)
  // Zoom y pan del área de juego
  const [stageScale, setStageScale] = useState(1)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })

  // Estado de rotación por arrastre
  const [rotationDrag, setRotationDrag] = useState({
    active: false,
    pivot: /** @type {'left' | 'right' | null} */ (null),
    startAngle: 0,
    startRotation: 0,
    pivotX: 0,
    pivotY: 0,
  })

  // Estado de avance por arrastre
  const [advanceDrag, setAdvanceDrag] = useState({
    active: false,
    startPointer: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    rotationAtStart: 0,
  })

  // Estado de deslizamiento lateral por arrastre
  const [slideDrag, setSlideDrag] = useState({
    active: false,
    startPointer: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    rotationAtStart: 0,
  })

  // Zoom con rueda del ratón
  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault()
      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (!stage || !pointer) return

      const scaleBy = 1.05
      const oldScale = stageScale
      const mousePointTo = {
        x: (pointer.x - stagePosition.x) / oldScale,
        y: (pointer.y - stagePosition.y) / oldScale,
      }

      const direction = e.evt.deltaY > 0 ? 1 : -1
      let newScale =
        direction > 0 ? oldScale / scaleBy : oldScale * scaleBy

      // Limitar zoom
      if (newScale < 0.3) newScale = 0.3
      if (newScale > 3) newScale = 3

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }

      setStageScale(newScale)
      setStagePosition(newPos)
    },
    [stageScale, stagePosition.x, stagePosition.y]
  )

  const handleDragEnd = useCallback((e) => {
    const node = e.target
    setPosition({ x: node.x(), y: node.y() })
  }, [])

  // Movimiento del puntero (rotación + avance + deslizamiento según el selector activo)
  const handlePointerMove = useCallback(
    (e) => {
      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (!stage || !pointer) return

      // Convertimos posición del puntero a coordenadas del tapete (independientes de zoom/pan)
      const pointerWorldX = (pointer.x - stagePosition.x) / stageScale
      const pointerWorldY = (pointer.y - stagePosition.y) / stageScale

      // 1) Rotación
      if (rotationDrag.active && rotationDrag.pivot) {
        const { pivotX, pivotY } = rotationDrag
        const angleNow = angleFromPivot(
          pivotX,
          pivotY,
          pointerWorldX,
          pointerWorldY
        )

        // Cambio de ángulo relativo al inicio del arrastre
        const rawDelta = angleNow - rotationDrag.startAngle
        // Normalizamos el delta a [-180, 180] para evitar saltos al cruzar 180°/360°
        let delta = ((rawDelta + 540) % 360) - 180

        // Limitación del sentido y amplitud DEL DELTA según el pivote
        if (rotationDrag.pivot === 'right') {
          // Pivote = esquina delantera izquierda
          // Solo se permite giro antihorario (hacia la izquierda): delta ∈ [-90º, 0º]
          if (delta > 0) delta = 0
          if (delta < -90) delta = -90
        } else {
          // Pivote = esquina delantera derecha
          // Solo se permite giro horario (hacia la derecha): delta ∈ [0º, 90º]
          if (delta < 0) delta = 0
          if (delta > 90) delta = 90
        }

        const next = rotationDrag.startRotation + delta

        // Si el pivote es la esquina derecha, recalculamos la posición
        // para que esa esquina permanezca fija.
        if (rotationDrag.pivot === 'left') {
          const newRad = (next * Math.PI) / 180

          const rightX = rotationDrag.pivotX
          const rightY = rotationDrag.pivotY

          const newLeftX = rightX - UNIT_WIDTH * Math.cos(newRad)
          const newLeftY = rightY - UNIT_WIDTH * Math.sin(newRad)

          setPosition({ x: newLeftX, y: newLeftY })
        }

        setRotation(next)
        return
      }

      // 2) Avance en línea recta hacia delante
      if (advanceDrag.active) {
        const rad = (advanceDrag.rotationAtStart * Math.PI) / 180
        // Vector de avance (frente de la unidad)
        const fx = Math.sin(rad)
        const fy = -Math.cos(rad)

        const dx = pointerWorldX - advanceDrag.startPointer.x
        const dy = pointerWorldY - advanceDrag.startPointer.y

        // Proyección del movimiento del ratón sobre la dirección de avance
        let t = dx * fx + dy * fy
        if (t < 0) t = 0 // no permitir retroceder

        const newX = advanceDrag.startPosition.x + fx * t
        const newY = advanceDrag.startPosition.y + fy * t

        setPosition({ x: newX, y: newY })
        return
      }

      // 3) Deslizamiento lateral (izquierda / derecha)
      if (slideDrag.active) {
        const rad = (slideDrag.rotationAtStart * Math.PI) / 180
        // Vector lateral (derecha de la unidad)
        const sx = Math.cos(rad)
        const sy = Math.sin(rad)

        const dx = pointerWorldX - slideDrag.startPointer.x
        const dy = pointerWorldY - slideDrag.startPointer.y

        // Proyección del movimiento del ratón sobre la dirección lateral
        let t = dx * sx + dy * sy
        const maxOffset = UNIT_WIDTH
        if (t > maxOffset) t = maxOffset
        if (t < -maxOffset) t = -maxOffset

        const newX = slideDrag.startPosition.x + sx * t
        const newY = slideDrag.startPosition.y + sy * t

        setPosition({ x: newX, y: newY })
      }
    },
    [
      rotation,
      rotationDrag,
      advanceDrag,
      slideDrag,
      position.x,
      position.y,
      stageScale,
      stagePosition.x,
      stagePosition.y,
    ]
  )

  const startRotationDrag = useCallback(
    (e, pivot) => {
      e.cancelBubble = true

      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (!pointer) return

      const pointerWorldX = (pointer.x - stagePosition.x) / stageScale
      const pointerWorldY = (pointer.y - stagePosition.y) / stageScale

      const rad = (rotation * Math.PI) / 180
      let pivotX = position.x
      let pivotY = position.y

      if (pivot === 'left') {
        // Pivote = esquina delantera derecha
        pivotX = position.x + UNIT_WIDTH * Math.cos(rad)
        pivotY = position.y + UNIT_WIDTH * Math.sin(rad)
      }
      // Si pivot === 'right', el pivote es la esquina delantera izquierda

      const startAngle = angleFromPivot(pivotX, pivotY, pointerWorldX, pointerWorldY)

      setRotationDrag({
        active: true,
        pivot,
        startAngle,
        startRotation: rotation,
        pivotX,
        pivotY,
      })
    },
    [position.x, position.y, rotation, stageScale, stagePosition.x, stagePosition.y]
  )

  const startAdvanceDrag = useCallback(
    (e) => {
      e.cancelBubble = true

      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (!pointer) return

      const pointerWorldX = (pointer.x - stagePosition.x) / stageScale
      const pointerWorldY = (pointer.y - stagePosition.y) / stageScale

      setAdvanceDrag({
        active: true,
        startPointer: { x: pointerWorldX, y: pointerWorldY },
        startPosition: { x: position.x, y: position.y },
        rotationAtStart: rotation,
      })
    },
    [position.x, position.y, rotation, stageScale, stagePosition.x, stagePosition.y]
  )

  const startSlideDrag = useCallback(
    (e) => {
      e.cancelBubble = true

      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (!pointer) return

      const pointerWorldX = (pointer.x - stagePosition.x) / stageScale
      const pointerWorldY = (pointer.y - stagePosition.y) / stageScale

      setSlideDrag({
        active: true,
        startPointer: { x: pointerWorldX, y: pointerWorldY },
        startPosition: { x: position.x, y: position.y },
        rotationAtStart: rotation,
      })
    },
    [position.x, position.y, rotation, stageScale, stagePosition.x, stagePosition.y]
  )

  const handlePointerEnd = useCallback(() => {
    setRotationDrag((prev) => ({ ...prev, active: false, pivot: null }))
    setAdvanceDrag((prev) => ({ ...prev, active: false }))
    setSlideDrag((prev) => ({ ...prev, active: false }))
  }, [])

  // Variación izquierda: 90º antihorario dejando la esquina delantera derecha
  // en la posición donde estaba la esquina delantera izquierda antes del giro
  const handleVariationLeft = useCallback(() => {
    const nextRotation = rotation - 90
    const radNext = (nextRotation * Math.PI) / 180

    // Queremos que la nueva esquina delantera derecha coincida con la
    // esquina delantera izquierda actual (position).
    // R' = L' + W * dir(nextRotation) = L_actual  =>  L' = L_actual - W * dir(nextRotation)
    const newLeftX = position.x - UNIT_WIDTH * Math.cos(radNext)
    const newLeftY = position.y - UNIT_WIDTH * Math.sin(radNext)

    setRotation(nextRotation)
    setPosition({ x: newLeftX, y: newLeftY })
  }, [position.x, position.y, rotation])

  // Variación derecha: 90º horario manteniendo la esquina delantera derecha
  // y haciendo que la esquina delantera izquierda ocupe su posición anterior
  const handleVariationRight = useCallback(() => {
    const theta = (rotation * Math.PI) / 180
    const rightX = position.x + UNIT_WIDTH * Math.cos(theta)
    const rightY = position.y + UNIT_WIDTH * Math.sin(theta)

    const nextRotation = rotation + 90

    // Nueva esquina izquierda pasa a ser donde estaba la esquina derecha
    setRotation(nextRotation)
    setPosition({ x: rightX, y: rightY })
  }, [position.x, position.y, rotation])

  // Media vuelta: 180º, colocando el borde frontal donde estaba el borde trasero
  const handleHalfTurn = useCallback(() => {
    const theta = (rotation * Math.PI) / 180

    // Esquina trasera derecha antes de la maniobra
    const backRightX =
      position.x +
      UNIT_HEIGHT * -Math.sin(theta) +
      UNIT_WIDTH * Math.cos(theta)
    const backRightY =
      position.y + UNIT_HEIGHT * Math.cos(theta) + UNIT_WIDTH * Math.sin(theta)

    const nextRotation = rotation + 180

    // Tras girar 180º, la nueva esquina delantera izquierda pasa a ser
    // la antigua esquina trasera derecha
    setRotation(nextRotation)
    setPosition({ x: backRightX, y: backRightY })
  }, [position.x, position.y, rotation])

  const handleResetView = useCallback(() => {
    setStageScale(1)
    setStagePosition({ x: 0, y: 0 })
  }, [])

  return (
    <div className="tactical-board-wrapper">
      <h1 className="board-title">Mesa táctica</h1>
      <p className="board-hint">
        Arrastra la unidad para moverla. Usa los cuadrados de las esquinas
        delanteras para girar hacia delante (hasta 90°) alrededor de la otra
        esquina.
      </p>

      <div className="view-controls">
        <button type="button" onClick={handleResetView}>
          Recentrar tapete
        </button>
      </div>

      <div className="stage-container">
        <Stage
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          draggable
          onWheel={handleWheel}
          onDragEnd={(e) => {
            const pos = e.target.position()
            setStagePosition(pos)
          }}
          onMouseMove={handlePointerMove}
          onTouchMove={handlePointerMove}
          onMouseUp={handlePointerEnd}
          onTouchEnd={handlePointerEnd}
          onMouseLeave={handlePointerEnd}
          onMouseDown={() => setIsSelected(false)}
          onTouchStart={() => setIsSelected(false)}
        >
          <Layer>
            {/* Tapete liso, sin casillas */}
            <Rect
              x={0}
              y={0}
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              fill="#1e3320"
              listening={false}
            />

            {/* Unidad; la rotación base se calcula alrededor de la esquina superior izquierda */}
            <Group
              x={position.x}
              y={position.y}
              rotation={rotation}
              offset={{ x: 0, y: 0 }}
              draggable={!rotationDrag.active && !advanceDrag.active && !slideDrag.active}
              onDragEnd={handleDragEnd}
              onMouseDown={(e) => {
                e.cancelBubble = true
                setIsSelected(true)
              }}
              onTouchStart={(e) => {
                e.cancelBubble = true
                setIsSelected(true)
              }}
            >
              {/* Cuerpo de la unidad */}
              <Rect
                x={0}
                y={0}
                width={UNIT_WIDTH}
                height={UNIT_HEIGHT}
                fill="#3d5c3a"
                stroke={isSelected ? '#ffeb3b' : '#c9a227'}
                strokeWidth={isSelected ? 3 : 2}
              />

              {/* Marca de frente (centro del borde superior) */}
              <Rect
                x={UNIT_WIDTH / 2 - 4}
                y={-8}
                width={8}
                height={8}
                fill="#c9a227"
                listening={false}
              />

              {isSelected && (
                <>
                  {/* Selector de rotación en esquina superior derecha (giro sobre esquina izquierda) */}
                  <Rect
                    x={UNIT_WIDTH - 10}
                    y={-10}
                    width={16}
                    height={16}
                    fill={
                      rotationDrag.active && rotationDrag.pivot === 'right'
                        ? '#ffd54f'
                        : '#c9a227'
                    }
                    stroke="#000000"
                    strokeWidth={1}
                    cornerRadius={3}
                    onMouseDown={(evt) => startRotationDrag(evt, 'right')}
                    onTouchStart={(evt) => startRotationDrag(evt, 'right')}
                  />

                  {/* Selector de rotación en esquina superior izquierda (giro sobre esquina derecha) */}
                  <Rect
                    x={-6}
                    y={-10}
                    width={16}
                    height={16}
                    fill={
                      rotationDrag.active && rotationDrag.pivot === 'left'
                        ? '#ffd54f'
                        : '#c9a227'
                    }
                    stroke="#000000"
                    strokeWidth={1}
                    cornerRadius={3}
                    onMouseDown={(evt) => startRotationDrag(evt, 'left')}
                    onTouchStart={(evt) => startRotationDrag(evt, 'left')}
                  />

                  {/* Selector de avance en el centro del lado delantero */}
                  <Rect
                    x={UNIT_WIDTH / 2 - 6}
                    y={-18}
                    width={12}
                    height={18}
                    fill={advanceDrag.active ? '#80cbc4' : '#4dd0e1'}
                    stroke="#000000"
                    strokeWidth={1}
                    cornerRadius={3}
                    onMouseDown={startAdvanceDrag}
                    onTouchStart={startAdvanceDrag}
                  />

                  {/* Selector de variación izquierda (centro del borde lateral izquierdo) */}
                  <Rect
                    x={-18}
                    y={UNIT_HEIGHT / 2 - 9}
                    width={14}
                    height={18}
                    fill="#ffab91"
                    stroke="#000000"
                    strokeWidth={1}
                    cornerRadius={3}
                    onMouseDown={(e) => {
                      e.cancelBubble = true
                      handleVariationLeft()
                    }}
                    onTouchStart={(e) => {
                      e.cancelBubble = true
                      handleVariationLeft()
                    }}
                  />

                  {/* Selector de variación derecha (centro del borde lateral derecho) */}
                  <Rect
                    x={UNIT_WIDTH + 4}
                    y={UNIT_HEIGHT / 2 - 9}
                    width={14}
                    height={18}
                    fill="#ffab91"
                    stroke="#000000"
                    strokeWidth={1}
                    cornerRadius={3}
                    onMouseDown={(e) => {
                      e.cancelBubble = true
                      handleVariationRight()
                    }}
                    onTouchStart={(e) => {
                      e.cancelBubble = true
                      handleVariationRight()
                    }}
                  />

                  {/* Selector de media vuelta (centro del borde trasero) */}
                  <Rect
                    x={UNIT_WIDTH / 2 - 6}
                    y={UNIT_HEIGHT + 4}
                    width={12}
                    height={18}
                    fill="#ce93d8"
                    stroke="#000000"
                    strokeWidth={1}
                    cornerRadius={3}
                    onMouseDown={(e) => {
                      e.cancelBubble = true
                      handleHalfTurn()
                    }}
                    onTouchStart={(e) => {
                      e.cancelBubble = true
                      handleHalfTurn()
                    }}
                  />

                  {/* Selector de deslizamiento lateral (centro de la unidad) */}
                  <Rect
                    x={UNIT_WIDTH / 2 - 6}
                    y={UNIT_HEIGHT / 2 - 6}
                    width={12}
                    height={12}
                    fill={slideDrag.active ? '#ffeb3b' : '#90caf9'}
                    stroke="#000000"
                    strokeWidth={1}
                    cornerRadius={3}
                    onMouseDown={startSlideDrag}
                    onTouchStart={startSlideDrag}
                  />
                </>
              )}
            </Group>
          </Layer>
        </Stage>
      </div>
    </div>
  )
}

export default App
