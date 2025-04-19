export enum Types {
    NOTE = 1,
    PLAN=2,
    TASK=3,
    INCOME = 4,
    EXPENSE = 5,
  }
  
  export const TypeLabels: Record<Types, string> = {
    [Types.NOTE]: "NOTE",
    [Types.PLAN]: "PLAN",
    [Types.TASK]: "TASK",
    [Types.INCOME]: "INCOME",
    [Types.EXPENSE]: "EXPENSE",
  };
  