export function dateToJson(date: Date|string): string {
  if (date instanceof Date)
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toJSON().split("T")[0];
  else
    return date;
};
