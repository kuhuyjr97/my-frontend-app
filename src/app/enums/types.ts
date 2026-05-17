export enum Types {
    NOTE = 1,
    PLAN = 2,
    TASK = 3,
    INCOME = 4,
    EXPENSE = 5,
    PAY_LATER = 6,
    FUEL = 7,
  }

  export const TypeLabels: Record<Types, string> = {
    [Types.NOTE]: "NOTE",
    [Types.PLAN]: "PLAN",
    [Types.TASK]: "TASK",
    [Types.INCOME]: "INCOME",
    [Types.EXPENSE]: "EXPENSE",
    [Types.PAY_LATER]: "PAY_LATER",
    [Types.FUEL]: "FUEL",
  };
  