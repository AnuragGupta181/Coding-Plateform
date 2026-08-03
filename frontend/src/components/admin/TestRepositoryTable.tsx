import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestSummary } from '../../types/admin';
import { SearchBar } from '../common/SearchBar';

interface TestRepositoryTableProps {
  tests: TestSummary[];
}

export const TestRepositoryTable: React.FC<TestRepositoryTableProps> = ({ tests }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

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
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:w-80"
          placeholder="Search repository by Test Name or ID..."
        />
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
                    <th className="px-4 lg:px-8 py-4 lg:py-5">Assessment Title</th>
                    <th className="px-4 lg:px-8 py-4 lg:py-5">Test ID</th>
                    <th className="px-4 lg:px-8 py-4 lg:py-5">System Status</th>
                    <th className="px-4 lg:px-8 py-4 lg:py-5">Timestamp</th>
                    <th className="px-4 lg:px-8 py-4 lg:py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTests.map((test) => (
                    <tr key={test._id} className="hover:bg-muted/30 transition-colors group">
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
                        <button
                          onClick={() => navigate(`/admin/results/${test._id}`)}
                          className="group text-[9px] lg:text-[10px] font-black text-foreground uppercase tracking-widest whitespace-nowrap flex items-center justify-end gap-2 ml-auto hover:text-primary transition-colors"
                        >
                          <span>Access Results</span>
                          <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-border">
              {filteredTests.map((test) => (
                <div key={test._id} className="p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-sans text-base text-foreground-bold">{test.title}</h3>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">ID: {test._id}</div>
                    </div>
                    <span className="text-[8px] uppercase font-black px-2 py-1 rounded-full border border-border bg-background text-muted-foreground shrink-0">
                      {test.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                    <button
                      onClick={() => navigate(`/admin/results/${test._id}`)}
                      className="group text-[9px] font-black text-foreground uppercase tracking-widest flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <span>Results</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </button>
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
