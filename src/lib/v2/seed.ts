import type { Transaction, Task, Note, TimeBlock, Goal } from './types'

export const SEED_TRANSACTIONS: Transaction[] = [
  { id: 'tr1', name: 'Lương tháng 5', amount: 15000000, category: 'salary', date: '2026-05-01' },
  { id: 'tr2', name: 'Cơm trưa văn phòng', amount: -85000, category: 'food', date: '2026-05-02' },
  { id: 'tr3', name: 'Cà phê Highlands', amount: -65000, category: 'food', date: '2026-05-02' },
  { id: 'tr4', name: 'Hoá đơn điện nước', amount: -450000, category: 'bills', date: '2026-05-03' },
  { id: 'tr5', name: 'Xăng xe', amount: -120000, category: 'transport', date: '2026-05-04' },
  { id: 'tr6', name: 'Quỹ đầu tư VNINDEX', amount: -2000000, category: 'invest', date: '2026-05-05' },
  { id: 'tr7', name: 'Bún bò', amount: -55000, category: 'food', date: '2026-05-06' },
  { id: 'tr8', name: 'Grab bike', amount: -45000, category: 'transport', date: '2026-05-06' },
  { id: 'tr9', name: 'Cơm tối gia đình', amount: -220000, category: 'food', date: '2026-05-07' },
  { id: 'tr10', name: 'Cà phê sáng', amount: -45000, category: 'food', date: '2026-05-08' },
  { id: 'tr11', name: 'Internet VNPT', amount: -180000, category: 'bills', date: '2026-05-08' },
  { id: 'tr12', name: 'Mua sách', amount: -150000, category: 'shopping', date: '2026-05-09' },
  { id: 'tr13', name: 'Cơm trưa', amount: -80000, category: 'food', date: '2026-05-10' },
  { id: 'tr14', name: 'Grab car', amount: -95000, category: 'transport', date: '2026-05-11' },
  { id: 'tr15', name: 'Thưởng dự án Q1', amount: 3000000, category: 'salary', date: '2026-05-12' },
  { id: 'tr16', name: 'Shopee order', amount: -380000, category: 'shopping', date: '2026-05-13' },
  { id: 'tr17', name: 'Phở bò', amount: -70000, category: 'food', date: '2026-05-14' },
  { id: 'tr18', name: 'Xăng xe', amount: -100000, category: 'transport', date: '2026-05-15' },
]

export const SEED_TASKS: Task[] = [
  {
    id: 'task1', title: 'Thiết kế UI dashboard mới', status: 'inprogress', priority: 'high',
    dueDate: '2026-05-15', tags: ['Work', 'Design'],
    subtasks: [
      { id: 'st1', taskId: 'task1', title: 'Wireframe mobile', done: true },
      { id: 'st2', taskId: 'task1', title: 'Prototype Figma', done: false },
      { id: 'st3', taskId: 'task1', title: 'Review với team', done: false },
    ],
    notes: 'Cần review trước thứ 6', createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-08T09:00:00Z',
  },
  {
    id: 'task2', title: 'Viết unit tests cho API auth', status: 'review', priority: 'medium',
    dueDate: '2026-05-10', tags: ['Work'],
    subtasks: [
      { id: 'st4', taskId: 'task2', title: 'Test login flow', done: true },
      { id: 'st5', taskId: 'task2', title: 'Test refresh token', done: true },
    ],
    notes: '', createdAt: '2026-05-02T08:00:00Z', updatedAt: '2026-05-07T14:00:00Z',
  },
  {
    id: 'task3', title: 'Đọc sách "Atomic Habits"', status: 'backlog', priority: 'low',
    tags: [], subtasks: [],
    notes: 'Đọc 20 trang/ngày', createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z',
  },
  {
    id: 'task4', title: 'Setup CI/CD pipeline', status: 'inprogress', priority: 'high',
    dueDate: '2026-05-20', tags: ['Work'],
    subtasks: [
      { id: 'st6', taskId: 'task4', title: 'Config GitHub Actions', done: true },
      { id: 'st7', taskId: 'task4', title: 'Add test stage', done: false },
      { id: 'st8', taskId: 'task4', title: 'Deploy to staging', done: false },
    ],
    notes: '', createdAt: '2026-05-03T08:00:00Z', updatedAt: '2026-05-08T11:00:00Z',
  },
  {
    id: 'task5', title: 'Lập kế hoạch tài chính Q3', status: 'backlog', priority: 'medium',
    dueDate: '2026-05-30', tags: ['Finance', 'Personal'],
    subtasks: [],
    notes: '', createdAt: '2026-05-05T08:00:00Z', updatedAt: '2026-05-05T08:00:00Z',
  },
  {
    id: 'task6', title: 'Refactor database queries', status: 'done', priority: 'medium',
    dueDate: '2026-05-05', tags: ['Work'],
    subtasks: [
      { id: 'st9', taskId: 'task6', title: 'Identify slow queries', done: true },
      { id: 'st10', taskId: 'task6', title: 'Add indexes', done: true },
    ],
    notes: '', createdAt: '2026-04-28T08:00:00Z', updatedAt: '2026-05-05T16:00:00Z',
  },
]

