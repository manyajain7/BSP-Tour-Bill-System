import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const TRANSPORT_MODES = ['Air', 'Train', 'Bus', 'Road', 'Metro', 'Taxi'] as const;

export interface TravelEntry {
  sno: number;
  // From
  fromStation: string;
  fromDate: string;
  fromTime: string;
  // To
  toStation: string;
  toDate: string;
  toTime: string;
  // Details
  transportMode: string;
  travelClass?: string;
  ticketNumber: string;
  distanceKm: number;
  amount: number;
}

export interface LocalConveyanceEntry {
  sno: number;
  date: string;
  fromPlace: string;
  fromTime: string;
  toPlace: string;
  toTime: string;
  mode: string;
  amount: number;
}

export interface BillDocument {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface TourBill {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  grade: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected';

  // Tour Details (assigned from database, read-only for employee)
  destination: string;
  tourPurpose: string;
  fromDate: string;
  toDate: string;

  // Travel & Ticket Entries
  travelEntries: TravelEntry[];

  // Local Conveyance Entries
  localConveyanceEntries: LocalConveyanceEntry[];

  // Daily Allowance
  daRate: number;
  daDays: number;
  daAmount: number;

  // Documents
  documents: BillDocument[];

  // Totals - Original amounts submitted by employee
  travelSubTotal: number;
  conveyanceSubTotal: number;
  daSubTotal: number;
  totalExpenses: number;

  // Finance Edited Totals - Amounts modified by finance person
  editedTravelSubTotal?: number;
  editedConveyanceSubTotal?: number;
  editedDaSubTotal?: number;
  editedTotalExpenses?: number;

