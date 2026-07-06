import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestSummary } from '../../types/admin';

interface TestRepositoryTableProps {
  tests: TestSummary[];
}

export const TestRepositoryTable: React.FC<TestRepositoryTableProps> = ({ tests }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-border rounded-sm shadow-sm overflow-hidden">
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-[9px] font-black tracking-[0.2em] border-b border-border">
            <tr>
              <th className="px-4 lg:px-8 py-4 lg:py-5">Assessment Title</th>
              <th className="px-4 lg:px-8 py-4 lg:py-5">System Status</th>
              <th className="px-4 lg:px-8 py-4 lg:py-5">Timestamp</th>
              <th className="px-4 lg:px-8 py-4 lg:py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-50">
            {tests.map((test) => (
              <tr key={test._id} className="hover:bg-background/50 transition-colors group">
                <td className="px-4 lg:px-8 py-4 lg:py-6 font-sans text-base lg:text-lg text-foreground-bold group-hover:text-cream-700">{test.title}</td>
                <td className="px-4 lg:px-8 py-4 lg:py-6">
                  <span className="text-[9px] uppercase font-black px-3 py-1 rounded-full border border-border bg-white text-muted-foreground">
                    {test.status}
                  </span>
                </td>
                <td className="px-4 lg:px-8 py-4 lg:py-6 text-[10px] lg:text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 lg:px-8 py-4 lg:py-6 text-right">
                  <button 
                    onClick={() => navigate(`/admin/results/${test._id}`)}
                    className="text-[9px] lg:text-[10px] font-black text-foreground uppercase tracking-widest hover:underline underline-offset-4 whitespace-nowrap"
                  >
                    Access Results &rarr;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden divide-y divide-cream-100">
        {tests.map((test) => (
          <div key={test._id} className="p-5 flex flex-col gap-4">
            <div className="flex justify-between items-start gap-3">
              <h3 className="font-sans text-base text-foreground-bold">{test.title}</h3>
              <span className="text-[8px] uppercase font-black px-2 py-1 rounded-full border border-border bg-white text-muted-foreground shrink-0">
                {test.status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
              </span>
              <button 
                onClick={() => navigate(`/admin/results/${test._id}`)}
                className="text-[9px] font-black text-foreground uppercase tracking-widest flex items-center gap-1"
              >
                Results &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
