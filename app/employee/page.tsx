'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  useTourBillStore,
  daRateByGrade,
  employeeDatabase,
  getAssignedTour,
  calculateDaDaysFromTravel,
  TRANSPORT_MODES,
} from '@/lib/store';
import { LogOut, Plus, X, Upload, FileText, RotateCcw } from 'lucide-react';
import { DocumentGallery } from '@/components/document-gallery';

interface TravelRow {
  sno: number;
  fromStation: string;
  fromDate: string;
  fromTime: string;
  toStation: string;
  toDate: string;
  toTime: string;
  transportMode: string;
  travelClass: string;
  ticketNumber: string;
  distanceKm: number;
  amount: number;
}

interface ConveyanceRow {
  sno: number;
  date: string;
  fromPlace: string;
  fromTime: string;
  toPlace: string;
  toTime: string;
  mode: string;
  amount: number;
}

interface UploadedDoc {
  id: string;
  name: string;
  url: string; // data URL so it can be opened/viewed
  type: string;
}

const emptyTravelRow = (sno: number): TravelRow => ({
  sno,
  fromStation: '',
  fromDate: '',
  fromTime: '',
  toStation: '',
  toDate: '',
  toTime: '',
  transportMode: '',
  travelClass: '',
  ticketNumber: '',
  distanceKm: 0,
  amount: 0,
});

const emptyConveyanceRow = (sno: number): ConveyanceRow => ({
  sno,
  date: '',
  fromPlace: '',
  fromTime: '',
  toPlace: '',
  toTime: '',
  mode: '',
  amount: 0,
});

