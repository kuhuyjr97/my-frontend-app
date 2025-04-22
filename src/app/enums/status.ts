export enum Status {
  NOT_STARTED = 1,
  IN_PROGRESS = 2,
  COMPLETED = 3,
  OVERDUE = 4
}

export const StatusLabels = {
  [Status.NOT_STARTED]: "Chưa bắt đầu",
  [Status.IN_PROGRESS]: "Đang thực hiện",
  [Status.COMPLETED]: "Hoàn thành",
  [Status.OVERDUE]: "Quá hạn"
};

export const StatusColors = {
  [Status.NOT_STARTED]: "bg-gray-100 text-gray-800",
  [Status.IN_PROGRESS]: "bg-blue-100 text-blue-800",
  [Status.COMPLETED]: "bg-green-100 text-green-800",
  [Status.OVERDUE]: "bg-red-100 text-red-800"
}; 