import { useState, useCallback, useEffect } from 'react'
import { Stage, Layer, Rect, Group } from 'react-konva'
import '../styles/TacticalBoard.css'

const UNIT_WIDTH = 100
const UNIT_HEIGHT = 60
const MAP_WIDTH = 3000
const MAP_HEIGHT = 2000
const VIEW_WIDTH = 700
const VIEW_HEIGHT = 500

function angleFromPivot(pivotX, pivotY, pointerX, pointerY) {
  const dx = pointerX - pivotX
  const dy = pointerY - pivotY
  const angleRad = Math.atan2(dx, -dy)
  return (angleRad * 180) / Math.PI
}

export default function TacticalBoard({ caseId, initialUnits = [], onUnitsChange }) {
  const [units, setUnits] = useState([])
  const [stageScale, setStageScale] = useState(1)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })

  const [rotationDrag, setRotationDrag] = useState({
    active: false,
    unitId: null,
    pivot: null,
    startAngle: 0,
    startRotation: 0,
    pivotX: 0,
    pivotY: 0,
  })

  const [advanceDrag, setAdvanceDrag] = useState({
    active: false,
    unitId: null,
    startPointer: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    rotationAtStart: 0,
  })

  const [slideDrag, setSlideDrag] = useState({
    active: false,
    unitId: null,
    startPointer: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    rotationAtStart: 0,
  })

  useEffect(() => {
    if (initialUnits.length > 0) {
      const formattedUnits = initialUnits.map((u, idx) => ({
        id: u.id || idx,
        position: { x: u.position_x || 200 + idx * 100, y: u.position_y || 220 },
        rotation: u.rotation || 0,
        isSelected: false,
        type: u.type || 'default',
        name: u.name || `Unit ${idx}`
      }))
      setUnits(formattedUnits)
    } else {
      setUnits([
        { id: 0, position: { x: 200, y: 220 }, rotation: 0, isSelected: false, type: 'default', name: 'Unit 1' },
        { id: 1, position: { x: 300, y: 220 }, rotation: 0, isSelected: false, type: 'default', name: 'Unit 2' }
      ])
    }
  }, [initialUnits])

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
      let newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy

      newScale = Math.max(0.3, Math.min(3, newScale))

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }

      setStageScale(newScale)
      setStagePosition(newPos)
    },
    [stageScale, stagePosition.x, stagePosition.y]
  )

  const handleDragEnd = useCallback((unitId, e) => {
    const node = e.target
    setUnits(prev => {
      const updated = prev.map(unit =>
        unit.id === unitId
          ? { ...unit, position: { x: node.x(), y: node.y() } }
          : unit
      )
      //onUnitsChange?.(updated)
      return updated
    })
  }, [onUnitsChange])

  const handlePointerMove = useCallback(
    (e) => {
      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (!stage || !pointer) return

      const pointerWorldX = (pointer.x - stagePosition.x) / stageScale
      const pointerWorldY = (pointer.y - stagePosition.y) / stageScale

      if (rotationDrag.active && rotationDrag.pivot && rotationDrag.unitId !== null) {
        const { pivotX, pivotY } = rotationDrag
        const angleNow = angleFromPivot(pivotX, pivotY, pointerWorldX, pointerWorldY)

        const rawDelta = angleNow - rotationDrag.startAngle
        let delta = ((rawDelta + 540) % 360) - 180

        if (rotationDrag.pivot === 'right') {
          if (delta > 0) delta = 0
          if (delta < -90) delta = -90
        } else {
          if (delta < 0) delta = 0
          if (delta > 90) delta = 90
        }

        const next = rotationDrag.startRotation + delta

        setUnits(prev => {
          const updated = prev.map(unit => {
            if (unit.id !== rotationDrag.unitId) return unit

            let newPosition = unit.position

            if (rotationDrag.pivot === 'left') {
              const newRad = (next * Math.PI) / 180
              const rightX = rotationDrag.pivotX
              const rightY = rotationDrag.pivotY
              const newLeftX = rightX - UNIT_WIDTH * Math.cos(newRad)
              const newLeftY = rightY - UNIT_WIDTH * Math.sin(newRad)
              newPosition = { x: newLeftX, y: newLeftY }
            }

            return { ...unit, rotation: next, position: newPosition }
          })
          //onUnitsChange?.(updated)
          return updated
        })
        return
      }

      if (advanceDrag.active && advanceDrag.unitId !== null) {
        const rad = (advanceDrag.rotationAtStart * Math.PI) / 180
        const fx = Math.sin(rad)
        const fy = -Math.cos(rad)

        const dx = pointerWorldX - advanceDrag.startPointer.x
        const dy = pointerWorldY - advanceDrag.startPointer.y

        let t = dx * fx + dy * fy
        if (t < 0) t = 0

        const newX = advanceDrag.startPosition.x + fx * t
        const newY = advanceDrag.startPosition.y + fy * t

        setUnits(prev => {
          const updated = prev.map(unit =>
            unit.id === advanceDrag.unitId
              ? { ...unit, position: { x: newX, y: newY } }
              : unit
          )
          //onUnitsChange?.(updated)
          return updated
        })
        return
      }

      if (slideDrag.active && slideDrag.unitId !== null) {
        const rad = (slideDrag.rotationAtStart * Math.PI) / 180
        const sx = Math.cos(rad)
        const sy = Math.sin(rad)

        const dx = pointerWorldX - slideDrag.startPointer.x
        const dy = pointerWorldY - slideDrag.startPointer.y

        let t = dx * sx + dy * sy
        const maxOffset = UNIT_WIDTH
        if (t > maxOffset) t = maxOffset
        if (t < -maxOffset) t = -maxOffset

        const newX = slideDrag.startPosition.x + sx * t
        const newY = slideDrag.startPosition.y + sy * t

        setUnits(prev => {
          const updated = prev.map(unit =>
            unit.id === slideDrag.unitId
              ? { ...unit, position: { x: newX, y: newY } }
              : unit
          )
          //onUnitsChange?.(updated)
          return updated
        })
      }
    },
    [rotationDrag, advanceDrag, slideDrag, stageScale, stagePosition.x, stagePosition.y, onUnitsChange]
  )

  const startRotationDrag = useCallback(
    (unitId, e, pivot) => {
      e.cancelBubble = true

      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (!pointer) return

      const unit = units.find(u => u.id === unitId)
      if (!unit) return

      const pointerWorldX = (pointer.x - stagePosition.x) / stageScale
      const pointerWorldY = (pointer.y - stagePosition.y) / stageScale

      const rad = (unit.rotation * Math.PI) / 180
      let pivotX = unit.position.x
      let pivotY = unit.position.y

      if (pivot === 'left') {
        pivotX = unit.position.x + UNIT_WIDTH * Math.cos(rad)
        pivotY = unit.position.y + UNIT_WIDTH * Math.sin(rad)
      }

      const startAngle = angleFromPivot(pivotX, pivotY, pointerWorldX, pointerWorldY)

      setRotationDrag({
        active: true,
        unitId,
        pivot,
        startAngle,
        startRotation: unit.rotation,
        pivotX,
        pivotY,
      })
    },
    [units, stageScale, stagePosition.x, stagePosition.y]
  )

  const startAdvanceDrag = useCallback(
    (unitId, e) => {
      e.cancelBubble = true

      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (!pointer) return

      const unit = units.find(u => u.id === unitId)
      if (!unit) return

      const pointerWorldX = (pointer.x - stagePosition.x) / stageScale
      const pointerWorldY = (pointer.y - stagePosition.y) / stageScale

      setAdvanceDrag({
        active: true,
        unitId,
        startPointer: { x: pointerWorldX, y: pointerWorldY },
        startPosition: { x: unit.position.x, y: unit.position.y },
        rotationAtStart: unit.rotation,
      })
    },
    [units, stageScale, stagePosition.x, stagePosition.y]
  )

  const startSlideDrag = useCallback(
    (unitId, e) => {
      e.cancelBubble = true

      const stage = e.target.getStage()
      const pointer = stage?.getPointerPosition()
      if (!pointer) return

      const unit = units.find(u => u.id === unitId)
      if (!unit) return

      const pointerWorldX = (pointer.x - stagePosition.x) / stageScale
      const pointerWorldY = (pointer.y - stagePosition.y) / stageScale

      setSlideDrag({
        active: true,
        unitId,
        startPointer: { x: pointerWorldX, y: pointerWorldY },
        startPosition: { x: unit.position.x, y: unit.position.y },
        rotationAtStart: unit.rotation,
      })
    },
    [units, stageScale, stagePosition.x, stagePosition.y]
  )

  const handlePointerEnd = useCallback(() => {
    setRotationDrag((prev) => ({ ...prev, active: false, unitId: null, pivot: null }))
    setAdvanceDrag((prev) => ({ ...prev, active: false, unitId: null }))
    setSlideDrag((prev) => ({ ...prev, active: false, unitId: null }))

    if (rotationDrag.active || advanceDrag.active || slideDrag.active) {
      onUnitsChange?.(updated)
    }
  }, [])

  const handleVariationLeft = useCallback((unitId) => {
    setUnits(prev => {
      const updated = prev.map(unit => {
        if (unit.id !== unitId) return unit

        const nextRotation = unit.rotation - 90
        const radNext = (nextRotation * Math.PI) / 180

        const newLeftX = unit.position.x - UNIT_WIDTH * Math.cos(radNext)
        const newLeftY = unit.position.y - UNIT_WIDTH * Math.sin(radNext)

        return {
          ...unit,
          rotation: nextRotation,
          position: { x: newLeftX, y: newLeftY }
        }
      })
      onUnitsChange?.(updated)
      return updated
    })
  }, [onUnitsChange])

  const handleVariationRight = useCallback((unitId) => {
    setUnits(prev => {
      const updated = prev.map(unit => {
        if (unit.id !== unitId) return unit

        const theta = (unit.rotation * Math.PI) / 180
        const rightX = unit.position.x + UNIT_WIDTH * Math.cos(theta)
        const rightY = unit.position.y + UNIT_WIDTH * Math.sin(theta)

        const nextRotation = unit.rotation + 90

        return {
          ...unit,
          rotation: nextRotation,
          position: { x: rightX, y: rightY }
        }
      })
      onUnitsChange?.(updated)
      return updated
    })
  }, [onUnitsChange])

  const handleHalfTurn = useCallback((unitId) => {
    setUnits(prev => {
      const updated = prev.map(unit => {
        if (unit.id !== unitId) return unit

        const theta = (unit.rotation * Math.PI) / 180

        const backRightX =
          unit.position.x +
          UNIT_HEIGHT * -Math.sin(theta) +
          UNIT_WIDTH * Math.cos(theta)
        const backRightY =
          unit.position.y + UNIT_HEIGHT * Math.cos(theta) + UNIT_WIDTH * Math.sin(theta)

        const nextRotation = unit.rotation + 180

        return {
          ...unit,
          rotation: nextRotation,
          position: { x: backRightX, y: backRightY }
        }
      })
      onUnitsChange?.(updated)
      return updated
    })
  }, [onUnitsChange])

  const handleResetView = useCallback(() => {
    setStageScale(1)
    setStagePosition({ x: 0, y: 0 })
  }, [])

  const handleUnitSelect = useCallback((unitId) => {
    setUnits(prev => prev.map(unit => ({
      ...unit,
      isSelected: unit.id === unitId
    })))
  }, [])

  const handleDeselectAll = useCallback(() => {
    setUnits(prev => prev.map(unit => ({
      ...unit,
      isSelected: false
    })))
  }, [])

  const isDraggingAny = rotationDrag.active || advanceDrag.active || slideDrag.active

  return (
    <div className="tactical-board-wrapper">
      <div className="board-controls">
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
          onMouseDown={handleDeselectAll}
          onTouchStart={handleDeselectAll}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              fill="#1e3320"
              listening={false}
            />

            {units.map(unit => (
              <Group
                key={unit.id}
                x={unit.position.x}
                y={unit.position.y}
                rotation={unit.rotation}
                offset={{ x: 0, y: 0 }}
                draggable={!isDraggingAny}
                onDragEnd={(e) => handleDragEnd(unit.id, e)}
                onMouseDown={(e) => {
                  e.cancelBubble = true
                  handleUnitSelect(unit.id)
                }}
                onTouchStart={(e) => {
                  e.cancelBubble = true
                  handleUnitSelect(unit.id)
                }}
              >
                <Rect
                  x={0}
                  y={0}
                  width={UNIT_WIDTH}
                  height={UNIT_HEIGHT}
                  fill="#3d5c3a"
                  stroke={unit.isSelected ? '#ffeb3b' : '#c9a227'}
                  strokeWidth={unit.isSelected ? 3 : 2}
                />

                <Rect
                  x={UNIT_WIDTH / 2 - 4}
                  y={-8}
                  width={8}
                  height={8}
                  fill="#c9a227"
                  listening={false}
                />

                {unit.isSelected && (
                  <>
                    <Rect
                      x={UNIT_WIDTH - 10}
                      y={-10}
                      width={16}
                      height={16}
                      fill={
                        rotationDrag.active && rotationDrag.unitId === unit.id && rotationDrag.pivot === 'right'
                          ? '#ffd54f'
                          : '#c9a227'
                      }
                      stroke="#000000"
                      strokeWidth={1}
                      cornerRadius={3}
                      onMouseDown={(evt) => startRotationDrag(unit.id, evt, 'right')}
                      onTouchStart={(evt) => startRotationDrag(unit.id, evt, 'right')}
                    />

                    <Rect
                      x={-6}
                      y={-10}
                      width={16}
                      height={16}
                      fill={
                        rotationDrag.active && rotationDrag.unitId === unit.id && rotationDrag.pivot === 'left'
                          ? '#ffd54f'
                          : '#c9a227'
                      }
                      stroke="#000000"
                      strokeWidth={1}
                      cornerRadius={3}
                      onMouseDown={(evt) => startRotationDrag(unit.id, evt, 'left')}
                      onTouchStart={(evt) => startRotationDrag(unit.id, evt, 'left')}
                    />

                    <Rect
                      x={UNIT_WIDTH / 2 - 6}
                      y={-18}
                      width={12}
                      height={18}
                      fill={advanceDrag.active && advanceDrag.unitId === unit.id ? '#80cbc4' : '#4dd0e1'}
                      stroke="#000000"
                      strokeWidth={1}
                      cornerRadius={3}
                      onMouseDown={(e) => startAdvanceDrag(unit.id, e)}
                      onTouchStart={(e) => startAdvanceDrag(unit.id, e)}
                    />

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
                        handleVariationLeft(unit.id)
                      }}
                      onTouchStart={(e) => {
                        e.cancelBubble = true
                        handleVariationLeft(unit.id)
                      }}
                    />

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
                        handleVariationRight(unit.id)
                      }}
                      onTouchStart={(e) => {
                        e.cancelBubble = true
                        handleVariationRight(unit.id)
                      }}
                    />

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
                        handleHalfTurn(unit.id)
                      }}
                      onTouchStart={(e) => {
                        e.cancelBubble = true
                        handleHalfTurn(unit.id)
                      }}
                    />

                    <Rect
                      x={UNIT_WIDTH / 2 - 6}
                      y={UNIT_HEIGHT / 2 - 6}
                      width={12}
                      height={12}
                      fill={slideDrag.active && slideDrag.unitId === unit.id ? '#ffeb3b' : '#90caf9'}
                      stroke="#000000"
                      strokeWidth={1}
                      cornerRadius={3}
                      onMouseDown={(e) => startSlideDrag(unit.id, e)}
                      onTouchStart={(e) => startSlideDrag(unit.id, e)}
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
