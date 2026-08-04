import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestSummary } from '../../types/admin';
import { SearchBar } from '../common/SearchBar';
import testService from '../../utils/apiService';
import toast from 'react-hot-toast';

interface TestRepositoryTableProps {
  tests: TestSummary[];
  onRefresh?: () => void;
}

export const TestRepositoryTable: React.FC<TestRepositoryTableProps> = ({ tests, onRefresh }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleDelete = async (testId: string, testStatus: string) => {
    if (testStatus === 'active') {
      toast.error('Cannot delete an active test.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this test and all its submissions? This action cannot be undone.')) return;
    
    setDeletingId(testId);
    try {
      await testService.deleteTest(testId);
      toast.success('Test deleted successfully!');
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete test');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTests.length && filteredTests.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTests.map(t => t._id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected test(s)? This action cannot be undone.`)) return;

    setIsBulkDeleting(true);
    try {
      await testService.bulkDeleteTests(Array.from(selectedIds));
      toast.success('Selected tests deleted successfully!');
      setSelectedIds(new Set());
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete tests');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const filteredTests = tests.filter((test) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const titleMatch = test.title?.toLowerCase().includes(q);
    const idMatch = test._id?.toLowerCase().includes(q);
    return titleMatch || idMatch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full sm:w-80"
            placeholder="Search repository by Test Name or ID..."
          />
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 px-3 py-2 rounded-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              {isBulkDeleting ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Delete Selected ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Showing {filteredTests.length} of {tests.length} tests
        </div>
      </div>

      <div className="bg-background border border-border rounded-sm shadow-sm overflow-hidden">
        {filteredTests.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-light italic">
            No assessments match your search query.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[9px] font-black tracking-[0.2em] border-b border-border">
                  <tr>
                    <th className="px-4 py-4 lg:py-5 w-12">
                      <input 
                        type="checkbox"
                        className="cursor-pointer w-4 h-4 rounded border-border bg-background checked:bg-primary accent-primary"
                        checked={selectedIds.size === filteredTests.length && filteredTests.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 lg:px-8 py-4 lg:py-5">Assessment Title</th>
                    <th className="px-4 lg:px-8 py-4 lg:py-5">Test ID</th>
                    <th className="px-4 lg:px-8 py-4 lg:py-5">System Status</th>
                    <th className="px-4 lg:px-8 py-4 lg:py-5">Timestamp</th>
                    <th className="px-4 lg:px-8 py-4 lg:py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTests.map((test) => (
                    <tr 
                      key={test._id} 
                      className={`transition-colors group ${selectedIds.has(test._id) ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    >
                      <td className="px-4 py-4 lg:py-6">
                        <input 
                          type="checkbox"
                          className="cursor-pointer w-4 h-4 rounded border-border bg-background checked:bg-primary accent-primary"
                          checked={selectedIds.has(test._id)}
                          onChange={() => toggleSelect(test._id)}
                        />
                      </td>
                      <td className="px-4 lg:px-8 py-4 lg:py-6 font-sans text-base lg:text-lg text-foreground-bold group-hover:text-primary transition-colors">
                        {test.title}
                      </td>
                      <td className="px-4 lg:px-8 py-4 lg:py-6 font-mono text-xs text-muted-foreground">
                        {test._id}
                      </td>
                      <td className="px-4 lg:px-8 py-4 lg:py-6">
                        <span className="text-[9px] uppercase font-black px-3 py-1 rounded-full border border-border bg-background text-muted-foreground">
                          {test.status}
                        </span>
                      </td>
                      <td className="px-4 lg:px-8 py-4 lg:py-6 text-[10px] lg:text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 lg:px-8 py-4 lg:py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => navigate(`/admin/results/${test._id}`)}
                            className="group/btn text-[9px] lg:text-[10px] font-black text-foreground uppercase tracking-widest whitespace-nowrap flex items-center gap-2 hover:text-primary transition-colors"
                          >
                            <span>Access Results</span>
                            <span className="group-hover/btn:translate-x-1 transition-transform">&rarr;</span>
                          </button>
                          <button
                            onClick={() => handleDelete(test._id, test.status)}
                            disabled={deletingId === test._id || test.status === 'active'}
                            className={`text-[10px] font-bold p-1.5 rounded transition-all ${
                              test.status === 'active' 
                                ? 'text-muted-foreground opacity-50 cursor-not-allowed' 
                                : 'text-red-500 hover:bg-red-500/10'
                            }`}
                            title={test.status === 'active' ? "Cannot delete active tests" : "Delete test"}
                          >
                            {deletingId === test._id ? (
                              <span className="inline-block w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-border">
              {filteredTests.length > 0 && (
                <div className="p-4 bg-muted/20 border-b border-border flex items-center gap-3">
                  <input 
                    type="checkbox"
                    className="cursor-pointer w-4 h-4 rounded border-border bg-background checked:bg-primary accent-primary"
                    checked={selectedIds.size === filteredTests.length && filteredTests.length > 0}
                    onChange={toggleSelectAll}
                  />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select All</span>
                </div>
              )}
              {filteredTests.map((test) => (
                <div key={test._id} className={`p-5 flex flex-col gap-4 transition-colors ${selectedIds.has(test._id) ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox"
                      className="cursor-pointer w-4 h-4 rounded border-border bg-background checked:bg-primary accent-primary mt-1 shrink-0"
                      checked={selectedIds.has(test._id)}
                      onChange={() => toggleSelect(test._id)}
                    />
                    <div className="flex-1 flex justify-between items-start gap-3">
                      <div>
                        <h3 className="font-sans text-base text-foreground-bold">{test.title}</h3>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">ID: {test._id}</div>
                      </div>
                      <span className="text-[8px] uppercase font-black px-2 py-1 rounded-full border border-border bg-background text-muted-foreground shrink-0">
                        {test.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pl-7">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDelete(test._id, test.status)}
                        disabled={deletingId === test._id || test.status === 'active'}
                        className={`text-[9px] font-bold p-1 rounded transition-all ${
                          test.status === 'active' 
                            ? 'text-muted-foreground opacity-50 cursor-not-allowed' 
                            : 'text-red-500 hover:bg-red-500/10'
                        }`}
                      >
                        {deletingId === test._id ? 'DELETING...' : 'DELETE'}
                      </button>
                      <button
                        onClick={() => navigate(`/admin/results/${test._id}`)}
                        className="group/btn text-[9px] font-black text-foreground uppercase tracking-widest flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <span>Results</span>
                        <span className="group-hover/btn:translate-x-1 transition-transform">&rarr;</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