export default function EmployeePage() {
  const { isLoggedIn, role, employeeId, userName, userGrade, logout } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const { getBillsByEmployee, addBill, updateBill } = useTourBillStore();
  const [view, setView] = useState<'bills' | 'new'>('new');
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [selectedBillForModal, setSelectedBillForModal] = useState<any>(null);
  const [billStatusFilter, setBillStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [statusNotification, setStatusNotification] = useState<{ id: string; status: 'approved' | 'rejected'; message: string } | null>(null);
  const [dismissedNotif, setDismissedNotif] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || role !== 'employee') {
      setRedirecting(true);
      router.push('/');
    }
  }, [isLoggedIn, role, router]);

  // Show a notification when a bill has changed status (approved/rejected)
  useEffect(() => {
    if (!isLoggedIn || role !== 'employee' || !employeeId) return;
    const recentBills = getBillsByEmployee(employeeId);
    const changedBill = recentBills.find((b) => b.status !== 'pending');
    if (changedBill && !statusNotification && dismissedNotif !== changedBill.id) {
      setStatusNotification({
        id: changedBill.id,
        status: changedBill.status,
        message:
          changedBill.status === 'approved'
            ? `Your bill for ${changedBill.destination} has been approved.`
            : `Your bill for ${changedBill.destination} was rejected. Reason: ${changedBill.rejectionReason || 'See bill details.'}`,
      });
    }
  }, [isLoggedIn, role, employeeId, getBillsByEmployee, statusNotification, dismissedNotif]);

  // Assigned tour (read-only, comes from the database)
  const assignedTour = employeeId ? getAssignedTour(employeeId) : undefined;
  const destination = assignedTour?.destination || '';
  const tourPurpose = assignedTour?.tourPurpose || '';
  const fromDate = assignedTour?.fromDate || '';
  const toDate = assignedTour?.toDate || '';

  // Form state
  const [travelRows, setTravelRows] = useState<TravelRow[]>([emptyTravelRow(1)]);
  const [conveyanceRows, setConveyanceRows] = useState<ConveyanceRow[]>([emptyConveyanceRow(1)]);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);

  const currentEmployee = employeeId ? employeeDatabase[employeeId] : undefined;

  // DA days are derived from the travel & ticket dates (earliest -> latest)
  const daDays = useMemo(
    () =>
      calculateDaDaysFromTravel(
        travelRows.map((r) => ({ fromDate: r.fromDate, toDate: r.toDate }))
      ),
    [travelRows]
  );

  const daRate = userGrade ? daRateByGrade[userGrade] || 0 : 0;
  const daAmount = daDays * daRate;
  const travelSubTotal = travelRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const conveyanceSubTotal = conveyanceRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const totalExpenses = travelSubTotal + conveyanceSubTotal + daAmount;

  const bills = employeeId ? getBillsByEmployee(employeeId) : [];

  if (redirecting || !isLoggedIn || role !== 'employee') {
    return null;
  }

  const handleAddTravelRow = () => {
    const newSno = Math.max(...travelRows.map((r) => r.sno), 0) + 1;
    setTravelRows([...travelRows, emptyTravelRow(newSno)]);
  };

  const handleRemoveTravelRow = (sno: number) => {
    if (travelRows.length > 1) {
      setTravelRows(travelRows.filter((r) => r.sno !== sno));
    }
  };

  const handleUpdateTravelRow = (sno: number, field: keyof TravelRow, value: any) => {
    setTravelRows(travelRows.map((r) => (r.sno === sno ? { ...r, [field]: value } : r)));
  };

  const handleAddConveyanceRow = () => {
    const newSno = Math.max(...conveyanceRows.map((r) => r.sno), 0) + 1;
    setConveyanceRows([...conveyanceRows, emptyConveyanceRow(newSno)]);
  };

  const handleRemoveConveyanceRow = (sno: number) => {
    if (conveyanceRows.length > 1) {
      setConveyanceRows(conveyanceRows.filter((r) => r.sno !== sno));
    }
  };

  const handleUpdateConveyanceRow = (sno: number, field: keyof ConveyanceRow, value: any) => {
    setConveyanceRows(conveyanceRows.map((r) => (r.sno === sno ? { ...r, [field]: value } : r)));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;
    Array.from(files).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = () => {
        const id = `doc-${Date.now()}-${i}`;
        setDocuments((prev) => [
          ...prev,
          { id, name: file.name, url: reader.result as string, type: file.type || 'application/octet-stream' },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.currentTarget.value = '';
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
  };

  const openDocument = (doc: { url: string; name: string; type: string }) => {
    if (!doc.url || doc.url === '#') {
      alert('This document is not available to preview.');
      return;
    }
    const win = window.open();
    if (win) {
      if (doc.type.startsWith('image/')) {
        win.document.write(
          `<title>${doc.name}</title><img src="${doc.url}" style="max-width:100%" alt="${doc.name}" />`
        );
      } else {
        win.document.write(
          `<title>${doc.name}</title><iframe src="${doc.url}" style="border:0;width:100%;height:100%;position:absolute;top:0;left:0"></iframe>`
        );
      }
    }
  };

  const resetForm = () => {
    setTravelRows([emptyTravelRow(1)]);
    setConveyanceRows([emptyConveyanceRow(1)]);
    setDocuments([]);
    setEditingBillId(null);
  };

  // Load a rejected bill back into the form for editing and resubmission
  const handleEditAndResubmit = (bill: any) => {
    setTravelRows(
      (bill.travelEntries || []).map((e: any) => ({
        sno: e.sno,
        fromStation: e.fromStation || '',
        fromDate: e.fromDate || '',
        fromTime: e.fromTime || '',
        toStation: e.toStation || '',
        toDate: e.toDate || '',
        toTime: e.toTime || '',
        transportMode: e.transportMode || '',
        travelClass: e.travelClass || '',
        ticketNumber: e.ticketNumber || '',
        distanceKm: e.distanceKm || 0,
        amount: e.amount || 0,
      }))
    );
    setConveyanceRows(
      (bill.localConveyanceEntries && bill.localConveyanceEntries.length > 0
        ? bill.localConveyanceEntries.map((e: any) => ({
            sno: e.sno,
            date: e.date || '',
            fromPlace: e.fromPlace || '',
            fromTime: e.fromTime || '',
            toPlace: e.toPlace || '',
            toTime: e.toTime || '',
            mode: e.mode || '',
            amount: e.amount || 0,
          }))
        : [emptyConveyanceRow(1)])
    );
    setDocuments(
      (bill.documents || []).map((d: any) => ({ id: d.id, name: d.name, url: d.url, type: d.type }))
    );
    setEditingBillId(bill.id);
    setSelectedBillForModal(null);
    setView('new');
  };

  const isWithinTour = (date: string) => {
    if (!date) return true;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };

  const handleSubmitBill = () => {
    if (!assignedTour) {
      alert('No tour has been assigned to you. Please contact administration.');
      return;
    }

    // Travel & ticket details are mandatory
    const travelIncomplete = travelRows.some(
      (r) =>
        !r.fromStation ||
        !r.fromDate ||
        !r.fromTime ||
        !r.toStation ||
        !r.toDate ||
        !r.toTime ||
        !r.transportMode ||
        !r.ticketNumber ||
        r.amount === 0
    );
    if (travelIncomplete) {
      alert('Please fill in all Travel & Ticket details before submitting.');
      return;
    }

    // Date validation against assigned tour window
    const travelDatesValid = travelRows.every((r) => isWithinTour(r.fromDate) && isWithinTour(r.toDate));
    if (!travelDatesValid) {
      alert(`Travel dates must be within the assigned tour window (${fromDate} to ${toDate}).`);
      return;
    }

    // Local conveyance is optional, but any filled rows must be within the tour window
    const conveyanceFilled = conveyanceRows.filter(
      (r) => r.date || r.fromPlace || r.toPlace || r.amount
    );
    const conveyanceDatesValid = conveyanceFilled.every((r) => isWithinTour(r.date));
    if (!conveyanceDatesValid) {
      alert(`Local conveyance dates must be within the assigned tour window (${fromDate} to ${toDate}).`);
      return;
    }

    // At least one document is required
    if (documents.length === 0) {
      alert('Please upload at least one supporting document before submitting.');
      return;
    }

    const billId = editingBillId || `BILL-${new Date().getTime()}`;
    const newBill = {
      id: billId,
      employeeId: employeeId!,
      employeeName: userName || 'Employee',
      designation: currentEmployee?.designation || '',
      department: currentEmployee?.department || '',
      grade: userGrade || '',
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'pending' as const,
      destination,
      tourPurpose,
      fromDate,
      toDate,
      travelEntries: travelRows.map((r) => ({
        sno: r.sno,
        fromStation: r.fromStation,
        fromDate: r.fromDate,
        fromTime: r.fromTime,
        toStation: r.toStation,
        toDate: r.toDate,
        toTime: r.toTime,
        transportMode: r.transportMode,
        travelClass: r.travelClass,
        ticketNumber: r.ticketNumber,
        distanceKm: r.distanceKm,
        amount: r.amount,
      })),
      localConveyanceEntries: conveyanceFilled.map((r) => ({
        sno: r.sno,
        date: r.date,
        fromPlace: r.fromPlace,
        fromTime: r.fromTime,
        toPlace: r.toPlace,
        toTime: r.toTime,
        mode: r.mode,
        amount: r.amount,
      })),
      daRate,
      daDays,
      daAmount,
      documents: documents.map((d) => ({
        id: d.id,
        name: d.name,
        url: d.url,
        type: d.type,
      })),
      travelSubTotal,
      conveyanceSubTotal,
      daSubTotal: daAmount,
      totalExpenses,
    };

    if (editingBillId) {
      // Resubmit: reset finance fields and send back to pending review
      updateBill(editingBillId, {
        ...newBill,
        editedTravelSubTotal: undefined,
        editedConveyanceSubTotal: undefined,
        editedDaSubTotal: undefined,
        editedTotalExpenses: undefined,
        financeNotes: undefined,
        rejectionReason: undefined,
      });
      setDismissedNotif(editingBillId);
      setStatusNotification(null);
      alert('Bill resubmitted successfully! It is now pending review again.');
    } else {
      addBill(newBill);
      alert('Bill submitted successfully!');
    }
    setView('bills');
    resetForm();
  };

  const getInitials = () => {
    if (!userName) return 'E';
    const parts = userName.split(' ');
    return (parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">BSP Tour Bill System</h1>
          <div className="relative">
            <button
              onClick={() => setShowProfileCard(!showProfileCard)}
              className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs hover:bg-blue-700 transition"
              title="Profile"
            >
              {getInitials()}
            </button>
            {showProfileCard && (
              <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-52 z-50 text-xs">
                <div className="space-y-1">
                  <div><span className="text-gray-500">ID:</span> <span className="font-semibold">{employeeId}</span></div>
                  <div><span className="text-gray-500">Name:</span> <span className="font-semibold">{userName}</span></div>
                  <div><span className="text-gray-500">Grade:</span> <span className="font-semibold">{userGrade}</span></div>
                  {currentEmployee && (
                    <>
                      <div className="text-gray-500">{currentEmployee.email}</div>
                      <div className="text-gray-500">{currentEmployee.department}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Narrow */}
        <aside className="w-28 bg-white border-r border-slate-200 min-h-[calc(100vh-64px)] flex flex-col p-1 space-y-0.5">
          <button
            onClick={() => { resetForm(); setView('new'); setShowProfileCard(false); }}
            className={`px-2 py-1.5 rounded text-xs font-medium transition ${
              view === 'new' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-slate-100'
            }`}
          >
            New Bill
          </button>
          <button
            onClick={() => { setView('bills'); setShowProfileCard(false); }}
            className={`px-2 py-1.5 rounded text-xs font-medium transition ${
              view === 'bills' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-slate-100'
            }`}
          >
            My Bills
          </button>
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="w-full px-2 py-1.5 mt-0.5 rounded text-xs font-medium text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-0.5"
          >
            <LogOut size={12} /> Logout
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-2 max-w-6xl">
          {view === 'bills' && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">My Bills</h2>

              {/* Status Filter Buttons */}
              <div className="flex gap-1 mb-3">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setBillStatusFilter(status)}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold transition ${
                      billStatusFilter === status
                        ? status === 'all' ? 'bg-blue-600 text-white' :
                          status === 'pending' ? 'bg-yellow-600 text-white' :
                          status === 'approved' ? 'bg-green-600 text-white' :
                          'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {bills.length === 0 ? (
                <p className="text-gray-500 text-xs">No bills submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {bills
                    .filter((bill) => billStatusFilter === 'all' || bill.status === billStatusFilter)
                    .map((bill) => (
                      <div
                        key={bill.id}
                        onClick={() => setSelectedBillForModal(bill)}
                        className="bg-white border border-slate-200 rounded p-3 cursor-pointer hover:shadow-md transition"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{bill.destination}</div>
                            <div className="text-gray-500 text-xs">{bill.fromDate} to {bill.toDate}</div>
                            {bill.status === 'rejected' && bill.rejectionReason && (
                              <div className="mt-1 p-1.5 bg-red-50 border border-red-200 rounded text-xs">
                                <span className="font-semibold text-red-700">Reason: </span>
                                <span className="text-red-600">{bill.rejectionReason}</span>
                              </div>
                            )}
                            {bill.status === 'rejected' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditAndResubmit(bill); }}
                                className="mt-1.5 px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition inline-flex items-center gap-1"
                              >
                                <RotateCcw size={11} /> Edit &amp; Resubmit
                              </button>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">₹{(bill.editedTotalExpenses || bill.totalExpenses).toLocaleString()}</div>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-block ${
                              bill.status === 'approved' ? 'bg-green-100 text-green-700' :
                              bill.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {bill.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {view === 'new' && (
            <div className="space-y-1.5">
              {/* Employee Info Header */}
              <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div><span className="text-gray-600">Employee ID:</span> <span className="font-semibold text-gray-900">{employeeId}</span></div>
                  <div><span className="text-gray-600">Name:</span> <span className="font-semibold text-gray-900">{userName}</span></div>
                  <div><span className="text-gray-600">Grade:</span> <span className="font-semibold text-gray-900">{userGrade}</span></div>
                  <div><span className="text-gray-600">Department:</span> <span className="font-semibold text-gray-900">{currentEmployee?.department}</span></div>
                </div>
              </div>

              <h2 className="text-base font-bold text-gray-900">{editingBillId ? 'Edit & Resubmit Bill' : 'New Tour Bill'}</h2>
              {editingBillId && (
                <div className="bg-amber-50 border border-amber-200 rounded p-1.5 text-xs text-amber-800">
                  You are editing a previously rejected bill. Make the required changes and click <span className="font-semibold">Resubmit</span> to send it back for review.
                </div>
              )}

              {/* Tour Details - Read Only (assigned from database) */}
              <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-gray-900">Tour Details</h3>
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Assigned · read-only</span>
                </div>
                {assignedTour ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-gray-500">Destination</span><div className="font-semibold text-gray-900">{destination}</div></div>
                    <div><span className="text-gray-500">Purpose</span><div className="font-semibold text-gray-900">{tourPurpose}</div></div>
                    <div><span className="text-gray-500">From</span><div className="font-semibold text-gray-900">{fromDate}</div></div>
                    <div><span className="text-gray-500">To</span><div className="font-semibold text-gray-900">{toDate}</div></div>
                  </div>
                ) : (
                  <p className="text-xs text-red-600">No tour has been assigned to you yet.</p>
                )}
              </div>

              {/* Travel & Ticket Table */}
              <div className="bg-white border border-slate-200 rounded p-2 space-y-1 text-xs overflow-x-auto">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Travel &amp; Ticket <span className="text-red-500">*</span></h3>
                  <button
                    onClick={handleAddTravelRow}
                    className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 flex items-center gap-0.5"
                  >
                    <Plus size={10} /> Add
                  </button>
                </div>
                <table className="w-full border-collapse text-xs min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-slate-300">
                      <th className="border border-slate-300 p-0.5" rowSpan={2}>S</th>
                      <th className="border border-slate-300 p-0.5 text-center" colSpan={3}>From</th>
                      <th className="border border-slate-300 p-0.5 text-center" colSpan={3}>To</th>
                      <th className="border border-slate-300 p-0.5" rowSpan={2}>Mode</th>
                      <th className="border border-slate-300 p-0.5" rowSpan={2}>Class</th>
                      <th className="border border-slate-300 p-0.5" rowSpan={2}>Ticket No.</th>
                      <th className="border border-slate-300 p-0.5" rowSpan={2}>Dist (km)</th>
                      <th className="border border-slate-300 p-0.5 text-right" rowSpan={2}>Amt</th>
                      <th className="border border-slate-300 p-0.5" rowSpan={2}>X</th>
                    </tr>
                    <tr className="bg-gray-100 border-b border-slate-300">
                      <th className="border border-slate-300 p-0.5 text-left">Station</th>
                      <th className="border border-slate-300 p-0.5 text-left">Date</th>
                      <th className="border border-slate-300 p-0.5 text-left">Time</th>
                      <th className="border border-slate-300 p-0.5 text-left">Station</th>
                      <th className="border border-slate-300 p-0.5 text-left">Date</th>
                      <th className="border border-slate-300 p-0.5 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {travelRows.map((row) => (
                      <tr key={row.sno} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-0.5 text-center">{row.sno}</td>
                        <td className="border border-slate-300 p-0.5">
                          <input type="text" value={row.fromStation} onChange={(e) => handleUpdateTravelRow(row.sno, 'fromStation', e.target.value)} className="w-24 px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Station" />
                        </td>
                        <td className="border border-slate-300 p-0.5">
                          <input type="date" min={fromDate} max={toDate} value={row.fromDate} onChange={(e) => handleUpdateTravelRow(row.sno, 'fromDate', e.target.value)} className="px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="border border-slate-300 p-0.5">
                          <input type="time" value={row.fromTime} onChange={(e) => handleUpdateTravelRow(row.sno, 'fromTime', e.target.value)} className="px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="border border-slate-300 p-0.5">
                          <input type="text" value={row.toStation} onChange={(e) => handleUpdateTravelRow(row.sno, 'toStation', e.target.value)} className="w-24 px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Station" />
                        </td>
                        <td className="border border-slate-300 p-0.5">
                          <input type="date" min={fromDate} max={toDate} value={row.toDate} onChange={(e) => handleUpdateTravelRow(row.sno, 'toDate', e.target.value)} className="px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="border border-slate-300 p-0.5">
                          <input type="time" value={row.toTime} onChange={(e) => handleUpdateTravelRow(row.sno, 'toTime', e.target.value)} className="px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="border border-slate-300 p-0.5">
                          <select value={row.transportMode} onChange={(e) => handleUpdateTravelRow(row.sno, 'transportMode', e.target.value)} className="px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                            <option value="">Select</option>
                            {TRANSPORT_MODES.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-slate-300 p-0.5">
                          <input type="text" value={row.travelClass} onChange={(e) => handleUpdateTravelRow(row.sno, 'travelClass', e.target.value)} className="w-20 px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. 3A" />
                        </td>
                        <td className="border border-slate-300 p-0.5">
                          <input type="text" value={row.ticketNumber} onChange={(e) => handleUpdateTravelRow(row.sno, 'ticketNumber', e.target.value)} className="w-24 px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ticket #" />
                        </td>
                        <td className="border border-slate-300 p-0.5">
                          <input type="number" value={row.distanceKm} onChange={(e) => handleUpdateTravelRow(row.sno, 'distanceKm', parseFloat(e.target.value) || 0)} className="w-16 px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                        </td>
                        <td className="border border-slate-300 p-0.5 text-right">
                          <input type="number" value={row.amount} onChange={(e) => handleUpdateTravelRow(row.sno, 'amount', parseFloat(e.target.value) || 0)} className="w-20 px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                        </td>
                        <td className="border border-slate-300 p-0.5 text-center">
                          {travelRows.length > 1 && (
                            <button onClick={() => handleRemoveTravelRow(row.sno)} className="text-red-600 hover:text-red-800">
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right text-xs font-semibold">Sub-Total: ₹{travelSubTotal.toLocaleString()}</div>
                {fromDate && toDate && (
                  <div className="text-[10px] text-gray-500">Dates must be between {fromDate} and {toDate}.</div>
                )}
              </div>

              {/* Local Conveyance Table */}
              <div className="bg-white border border-slate-200 rounded p-2 space-y-1 text-xs overflow-x-auto">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Local Conveyance <span className="text-gray-400 font-normal">(optional)</span></h3>
                  <button
                    onClick={handleAddConveyanceRow}
                    className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 flex items-center gap-0.5"
                  >
                    <Plus size={10} /> Add
                  </button>
                </div>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-slate-300">
                      <th className="border border-slate-300 p-0.5 text-left">S</th>
                      <th className="border border-slate-300 p-0.5 text-left">Date</th>
                      <th className="border border-slate-300 p-0.5 text-left">From Pl</th>
                      <th className="border border-slate-300 p-0.5 text-left">Time</th>
                      <th className="border border-slate-300 p-0.5 text-left">To Pl</th>
                      <th className="border border-slate-300 p-0.5 text-left">Time</th>
                      <th className="border border-slate-300 p-0.5 text-left">Mode</th>
                      <th className="border border-slate-300 p-0.5 text-right">Amt</th>
                      <th className="border border-slate-300 p-0.5">X</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conveyanceRows.map((row) => (
                      <tr key={row.sno} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-0.5 text-center">{row.sno}</td>
                        <td className="border border-slate-300 p-0.5"><input type="date" min={fromDate} max={toDate} value={row.date} onChange={(e) => handleUpdateConveyanceRow(row.sno, 'date', e.target.value)} className="w-full px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                        <td className="border border-slate-300 p-0.5"><input type="text" value={row.fromPlace} onChange={(e) => handleUpdateConveyanceRow(row.sno, 'fromPlace', e.target.value)} className="w-full px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                        <td className="border border-slate-300 p-0.5"><input type="time" value={row.fromTime} onChange={(e) => handleUpdateConveyanceRow(row.sno, 'fromTime', e.target.value)} className="w-full px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                        <td className="border border-slate-300 p-0.5"><input type="text" value={row.toPlace} onChange={(e) => handleUpdateConveyanceRow(row.sno, 'toPlace', e.target.value)} className="w-full px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                        <td className="border border-slate-300 p-0.5"><input type="time" value={row.toTime} onChange={(e) => handleUpdateConveyanceRow(row.sno, 'toTime', e.target.value)} className="w-full px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                        <td className="border border-slate-300 p-0.5">
                          <select value={row.mode} onChange={(e) => handleUpdateConveyanceRow(row.sno, 'mode', e.target.value)} className="w-full px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                            <option value="">Select</option>
                            {TRANSPORT_MODES.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-slate-300 p-0.5 text-right"><input type="number" value={row.amount} onChange={(e) => handleUpdateConveyanceRow(row.sno, 'amount', parseFloat(e.target.value) || 0)} className="w-full px-0.5 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" /></td>
                        <td className="border border-slate-300 p-0.5 text-center">
                          {conveyanceRows.length > 1 && (
                            <button onClick={() => handleRemoveConveyanceRow(row.sno)} className="text-red-600 hover:text-red-800">
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right text-xs font-semibold">Sub-Total: ₹{conveyanceSubTotal.toLocaleString()}</div>
              </div>

              {/* Daily Allowance */}
              <div className="bg-white border border-slate-200 rounded p-2 space-y-1 text-xs">
                <h3 className="font-semibold text-gray-900">Daily Allowance</h3>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <div><span className="text-gray-500">Grade:</span> <div className="font-semibold">{userGrade}</div></div>
                  <div><span className="text-gray-500">Rate/Day:</span> <div className="font-semibold">₹{daRate.toLocaleString()}</div></div>
                  <div><span className="text-gray-500">Days (from travel):</span> <div className="font-semibold">{daDays}</div></div>
                  <div><span className="text-gray-500">Total:</span> <div className="font-semibold">₹{daAmount.toLocaleString()}</div></div>
                </div>
                <div className="text-[10px] text-gray-500">Days are auto-calculated from your Travel &amp; Ticket dates.</div>
              </div>

              {/* Documents */}
              <div className="bg-white border border-slate-200 rounded p-2 space-y-1 text-xs">
                <h3 className="font-semibold text-gray-900 mb-1">Documents <span className="text-red-500">*</span></h3>
                <label className="block">
                  <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                  <div className="cursor-pointer px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-semibold hover:bg-slate-200 inline-flex items-center gap-0.5">
                    <Upload size={12} /> Upload
                  </div>
                </label>
                {documents.length > 0 && (
                  <div className="space-y-0.5">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex justify-between items-center bg-slate-50 p-0.5 rounded text-xs">
                        <button onClick={() => openDocument(doc)} className="truncate text-blue-600 hover:underline flex items-center gap-1">
                          <FileText size={12} /> {doc.name}
                        </button>
                        <button onClick={() => handleRemoveDocument(doc.id)} className="text-red-600 hover:text-red-800">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary & Submit - highlighted, user friendly */}
              <div className="bg-white border-2 border-blue-300 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-blue-600 px-3 py-1.5">
                  <h3 className="text-sm font-bold text-white">Claim Summary</h3>
                </div>
                <div className="p-2 space-y-1.5">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-center">
                      <div className="text-[11px] text-gray-500">Travel &amp; Ticket</div>
                      <div className="text-sm font-bold text-gray-900">₹{travelSubTotal.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-center">
                      <div className="text-[11px] text-gray-500">Local Conveyance</div>
                      <div className="text-sm font-bold text-gray-900">₹{conveyanceSubTotal.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-center">
                      <div className="text-[11px] text-gray-500">Daily Allowance</div>
                      <div className="text-sm font-bold text-gray-900">₹{daAmount.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <div>
                      <div className="text-xs font-semibold text-blue-900">Total Claim Amount</div>
                      <div className="text-[11px] text-blue-700">Reimbursable for this month</div>
                    </div>
                    <div className="text-xl font-bold text-blue-700">₹{totalExpenses.toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2 pt-0.5">
                    <button
                      onClick={handleSubmitBill}
                      className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded font-semibold text-xs hover:bg-blue-700 transition"
                    >
                      {editingBillId ? 'Resubmit Bill' : 'Submit Bill'}
                    </button>
                    <button
                      onClick={() => { setView('bills'); resetForm(); }}
                      className="flex-1 px-2 py-1.5 bg-gray-200 text-gray-800 rounded font-semibold text-xs hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bill Details Modal */}
      {selectedBillForModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-5 py-3 flex justify-between items-center rounded-t-xl">
              <h2 className="text-lg font-bold text-gray-900">Bill Details - {selectedBillForModal.destination}</h2>
              <button
                onClick={() => setSelectedBillForModal(null)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                {/* Employee + Tour Info combined */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      <div><span className="font-semibold text-gray-700">ID:</span> <span className="text-gray-900">{selectedBillForModal.employeeId}</span></div>
                      <div><span className="font-semibold text-gray-700">Name:</span> <span className="text-gray-900">{selectedBillForModal.employeeName}</span></div>
                      <div><span className="font-semibold text-gray-700">Grade:</span> <span className="text-gray-900">{selectedBillForModal.grade}</span></div>
                      <div><span className="font-semibold text-gray-700">Dept:</span> <span className="text-gray-900">{selectedBillForModal.department}</span></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      <div><span className="font-semibold text-gray-700">Dest:</span> <span className="text-gray-900">{selectedBillForModal.destination}</span></div>
                      <div><span className="font-semibold text-gray-700">Purpose:</span> <span className="text-gray-900">{selectedBillForModal.tourPurpose}</span></div>
                      <div><span className="font-semibold text-gray-700">From:</span> <span className="text-gray-900">{selectedBillForModal.fromDate}</span></div>
                      <div><span className="font-semibold text-gray-700">To:</span> <span className="text-gray-900">{selectedBillForModal.toDate}</span></div>
                    </div>
                  </div>
                </div>

                {/* Summary with Finance Edits (original + edited shown) */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-300">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Expense Summary</h4>
                  <div className="space-y-1.5 text-sm">
                    <SummaryRow
                      label="Travel & Ticket"
                      original={selectedBillForModal.travelSubTotal}
                      edited={selectedBillForModal.editedTravelSubTotal}
                    />
                    <SummaryRow
                      label="Local Conveyance"
                      original={selectedBillForModal.conveyanceSubTotal}
                      edited={selectedBillForModal.editedConveyanceSubTotal}
                    />
                    <SummaryRow
                      label={`Daily Allowance (${selectedBillForModal.daDays}d @ ₹${selectedBillForModal.daRate})`}
                      original={selectedBillForModal.daSubTotal}
                      edited={selectedBillForModal.editedDaSubTotal}
                    />
                    <div className="flex justify-between items-center bg-blue-200 px-3 py-2 rounded-lg font-bold text-base">
                      <span className="text-gray-900">Total:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-900">₹{(selectedBillForModal.editedTotalExpenses || selectedBillForModal.totalExpenses).toLocaleString()}</span>
                        {selectedBillForModal.editedTotalExpenses != null && selectedBillForModal.editedTotalExpenses !== selectedBillForModal.totalExpenses && (
                          <span className="text-sm font-normal text-gray-600 line-through">₹{selectedBillForModal.totalExpenses.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents - compact gallery */}
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Uploaded Documents</h4>
                  <DocumentGallery documents={selectedBillForModal.documents || []} onView={openDocument} />
                </div>

                {/* Status + Rejection inline */}
                <div className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg text-sm">
                  <span className="font-semibold text-gray-700">Status:</span>
                  <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                    selectedBillForModal.status === 'approved' ? 'bg-green-100 text-green-800' :
                    selectedBillForModal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedBillForModal.status.charAt(0).toUpperCase() + selectedBillForModal.status.slice(1)}
                  </span>
                </div>

                {/* Rejection Reason only (no finance notes on employee side) */}
                {selectedBillForModal.status === 'rejected' && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-300">
                    <h4 className="text-sm font-bold text-red-900 mb-1">Rejection Reason</h4>
                    <p className="text-sm text-red-800">{selectedBillForModal.rejectionReason || 'No reason provided'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-3 rounded-b-xl">
              {selectedBillForModal.status === 'rejected' && (
                <button
                  onClick={() => handleEditAndResubmit(selectedBillForModal)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={14} /> Edit &amp; Resubmit
                </button>
              )}
              <button
                onClick={() => setSelectedBillForModal(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Notification - simple, compact, single close button */}
      {statusNotification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-md shadow-md text-white text-xs max-w-md ${
          statusNotification.status === 'approved' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          <span className="font-medium">{statusNotification.message}</span>
          <button
            onClick={() => { setDismissedNotif(statusNotification.id); setStatusNotification(null); }}
            className="font-bold leading-none hover:opacity-80"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, original, edited }: { label: string; original: number; edited?: number }) {
  const hasEdit = edited != null && edited !== original;
  return (
  <div className="flex justify-between items-center border-b border-green-200 pb-1.5">
  <span className="font-semibold text-gray-700">{label}:</span>
  <div className="flex items-center gap-2">
  <span className="font-bold text-green-700">₹{(edited != null ? edited : original).toLocaleString()}</span>
  {hasEdit && (
  <span className="text-sm text-gray-600 line-through">₹{original.toLocaleString()}</span>
  )}
      </div>
    </div>
  );
}
