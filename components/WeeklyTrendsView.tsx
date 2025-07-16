import React, { useState, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { Bot, Newspaper } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const WeeklyTrendsView: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [digestContent, setDigestContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>('');

  const handleGenerateDigest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDigestContent('');

    const stages = [
      "Fetching latest news...",
      "Analyzing scientific data...",
      "Gathering cultivator insights...",
      "Reviewing policy updates...",
      "Compiling final report...",
    ];

    let stageIndex = 0;
    const stageInterval = setInterval(() => {
      setLoadingStage(stages[stageIndex]);
      stageIndex = (stageIndex + 1) % stages.length;
    }, 3000);

    try {
      const response = await fetch('/api/generate-digest-now');
      if (!response.ok) {
        throw new Error('Failed to fetch digest from server.');
      }
      const data = await response.json();
      setDigestContent(data.digest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
      clearInterval(stageInterval);
      setLoadingStage('');
    }
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 mb-6 border-b border-slate-800 pb-4">
          <Newspaper className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold">Weekly Trends Digest</h1>
            <p className="text-slate-400">An on-demand intelligence briefing from our AI analyst roundtable.</p>
          </div>
        </div>

        {!digestContent && !isLoading && (
          <div className="text-center p-8 bg-slate-900 rounded-lg border border-dashed border-slate-700">
            <Bot className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Generate Your Digest</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Click the button to have our specialist AIs analyze the latest hemp and cannabis news from India and compile a unique report for you.
            </p>
            <button
              onClick={handleGenerateDigest}
              disabled={isLoading}
              className="px-6 py-3 font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              Generate Weekly Digest
            </button>
          </div>
        )}

        {isLoading && (
          <div className="text-center p-8">
            <LoadingSpinner size="w-12 h-12" color="text-emerald-500" />
            <p className="mt-4 text-lg font-semibold animate-pulse">{loadingStage}</p>
            <p className="text-slate-400">This may take up to 30 seconds...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
            <p className="font-semibold">An Error Occurred</p>
            <p>{error}</p>
          </div>
        )}

        {digestContent && (
          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{digestContent}</ReactMarkdown>
            <button
              onClick={() => setDigestContent('')}
              className="mt-8 px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
            >
              Generate New Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyTrendsView;
