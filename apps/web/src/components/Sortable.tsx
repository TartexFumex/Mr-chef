import type { ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from './Icon'
import { useT } from '../i18n'

/** Liste réordonnable par glisser-déposer (souris, tactile, clavier). */
export function SortableList<T extends { key: string }>({
  items,
  onReorder,
  children,
}: {
  items: T[]
  onReorder: (items: T[]) => void
  children: (item: T, index: number, handle: ReactNode) => ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const from = items.findIndex((i) => i.key === e.active.id)
    const to = items.findIndex((i) => i.key === e.over!.id)
    if (from >= 0 && to >= 0) onReorder(arrayMove(items, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
        {items.map((item, i) => (
          <SortableItem key={item.key} id={item.key}>
            {(handle) => children(item, i, handle)}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const label = useT().common.move
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const handle = (
    <button type="button" className="drag" aria-label={label} {...attributes} {...listeners}>
      <Icon name="grip" />
    </button>
  )
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, position: 'relative', zIndex: isDragging ? 2 : undefined }}
    >
      {children(handle)}
    </div>
  )
}
