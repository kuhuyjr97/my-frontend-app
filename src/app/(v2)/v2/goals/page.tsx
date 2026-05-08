'use client'
import { useState, useEffect } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Plus, X, ChevronDown, ChevronUp, Trash2,
  BookOpen, PiggyBank, Rocket, Target, Star, Zap, Heart, Coffee,
  CheckCircle2, Circle,
} from 'lucide-react'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { useLocalStorage, nanoid } from '@/lib/v2/storage'
import { SEED_GOALS } from '@/lib/v2/seed'
import type { Goal, Milestone } from '@/lib/v2/types'

// ─── constants ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, PiggyBank, Rocket, Target, Star, Zap, Heart, Coffee,
}

const ICON_OPTIONS = Object.keys(ICON_MAP)

const COLOR_OPTIONS = [
  '#3a5fa0', '#4a7c3f', '#b05040', '#7040a0', '#a07030', '#1a1a1a', '#888888',
]

// ─── GoalCard ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onUpdate, onDelete }: {
  goal: Goal
  onUpdate: (g: Goal) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')

  const Icon = ICON_MAP[goal.icon] || Target
  const doneCount = goal.milestones.filter((m) => m.done).length
  const daysLeft = goal.targetDate ? differenceInDays(parseISO(goal.targetDate), new Date()) : null

  const toggleMilestone = (mId: string) => {
    const milestones = goal.milestones.map((m) => m.id === mId ? { ...m, done: !m.done } : m)
    const donePct = milestones.length > 0 ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100) : goal.progress
    onUpdate({ ...goal, milestones, progress: donePct })
  }

  const addMilestone = () => {
    if (!newMilestone.trim()) return
    const m: Milestone = { id: nanoid(), goalId: goal.id, title: newMilestone.trim(), done: false }
    const milestones = [...goal.milestones, m]
    const donePct = Math.round((milestones.filter((x) => x.done).length / milestones.length) * 100)
    onUpdate({ ...goal, milestones, progress: donePct })
    setNewMilestone('')
  }

  const deleteMilestone = (mId: string) => {
    const milestones = goal.milestones.filter((m) => m.id !== mId)
    const donePct = milestones.length > 0 ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100) : 0
    onUpdate({ ...goal, milestones, progress: donePct })
  }

  const updateProgress = (val: number) => {
    onUpdate({ ...goal, progress: Math.max(0, Math.min(100, val)) })
  }

  return (
    <div className="bg-white rounded-[14px] flex flex-col" style={{ border: '1px solid #e8e6e1' }}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: goal.color + '18' }}>
            <Icon size={20} style={{ color: goal.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium truncate" style={{ color: '#1a1a1a' }}>{goal.title}</div>
            {goal.targetDate && (
              <div className="text-[11px] mt-0.5" style={{ color: daysLeft !== null && daysLeft < 30 ? '#b05040' : '#bbb' }}>
                {daysLeft !== null && daysLeft >= 0
                  ? `${daysLeft} days left · ${format(parseISO(goal.targetDate), 'd MMM yyyy', { locale: vi })}`
                  : `Ended ${format(parseISO(goal.targetDate), 'd MMM yyyy', { locale: vi })}`
                }
              </div>
            )}
          </div>
          <button onClick={() => onDelete(goal.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 size={13} color="#ccc" />
          </button>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px]" style={{ color: '#bbb' }}>
              {doneCount}/{goal.milestones.length} milestones
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number" value={goal.progress} min={0} max={100}
                onChange={(e) => updateProgress(parseInt(e.target.value) || 0)}
                className="w-8 text-right text-[12px] font-medium outline-none bg-transparent"
                style={{ color: '#1a1a1a' }}
              />
              <span className="text-[12px] font-medium" style={{ color: '#1a1a1a' }}>%</span>
            </div>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: '#f0eeea' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${goal.progress}%`, backgroundColor: goal.color }} />
          </div>
        </div>

        {/* Expand toggle */}
        {goal.milestones.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 mt-3 text-[11px] transition-colors"
            style={{ color: '#bbb' }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide' : 'Show'} milestones
          </button>
        )}
      </div>

      {/* Milestones */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-2" style={{ borderTop: '1px solid #f0eeea' }}>
          <div className="pt-3 flex flex-col gap-1.5">
            {goal.milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-2 group">
                <button onClick={() => toggleMilestone(m.id)} className="shrink-0">
                  {m.done
                    ? <CheckCircle2 size={14} style={{ color: goal.color }} />
                    : <Circle size={14} style={{ color: '#ccc' }} />
                  }
                </button>
                <span className="flex-1 text-[12px]" style={{ color: m.done ? '#bbb' : '#1a1a1a', textDecoration: m.done ? 'line-through' : 'none' }}>
                  {m.title}
                </span>
                <button onClick={() => deleteMilestone(m.id)} className="opacity-0 group-hover:opacity-100">
                  <X size={11} color="#ccc" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            <input
              value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
              placeholder="Add milestone…"
              className="flex-1 h-[26px] px-2 rounded-[6px] text-[11px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
            />
            <button onClick={addMilestone}
              className="w-7 h-7 flex items-center justify-center rounded-[6px]"
              style={{ backgroundColor: '#f0eeea' }}>
              <Plus size={12} color="#555" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add Goal Modal ───────────────────────────────────────────────────────────

function AddGoalModal({ onClose, onAdd }: { onClose: () => void; onAdd: (g: Goal) => void }) {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('Target')
  const [color, setColor] = useState('#3a5fa0')
  const [targetDate, setTargetDate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({
      id: nanoid(), title, icon, color, progress: 0,
      targetDate: targetDate || undefined,
      milestones: [], createdAt: new Date().toISOString(),
    })
    onClose()
  }

  const SelectedIcon = ICON_MAP[icon] || Target

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <div className="bg-white rounded-[14px] w-[400px] shadow-xl" style={{ border: '1px solid #e8e6e1' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0eeea' }}>
          <span className="text-[14px] font-medium" style={{ color: '#1a1a1a' }}>New Goal</span>
          <button onClick={onClose}><X size={16} color="#999" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Goal title</label>
            <input
              autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Run 5km daily"
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium mb-2 block" style={{ color: '#555' }}>Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((name) => {
                const Ic = ICON_MAP[name]
                return (
                  <button key={name} type="button" onClick={() => setIcon(name)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: icon === name ? color + '18' : '#f7f6f3',
                      border: icon === name ? `1.5px solid ${color}` : '1.5px solid transparent',
                    }}>
                    <Ic size={16} style={{ color: icon === name ? color : '#999' }} />
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium mb-2 block" style={{ color: '#555' }}>Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }} />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Target date (optional)</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              className="w-full h-[30px] px-2 rounded-[7px] text-[12px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#555', backgroundColor: '#fff' }} />
          </div>

          {/* Preview */}
          <div className="rounded-[10px] p-3 flex items-center gap-3" style={{ backgroundColor: '#faf9f7', border: '1px solid #f0eeea' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
              <SelectedIcon size={18} style={{ color }} />
            </div>
            <div>
              <div className="text-[13px] font-medium" style={{ color: '#1a1a1a' }}>{title || 'Goal title'}</div>
              {targetDate && <div className="text-[11px]" style={{ color: '#bbb' }}>{format(parseISO(targetDate), 'd MMM yyyy', { locale: vi })}</div>}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-[34px] rounded-[7px] text-[13px]"
              style={{ border: '1px solid #e4e2dd', color: '#555' }}>Cancel</button>
            <button type="submit"
              className="flex-1 h-[34px] rounded-[7px] text-[13px] font-medium"
              style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [goals, setGoals] = useLocalStorage<Goal[]>('v2-goals', [])
  const [seeded, setSeeded] = useLocalStorage<boolean>('v2-goals-seeded', false)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!seeded && goals.length === 0) {
      setGoals(SEED_GOALS)
      setSeeded(true)
    }
  }, [seeded, goals.length, setGoals, setSeeded])

  const updateGoal = (g: Goal) => setGoals((prev) => prev.map((x) => x.id === g.id ? g : x))
  const deleteGoal = (id: string) => setGoals((prev) => prev.filter((g) => g.id !== id))

  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0

  return (
    <>
      <V2Topbar actions={
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-medium"
          style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
          <Plus size={13} />
          New goal
        </button>
      } />

      <div className="p-5 flex flex-col gap-4">
        {/* Summary strip */}
        {goals.length > 0 && (
          <div className="flex items-center gap-4 bg-white rounded-[14px] px-5 py-3" style={{ border: '1px solid #e8e6e1' }}>
            <div>
              <div className="text-[11px]" style={{ color: '#bbb' }}>Active goals</div>
              <div className="text-[20px] font-medium" style={{ color: '#1a1a1a' }}>{goals.length}</div>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: '#f0eeea' }} />
            <div>
              <div className="text-[11px]" style={{ color: '#bbb' }}>Avg progress</div>
              <div className="text-[20px] font-medium" style={{ color: '#1a1a1a' }}>{avgProgress}%</div>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: '#f0eeea' }} />
            <div className="flex-1">
              <div className="text-[11px] mb-1.5" style={{ color: '#bbb' }}>Overall</div>
              <div className="h-1.5 rounded-full" style={{ backgroundColor: '#f0eeea' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${avgProgress}%`, backgroundColor: '#3a5fa0' }} />
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div key={goal.id} className="group">
              <GoalCard goal={goal} onUpdate={updateGoal} onDelete={deleteGoal} />
            </div>
          ))}
          {goals.length === 0 && (
            <div className="col-span-2 text-center py-20">
              <div className="text-[14px] font-medium mb-1" style={{ color: '#555' }}>No goals yet</div>
              <div className="text-[12px]" style={{ color: '#bbb' }}>Start by adding your first goal</div>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddGoalModal onClose={() => setShowAdd(false)} onAdd={(g) => setGoals((prev) => [...prev, g])} />}
    </>
  )
}
