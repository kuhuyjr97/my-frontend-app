export enum Status {
  NOT_STARTED = 1,
  IN_PROGRESS = 2,
  COMPLETED = 3,
  OVERDUE = 4,
}

export const StatusLabels: Record<Status, string> = {
  [Status.NOT_STARTED]: "Not Started",
  [Status.IN_PROGRESS]: "In Progress",
  [Status.COMPLETED]: "Completed",
  [Status.OVERDUE]: "Overdue",
};

export const StatusColors: Record<Status, string> = {
  [Status.NOT_STARTED]: "bg-gray-500/20 text-gray-500",
  [Status.IN_PROGRESS]: "bg-blue-500/20 text-blue-500",
  [Status.COMPLETED]: "bg-green-500/20 text-green-500",
  [Status.OVERDUE]: "bg-red-500/20 text-red-500",
}; 