  // Finance Notes
  notes?: string;
  financeNotes?: string;
  rejectionReason?: string;
}

interface TourBillStore {
  bills: TourBill[];
  addBill: (bill: TourBill) => void;
  updateBill: (id: string, bill: Partial<TourBill>) => void;
  getBill: (id: string) => TourBill | undefined;
  getBillsByEmployee: (employeeId: string) => TourBill[];
  getAllBills: () => TourBill[];
  approveBill: (id: string, notes: string) => void;
  rejectBill: (id: string, notes: string) => void;
}

// Daily Allowance rate per grade (Rs. per day)
export const daRateByGrade: Record<string, number> = {
  E9: 4000,
  E8: 3500,
  E7: 3000,
  E6: 2750,
  E5: 2250,
  E4: 2000,
  E3: 1750,
  E2: 1500,
  E1: 1250,
  E0: 1000,
};

// Mock employee data
export const employeeDatabase: Record<string, any> = {
  'EMP001': {
    employeeId: 'EMP001',
    name: 'John Doe',
    designation: 'Senior Manager',
    grade: 'E7',
    department: 'Sales',
    email: 'john.doe@bsp.sail.in',
    phone: '9876543210',
  },
  'EMP002': {
    employeeId: 'EMP002',
    name: 'Jane Smith',
    designation: 'Developer',
    grade: 'E3',
    department: 'Engineering',
    email: 'jane.smith@bsp.sail.in',
    phone: '9876543211',
  },
  'EMP003': {
    employeeId: 'EMP003',
    name: 'Mike Johnson',
    designation: 'Analyst',
    grade: 'E2',
    department: 'Finance',
    email: 'mike.johnson@bsp.sail.in',
    phone: '9876543212',
  },
  '202324': {
    employeeId: '202324',
    name: 'Vikas Singh Yadav',
    designation: 'Assistant General Manager',
    grade: 'E5',
    department: 'C&IT',
    email: 'vikas.yadav@bsp.sail.in',
    phone: '9876500000',
  },
};

export interface AssignedTour {
  destination: string;
  tourPurpose: string;
  fromDate: string;
  toDate: string;
}

// Assigned tours come from the database and are read-only for the employee.
// Each employee is assigned a tour keyed by their employee ID.
export const assignedTourByEmployee: Record<string, AssignedTour> = {
  'EMP001': {
    destination: 'Delhi',
    tourPurpose: 'Client Meeting',
    fromDate: '2026-06-30',
    toDate: '2026-07-05',
  },
  'EMP002': {
    destination: 'Mumbai',
    tourPurpose: 'Vendor Audit',
    fromDate: '2026-05-10',
    toDate: '2026-05-14',
  },
  'EMP003': {
    destination: 'Kolkata',
    tourPurpose: 'Regional Review',
    fromDate: '2026-04-18',
    toDate: '2026-04-21',
  },
  '202324': {
    destination: 'Ranchi',
    tourPurpose: 'Plant Inspection',
    fromDate: '2026-05-01',
    toDate: '2026-05-05',
  },
};

export function getAssignedTour(employeeId: string): AssignedTour | undefined {
  return assignedTourByEmployee[employeeId];
}

// Calculate the number of tour days from the travel & ticket entries.
// Days = (last travel date - first travel date) + 1, inclusive.
export function calculateDaDaysFromTravel(entries: { fromDate?: string; toDate?: string }[]): number {
  const dates: number[] = [];
  for (const e of entries) {
    if (e.fromDate) dates.push(new Date(e.fromDate).getTime());
    if (e.toDate) dates.push(new Date(e.toDate).getTime());
  }
  if (dates.length === 0) return 0;
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  return Math.floor((max - min) / (1000 * 60 * 60 * 24)) + 1;
}

// Mock initial data
const mockBills: TourBill[] = [
  {
    id: 'BILL-20240615-001',
    employeeId: 'EMP001',
    employeeName: 'John Doe',
    designation: 'Senior Manager',
    department: 'Sales',
    grade: 'E7',
    submittedDate: '2026-07-06',
    status: 'pending',
    destination: 'Delhi',
    tourPurpose: 'Client Meeting',
    fromDate: '2026-06-30',
    toDate: '2026-07-05',
    travelEntries: [
      {
        sno: 1,
        fromStation: 'Raipur',
        fromDate: '2026-06-30',
        fromTime: '08:00',
        toStation: 'Delhi',
        toDate: '2026-06-30',
        toTime: '10:30',
        transportMode: 'Air',
        ticketNumber: 'AI-204-8891',
        distanceKm: 1150,
        amount: 8500,
      },
      {
        sno: 2,
        fromStation: 'Delhi',
        fromDate: '2026-07-05',
        fromTime: '18:00',
        toStation: 'Raipur',
        toDate: '2026-07-05',
        toTime: '20:30',
        transportMode: 'Air',
        ticketNumber: 'AI-205-7723',
        distanceKm: 1150,
        amount: 8700,
      },
    ],
    localConveyanceEntries: [
      {
        sno: 1,
        date: '2026-06-30',
        fromPlace: 'Airport',
        fromTime: '15:30',
        toPlace: 'Hotel',
        toTime: '16:45',
        mode: 'Taxi',
        amount: 450,
      },
      {
        sno: 2,
        date: '2026-07-01',
        fromPlace: 'Hotel',
        fromTime: '09:00',
        toPlace: 'Office',
        toTime: '09:30',
        mode: 'Taxi',
        amount: 350,
      },
    ],
    daRate: 3000,
    daDays: 6,
    daAmount: 18000,
    documents: [],
    travelSubTotal: 17200,
    conveyanceSubTotal: 800,
    daSubTotal: 18000,
    totalExpenses: 36000,
  },
];

export const useTourBillStore = create<TourBillStore>()(
  persist(
    (set, get) => ({
      bills: mockBills,

      addBill: (bill) =>
        set((state) => ({
          bills: [...state.bills, bill],
        })),

      updateBill: (id, updates) =>
        set((state) => ({
          bills: state.bills.map((bill) => (bill.id === id ? { ...bill, ...updates } : bill)),
        })),

      getBill: (id) => get().bills.find((bill) => bill.id === id),

      getBillsByEmployee: (employeeId) => get().bills.filter((bill) => bill.employeeId === employeeId),

      getAllBills: () => get().bills,

      approveBill: (id, notes) =>
        set((state) => ({
          bills: state.bills.map((bill) =>
            bill.id === id ? { ...bill, status: 'approved', financeNotes: notes } : bill
          ),
        })),

      rejectBill: (id, notes) =>
        set((state) => ({
          bills: state.bills.map((bill) =>
            bill.id === id ? { ...bill, status: 'rejected', financeNotes: notes } : bill
          ),
        })),
    }),
    {
      name: 'tour-bill-storage',
    }
  )
);
