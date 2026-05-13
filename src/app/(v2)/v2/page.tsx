'use client'
import Link from 'next/link'
import {
  Wallet, Droplets, Tags,
  ListChecks, FileText, Settings,
  ArrowRight,
} from 'lucide-react'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { useLang } from '@/lib/v2/i18n/context'

// ─── types ────────────────────────────────────────────────────────────────────

type ModuleCard = {
  href: string
  icon: React.ElementType
  label: string
  desc: string
  color: string
  bg: string
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ item, live }: { item: ModuleCard; live: boolean }) {
  const { t } = useLang()
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="group flex items-start gap-3 rounded-[14px] p-4 transition-all hover:shadow-sm"
      style={{
        border: '1px solid var(--v-border)',
        backgroundColor: live ? 'var(--v-surface)' : 'var(--v-surface-2)',
        opacity: live ? 1 : 0.75,
      }}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: item.bg }}
      >
        <Icon size={18} style={{ color: item.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: 'var(--v-text)' }}>
            {item.label}
          </span>
          {live && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: '#eaf5ea', color: '#3a7a3a' }}
            >
              {t('dashboard.liveBadge')}
            </span>
          )}
        </div>
        <p className="text-[12px] mt-0.5 leading-snug" style={{ color: 'var(--v-text-3)' }}>
          {item.desc}
        </p>
      </div>
      <ArrowRight
        size={14}
        className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--v-muted)' }}
      />
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useLang()

  const live: ModuleCard[] = [
    {
      href: '/v2/finance',
      icon: Wallet,
      label: t('pages.finance'),
      desc: t('dashboard.financeDesc'),
      color: '#a07030',
      bg: '#faf4ee',
    },
    {
      href: '/v2/sumy',
      icon: Droplets,
      label: t('pages.sumy'),
      desc: t('dashboard.sumyDesc'),
      color: '#c97a8a',
      bg: '#fbeaf0',
    },
    {
      href: '/v2/types',
      icon: Tags,
      label: t('pages.types'),
      desc: t('dashboard.typesDesc'),
      color: '#3a7a7a',
      bg: '#eef5f5',
    },
  ]

  const pending: ModuleCard[] = [
    {
      href: '/v2/tasks',
      icon: ListChecks,
      label: t('pages.tasks'),
      desc: t('dashboard.tasksDesc'),
      color: '#3a5fa0',
      bg: '#eef3fa',
    },
    {
      href: '/v2/notes',
      icon: FileText,
      label: t('pages.notes'),
      desc: t('dashboard.notesDesc'),
      color: '#4a7c3f',
      bg: '#f0f5ee',
    },
    {
      href: '/v2/settings',
      icon: Settings,
      label: t('dashboard.settingsLabel'),
      desc: t('dashboard.settingsDesc'),
      color: '#888',
      bg: 'var(--v-hover)',
    },
  ]

  return (
    <>
      <V2Topbar />
      <div
        className="p-4 sm:p-6 max-w-[720px] mx-auto w-full flex flex-col gap-6"
        style={{ paddingTop: 72 }}
      >
        {/* Live */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--v-text)' }}>
              {t('dashboard.connectedSection')}
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--v-border)' }} />
          </div>
          <div className="flex flex-col gap-2">
            {live.map((item) => (
              <Card key={item.href} item={item} live />
            ))}
          </div>
        </section>

        {/* Pending */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--v-muted)' }}>
              {t('dashboard.pendingSection')}
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--v-border)' }} />
          </div>
          <div className="flex flex-col gap-2">
            {pending.map((item) => (
              <Card key={item.href} item={item} live={false} />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