export const SEED_NOTES: Note[] = [
  {
    id: 'note1', title: 'Ý tưởng app Personal OS',
    content: '## Ý tưởng\n\nXây dựng một dashboard cá nhân tổng hợp:\n\n- **Tasks**: Quản lý công việc theo kanban\n- **Finance**: Theo dõi thu chi\n- **Notes**: Ghi chú markdown\n- **Time**: Tracking thời gian làm việc\n\n## Tech stack\n\n- Next.js 14\n- Tailwind CSS\n- Prisma + SQLite',
    tags: ['Ideas', 'Dev'], createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-06T10:00:00Z',
  },
  {
    id: 'note2', title: 'Meeting notes - Sprint planning',
    content: '## Sprint 12 Planning\n\n**Date**: 05/05/2026\n\n### Stories\n1. User authentication revamp\n2. Dashboard redesign\n3. API performance improvements\n\n### Action items\n- [ ] Setup new CI pipeline\n- [ ] Review DB schema',
    tags: ['Work'], createdAt: '2026-05-05T09:00:00Z', updatedAt: '2026-05-05T10:30:00Z',
  },
  {
    id: 'note3', title: 'Quotes hay',
    content: '"The best time to plant a tree was 20 years ago. The second best time is now."\n\n"Done is better than perfect."\n\n"An investment in knowledge pays the best interest." — Benjamin Franklin',
    tags: ['Personal'], createdAt: '2026-05-03T20:00:00Z', updatedAt: '2026-05-03T20:15:00Z',
  },
  {
    id: 'note4', title: 'Grocery list',
    content: '- [ ] Rau củ\n- [ ] Trứng x10\n- [ ] Sữa tươi\n- [ ] Bánh mì\n- [ ] Cà phê hạt',
    tags: ['Personal'], createdAt: '2026-05-07T07:00:00Z', updatedAt: '2026-05-07T07:05:00Z',
  },
]

export const SEED_TIMEBLOCKS: TimeBlock[] = [
  { id: 'tb1', label: 'Daily standup', category: 'work', startTime: '09:00', endTime: '09:30', date: '2026-05-08' },
  { id: 'tb2', label: 'Deep work – CI/CD', category: 'focus', startTime: '09:30', endTime: '11:30', date: '2026-05-08' },
  { id: 'tb3', label: 'Lunch break', category: 'break', startTime: '12:00', endTime: '13:00', date: '2026-05-08' },
  { id: 'tb4', label: 'Code review', category: 'work', startTime: '13:00', endTime: '14:00', date: '2026-05-08' },
  { id: 'tb5', label: 'UI design sprint', category: 'focus', startTime: '14:00', endTime: '16:00', date: '2026-05-08' },
  { id: 'tb6', label: 'Emails & admin', category: 'work', startTime: '16:00', endTime: '17:00', date: '2026-05-08' },
]

export const SEED_GOALS: Goal[] = [
  {
    id: 'goal1', title: 'Đạt TOEIC 900', icon: 'BookOpen', color: '#3a5fa0',
    progress: 65, targetDate: '2026-08-31',
    milestones: [
      { id: 'ms1', goalId: 'goal1', title: 'Hoàn thành khóa học listening', done: true },
      { id: 'ms2', goalId: 'goal1', title: 'Luyện 500 từ vựng', done: true },
      { id: 'ms3', goalId: 'goal1', title: 'Thi thử lần 1 (750+)', done: false },
      { id: 'ms4', goalId: 'goal1', title: 'Thi thử lần 2 (850+)', done: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'goal2', title: 'Tiết kiệm 50 triệu', icon: 'PiggyBank', color: '#4a7c3f',
    progress: 44, targetDate: '2026-12-31',
    milestones: [
      { id: 'ms5', goalId: 'goal2', title: 'Tiết kiệm 10 triệu', done: true },
      { id: 'ms6', goalId: 'goal2', title: 'Tiết kiệm 20 triệu', done: true },
      { id: 'ms7', goalId: 'goal2', title: 'Tiết kiệm 35 triệu', done: false },
      { id: 'ms8', goalId: 'goal2', title: 'Tiết kiệm 50 triệu', done: false },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'goal3', title: 'Chạy bộ 5km/ngày', icon: 'Footprints', color: '#b05040',
    progress: 30, targetDate: '2026-06-30',
    milestones: [
      { id: 'ms9', goalId: 'goal3', title: 'Chạy được 1km liên tục', done: true },
      { id: 'ms10', goalId: 'goal3', title: 'Chạy được 3km liên tục', done: false },
      { id: 'ms11', goalId: 'goal3', title: 'Chạy 5km trong 30 phút', done: false },
    ],
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'goal4', title: 'Ra mắt side project', icon: 'Rocket', color: '#7040a0',
    progress: 20, targetDate: '2026-07-31',
    milestones: [
      { id: 'ms12', goalId: 'goal4', title: 'Xác định ý tưởng & MVP', done: true },
      { id: 'ms13', goalId: 'goal4', title: 'Xây dựng backend API', done: false },
      { id: 'ms14', goalId: 'goal4', title: 'Hoàn thiện UI', done: false },
      { id: 'ms15', goalId: 'goal4', title: 'Deploy & marketing', done: false },
    ],
    createdAt: '2026-03-15T00:00:00Z',
  },
]
