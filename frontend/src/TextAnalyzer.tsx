import React, { useState, ChangeEvent, MouseEvent } from 'react';

interface ApiResponse {
  summary: string;
}

const TextAnalyzer: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setInputText(e.target.value);
    setError('');
  };

  const handleAnalyze = async (e: MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('Iltimos, matn kiriting.');
      return;
    }
    
    setLoading(true);
    setSummary('');
    setError('');

    try {
    const response = await fetch('http://localhost:5001/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Explain how AI works' })
});


      if (!response.ok) {
        throw new Error(`API xatosi: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      if (!data.summary) {
        throw new Error('Javobda xato: summary topilmadi.');
      }

      setSummary(data.summary);
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message || 'Xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white shadow rounded">
      <h1 className="text-xl font-bold mb-4">Matn tahlili</h1>
      <textarea
        value={inputText}
        onChange={handleInputChange}
        placeholder="Matn kiriting..."
        className="w-full p-2 border rounded mb-2"
        rows={4}
        maxLength={1000}
      />
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <button
        onClick={handleAnalyze}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        disabled={loading}
      >
        {loading ? 'Yuklanmoqda...' : 'Tahlil qilish'}
      </button>
      {summary && (
        <div className="mt-4 p-3 border rounded bg-gray-100">
          <strong>Natija:</strong>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
};

export default TextAnalyzer;