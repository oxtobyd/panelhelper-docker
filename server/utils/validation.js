import { z } from 'zod';
import xlsx from 'xlsx';
import fs from 'fs';

export const PanelOutcomeSchema = z.object({
  CandidateName: z.string(),
  DioceseName: z.string(),
  NationalAdviserName: z.string(),
  CompletedDate: z.union([z.number(), z.string(), z.null()]),
  LoveForGod: z.number(),
  CallToMinistry: z.number(),
  LoveForPeople: z.number(),
  Wisdom: z.number(),
  Fruitfulness: z.number(),
  Potential: z.number(),
  PanelResultText: z.string().nullable(),
  PanelName: z.string(),
  Season: z.union([z.string(), z.number()]).transform(val => String(val)),
  BishopsDecision: z.string().nullable(),
  BishopsNote: z.string().nullable().optional(),
  CandidateID: z.number()
});

export const validateExcelFile = (filepath) => {
  try {
    const workbook = xlsx.read(fs.readFileSync(filepath));
    if (!workbook.SheetNames.includes('Report')) {
      throw new Error('Excel file must contain a "Report" sheet');
    }
    return workbook;
  } catch (error) {
    throw new Error(`Invalid Excel file: ${error.message}`);
  }
};
