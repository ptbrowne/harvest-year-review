import { object, string, array, z } from "zod";

export const Row = object({
  Date: string(),
  Client: string(),
  Project: string(),
  "Project Code": string(),
  Task: string(),
  Notes: string(),
  Hours: string(),
  "Billable?": string(),
  "Invoiced?": string(),
  "First Name": string(),
  "Last Name": string(),
  Roles: string(),
  "Employee?": string(),
  "Billable Rate": string(),
  "Billable Amount": string(),
  Currency: string(),
  "External Reference URL": string(),
}).transform((data) => ({
  date: new Date(data.Date),
  client: data.Client,
  project: data.Project,
  projectCode: data["Project Code"],
  task: data.Task,
  notes: data.Notes,
  hours: Number(data.Hours),
  billable: data["Billable?"],
  invoiced: data["Invoiced?"],
  firstName: data["First Name"],
  lastName: data["Last Name"],
  roles: data.Roles,
  employee: data["Employee?"],
  billableRate: data["Billable Rate"],
  billableAmount: data["Billable Amount"],
  currency: data.Currency,
  externalReferenceURL: data["External Reference URL"],
}));

export const Rows = array(Row);

export type Row = z.infer<typeof Row>;
