import { SubjectCode } from '../types';

export interface SubjectMeta {
  code: SubjectCode;
  name: string;
  fullName: string;
  color: string;
  bgLight: string;
  border: string;
  totalExamItems: number;
  examDay: 1 | 2 | 3;
}

export const SUBJECTS_META: Record<SubjectCode, SubjectMeta> = {
  MS: {
    code: 'MS',
    name: 'Management Services',
    fullName: 'Management Services (MS)',
    color: '#0D9488', // Teal
    bgLight: '#F0FDFA',
    border: '#99F6E4',
    totalExamItems: 70,
    examDay: 1,
  },
  AUD: {
    code: 'AUD',
    name: 'Auditing',
    fullName: 'Auditing (AUD)',
    color: '#25845B', // Emerald Green
    bgLight: '#E8F5EE',
    border: '#B2E2CB',
    totalExamItems: 70,
    examDay: 1,
  },
  TAX: {
    code: 'TAX',
    name: 'Taxation',
    fullName: 'Taxation (TAX)',
    color: '#0284C7', // Cerulean Sky (yellow-free)
    bgLight: '#F0F9FF',
    border: '#BAE6FD',
    totalExamItems: 70,
    examDay: 2,
  },
  RFBT: {
    code: 'RFBT',
    name: 'Regulatory Framework',
    fullName: 'Regulatory Framework for Business Transactions (RFBT)',
    color: '#BE185D', // Rose/Magenta (yellow-free)
    bgLight: '#FDF2F8',
    border: '#FBCFE8',
    totalExamItems: 100,
    examDay: 2,
  },
  FAR: {
    code: 'FAR',
    name: 'Financial Accounting',
    fullName: 'Financial Accounting and Reporting (FAR)',
    color: '#2563EB', // Blue
    bgLight: '#EFF6FF',
    border: '#BFDBFE',
    totalExamItems: 70,
    examDay: 3,
  },
  AFAR: {
    code: 'AFAR',
    name: 'Advanced Accounting',
    fullName: 'Advanced Financial Accounting and Reporting (AFAR)',
    color: '#7C3AED', // Violet
    bgLight: '#F5F3FF',
    border: '#DDD6FE',
    totalExamItems: 70,
    examDay: 3,
  },
};
