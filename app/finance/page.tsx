'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTourBillStore, TourBill } from '@/lib/store';
import { DocumentGallery } from '@/components/document-gallery';

export default function FinancePortal() {
  const { logout } = useAuth();
  const router = useRouter();
  const { getAllBills, approveBill, rejectBill, updateBill } = useTourBillStore();
  const [bills, setBills] = useState(getAllBills());
  const [selectedBill, setSelectedBill] = useState<TourBill | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [editMode, setEditMode] = useState(false);
  const [editedTravel, setEditedTravel] = useState<string>('');
  const [editedConveyance, setEditedConveyance] = useState<string>('');
  const [editedDA, setEditedDA] = useState<string>('');

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const filteredBills = bills
    .filter((bill) => {
      if (filterStatus !== 'all' && bill.status !== filterStatus) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return (
          bill.employeeName.toLowerCase().includes(lower) ||
          bill.destination.toLowerCase().includes(lower) ||
          bill.employeeId.toLowerCase().includes(lower)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime();
      } else {
        return b.totalExpenses - a.totalExpenses;
      }
    });

  const handleApprove = () => {
    if (selectedBill) {
      const travelEdit = parseFloat(editedTravel) || selectedBill.travelSubTotal;
      const conveyanceEdit = parseFloat(editedConveyance) || selectedBill.conveyanceSubTotal;
      // Daily allowance is a predefined value from the database and is not editable.
      const daEdit = selectedBill.daSubTotal;
      const totalEdit = travelEdit + conveyanceEdit + daEdit;

      updateBill(selectedBill.id, {
        editedTravelSubTotal: travelEdit,
        editedConveyanceSubTotal: conveyanceEdit,
        editedDaSubTotal: daEdit,
        editedTotalExpenses: totalEdit,
        financeNotes: modalNotes,
      });
      approveBill(selectedBill.id, modalNotes);
      setBills(getAllBills());
      setSelectedBill(null);
      setModalNotes('');
      setEditMode(false);
      setEditedTravel('');
      setEditedConveyance('');
      setEditedDA('');
    }
  };

  const handleReject = () => {
    if (selectedBill) {
      updateBill(selectedBill.id, {
        financeNotes: modalNotes,
        rejectionReason: modalNotes,
      });
      rejectBill(selectedBill.id, modalNotes);
      setBills(getAllBills());
      setSelectedBill(null);
      setModalNotes('');
      setEditMode(false);
      setEditedTravel('');
      setEditedConveyance('');
      setEditedDA('');
    }
  };

  const handleSaveEdits = () => {
    if (selectedBill) {
      const travelEdit = parseFloat(editedTravel) || selectedBill.travelSubTotal;
      const conveyanceEdit = parseFloat(editedConveyance) || selectedBill.conveyanceSubTotal;
      // Daily allowance is a predefined value from the database and is not editable.
      const daEdit = selectedBill.daSubTotal;
      const totalEdit = travelEdit + conveyanceEdit + daEdit;

      updateBill(selectedBill.id, {
        editedTravelSubTotal: travelEdit,
        editedConveyanceSubTotal: conveyanceEdit,
        editedDaSubTotal: daEdit,
        editedTotalExpenses: totalEdit,
      });
      const updated = getAllBills();
      setBills(updated);
      // Keep the modal open with the freshly saved values
      const refreshed = updated.find((b) => b.id === selectedBill.id) || null;
      setSelectedBill(refreshed);
      setEditMode(false);
    }
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

  const openModal = (bill: TourBill) => {
    setSelectedBill(bill);
    setEditedTravel(bill.editedTravelSubTotal?.toString() || bill.travelSubTotal.toString());
    setEditedConveyance(bill.editedConveyanceSubTotal?.toString() || bill.conveyanceSubTotal.toString());
    setEditedDA(bill.editedDaSubTotal?.toString() || bill.daSubTotal.toString());
    setModalNotes(bill.financeNotes || '');
    setEditMode(false);
  };

  const downloadReport = (status: 'pending' | 'approved' | 'rejected') => {
    const statusBills = bills.filter(b => b.status === status);
    
    // Show alert if no bills for this status
    if (statusBills.length === 0) {
      alert(`No ${status} bills to download. Please try another category.`);
      return;
    }

    const reportData = statusBills.map(bill => ({
      'Bill ID': bill.id,
      'Employee': bill.employeeName,
      'Employee ID': bill.employeeId,
      'Destination': bill.destination,
      'Amount': bill.totalExpenses,
      'Status': bill.status,
      'Submitted Date': bill.submittedDate,
    }));

    // Create CSV content
    const headers = Object.keys(reportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${status}_bills_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Finance Review Portal</h1>
          <Button onClick={handleLogout} className="bg-gray-600 hover:bg-gray-700 text-white">
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Employee name, ID, destination..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Submission Date</option>
                <option value="amount">Amount</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => { setSearchTerm(''); setFilterStatus('all'); }} className="w-full bg-gray-400 hover:bg-gray-500 text-white">
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Bills</p>
            <p className="text-2xl font-bold text-gray-800">{bills.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{bills.filter((b) => b.status === 'pending').length}</p>
              </div>
              <button
                onClick={() => downloadReport('pending')}
                className="p-1.5 hover:bg-yellow-100 rounded transition"
                title="Download Pending Bills Report"
              >
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{bills.filter((b) => b.status === 'approved').length}</p>
              </div>
              <button
                onClick={() => downloadReport('approved')}
                className="p-1.5 hover:bg-green-100 rounded transition"
                title="Download Approved Bills Report"
              >
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{bills.filter((b) => b.status === 'rejected').length}</p>
              </div>
              <button
                onClick={() => downloadReport('rejected')}
                className="p-1.5 hover:bg-red-100 rounded transition"
                title="Download Rejected Bills Report"
              >
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bills Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tour</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Submitted</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No bills found
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{bill.employeeName}</div>
                      <div className="text-xs text-gray-600">{bill.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{bill.destination}</div>
                      <div className="text-xs text-gray-600">{bill.tourPurpose}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ₹{bill.totalExpenses.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{bill.submittedDate}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[bill.status]}`}>
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Button
                        onClick={() => openModal(bill)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detail Modal - Large */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-5 py-3 flex justify-between items-center rounded-t-xl">
              <h2 className="text-lg font-bold text-gray-900">Bill Details - {selectedBill.id}</h2>
              <button
                onClick={() => {
                  setSelectedBill(null);
                  setModalNotes('');
                  setEditMode(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
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
                      <div><span className="font-semibold text-gray-700">Name:</span> <span className="text-gray-900">{selectedBill.employeeName}</span></div>
                      <div><span className="font-semibold text-gray-700">ID:</span> <span className="text-gray-900">{selectedBill.employeeId}</span></div>
                      <div><span className="font-semibold text-gray-700">Grade:</span> <span className="text-gray-900">{selectedBill.grade}</span></div>
                      <div><span className="font-semibold text-gray-700">Desig:</span> <span className="text-gray-900">{selectedBill.designation}</span></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      <div><span className="font-semibold text-gray-700">Dest:</span> <span className="text-gray-900">{selectedBill.destination}</span></div>
                      <div><span className="font-semibold text-gray-700">Purpose:</span> <span className="text-gray-900">{selectedBill.tourPurpose}</span></div>
                      <div><span className="font-semibold text-gray-700">From:</span> <span className="text-gray-900">{selectedBill.fromDate}</span></div>
                      <div><span className="font-semibold text-gray-700">To:</span> <span className="text-gray-900">{selectedBill.toDate}</span></div>
                    </div>
                  </div>
                </div>

                {/* Expenses Breakdown - Editable */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-gray-900">Expenses Breakdown</h4>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${editMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                      {editMode ? 'Cancel Edit' : 'Edit Amounts'}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {/* Travel */}
                    <div className="flex justify-between items-center border-b border-green-200 pb-1.5">
                      <span className="font-semibold text-gray-700">Travel & Ticket:</span>
                      <div className="flex items-center gap-2">
                        {editMode ? (
                          <input
                            type="number"
                            value={editedTravel}
                            onChange={(e) => setEditedTravel(e.target.value)}
                            className="w-32 px-3 py-1 border border-gray-300 rounded text-right font-semibold text-sm"
                          />
                        ) : (
                          <span className="font-bold text-green-700">₹{(selectedBill.editedTravelSubTotal || selectedBill.travelSubTotal).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Conveyance */}
                    <div className="flex justify-between items-center border-b border-green-200 pb-1.5">
                      <span className="font-semibold text-gray-700">Local Conveyance:</span>
                      <div className="flex items-center gap-2">
                        {editMode ? (
                          <input
                            type="number"
                            value={editedConveyance}
                            onChange={(e) => setEditedConveyance(e.target.value)}
                            className="w-32 px-3 py-1 border border-gray-300 rounded text-right font-semibold text-sm"
                          />
                        ) : (
                          <span className="font-bold text-green-700">₹{(selectedBill.editedConveyanceSubTotal || selectedBill.conveyanceSubTotal).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Daily Allowance - predefined from database, not editable */}
                    <div className="flex justify-between items-center border-b border-green-200 pb-1.5">
                      <span className="font-semibold text-gray-700">Daily Allowance ({selectedBill.daDays}d @ ₹{selectedBill.daRate}):</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700">₹{selectedBill.daSubTotal.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 italic">fixed</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center bg-blue-200 px-3 py-2 rounded-lg font-bold text-base">
                      <span className="text-gray-900">Total Expenses:</span>
                      <span className="text-blue-900">
                        ₹{(
                          (editMode
                            ? (parseFloat(editedTravel) || 0)
                            : (selectedBill.editedTravelSubTotal || selectedBill.travelSubTotal)) +
                          (editMode
                            ? (parseFloat(editedConveyance) || 0)
                            : (selectedBill.editedConveyanceSubTotal || selectedBill.conveyanceSubTotal)) +
                          selectedBill.daSubTotal
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents - verification */}
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Documents Uploaded (Verification)</h4>
                  <DocumentGallery
                    documents={selectedBill.documents || []}
                    onView={openDocument}
                    emptyText="No documents uploaded by the employee."
                  />
                </div>

                {/* Finance Notes */}
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-300">
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Finance Notes {selectedBill.status === 'rejected' ? '(Rejection Reason)' : ''}</label>
                  <textarea
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder={selectedBill.status === 'rejected' ? 'Why was this bill rejected?' : 'Add notes for the employee...'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-16 resize-none"
                  />
                </div>

                {/* Previous Rejection Info */}
                {selectedBill.status === 'rejected' && selectedBill.rejectionReason && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-300">
                    <h4 className="font-bold text-red-900 mb-1 text-sm">Rejection Details</h4>
                    <p className="text-sm text-red-800"><strong>Reason:</strong> {selectedBill.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  setSelectedBill(null);
                  setModalNotes('');
                  setEditMode(false);
                  setEditedTravel('');
                  setEditedConveyance('');
                  setEditedDA('');
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg text-sm"
              >
                Close
              </button>
              {editMode && (
                <button
                  onClick={handleSaveEdits}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm"
                >
                  Save Edits
                </button>
              )}
              {selectedBill.status === 'pending' && (
                <>
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
