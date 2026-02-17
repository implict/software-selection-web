import { useState, useEffect, useMemo } from 'react'
import softwareList from './data/software_list.json'
import { submitVote, fetchVotes as fetchVotesFromDB } from './lib/supabase'
import { downloadChecklist } from './lib/checklist'

function App() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [teacherName, setTeacherName] = useState('');
  const [subject, setSubject] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [view, setView] = useState('selection'); // 'selection' | 'results'
  const [votes, setVotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Middle School Subjects
  const subjects = [
    "국어", "도덕", "사회", "역사", "수학", "과학", "기술·가정", "체육", "음악", "미술", "영어",
    "정보", "진로와 직업", "한문", "일본어", "특수", "보건", "사서", "상담", "기타"
  ];

  // Categories
  const categories = [...new Set(softwareList.map(s => s.category))];

  // Category State
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [showSidebar, setShowSidebar] = useState(false);

  // Prevent scrolling when sidebar is open
  useEffect(() => {
    if (showSidebar) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSidebar]);

  // Fetch votes when switching to results view
  useEffect(() => {
    if (view === 'results') {
      fetchVotesFromDB()
        .then(data => setVotes(data))
        .catch(err => console.error("Error fetching votes:", err));
    }
  }, [view]);

  // Calculate counts
  const categoryCounts = {
    '전체': softwareList.length,
  };
  categories.forEach(cat => {
    categoryCounts[cat] = softwareList.filter(s => s.category === cat).length;
  });

  // Filter software list based on search and category
  const filteredSoftwareList = softwareList.filter(sw => {
    const matchesSearch = sw.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sw.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || sw.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!teacherName.trim()) {
      alert("성함을 입력해주세요.");
      return;
    }
    if (!subject) {
      alert("담당 교과를 선택해주세요.");
      return;
    }
    if (selectedIds.length === 0) {
      if (!confirm("선택된 소프트웨어가 없습니다. 제출하시겠습니까?")) return;
    }

    try {
      await submitVote(teacherName, subject, selectedIds);
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting:", err);
      alert("제출 중 오류가 발생했습니다.");
    }
  };

  // Calculate results data only when needed
  const resultStats = useMemo(() => {
    const stats = {};
    softwareList.forEach(s => {
      if (s && s.id) {
        stats[s.id] = { count: 0, subjects: new Set() };
      }
    });

    if (Array.isArray(votes)) {
      votes.forEach(vote => {
        if (Array.isArray(vote.selectedIds)) {
          vote.selectedIds.forEach(id => {
            if (stats[id]) {
              stats[id].count++;
              if (vote.subject) stats[id].subjects.add(vote.subject);
            }
          });
        }
      });
    }
    return stats;
  }, [votes]);

  const sortedResultList = useMemo(() => {
    return softwareList
      .filter(sw => sw && sw.id && resultStats[sw.id] && resultStats[sw.id].count > 0)
      .sort((a, b) => {
        const countA = resultStats[a.id]?.count || 0;
        const countB = resultStats[b.id]?.count || 0;
        return countB - countA;
      });
  }, [resultStats]);

  const handleDownloadChecklist = async () => {
    try {
      setDownloading(true);
      const meta = sortedResultList.map(sw => ({
        name: sw.name,
        provider: sw.provider,
        category: sw.category
      }));
      const result = await downloadChecklist(meta);
      console.log(`Checklist downloaded: ${result.total} items (${result.matched} matched, ${result.added} added)`);
    } catch (err) {
      alert('다운로드 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const renderFooter = () => (
    <div className="fixed right-3 top-1/2 z-50" style={{ transform: 'rotate(90deg) translateX(-50%)', transformOrigin: 'right center' }}>
      <span className="text-[10px] text-gray-300 whitespace-nowrap pr-6">© 2026 FLOWKIT </span>
    </div>
  );

  const renderTabs = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg inline-flex">
      <button
        onClick={() => setView('selection')}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view !== 'results'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
          }`}
      >
        신청 접수
      </button>
      <button
        onClick={() => setView('results')}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'results'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
          }`}
      >
        현황 조회
      </button>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-10 rounded-lg shadow-sm max-w-sm w-full text-center border border-gray-200">
          <div className="w-16 h-16 bg-gray-900 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">제출 완료</h2>
          <p className="text-gray-500 mb-8">선생님의 제출 목록이 반영되었습니다.</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setView('results'); setSubmitted(false); }}
              className="w-full py-3.5 bg-gray-900 text-white rounded-full font-bold hover:bg-gray-800 transition shadow-md text-sm"
            >
              현황 조회
            </button>
          </div>
        </div>
        {renderFooter()}
      </div>
    );
  }

  if (view === 'results') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="p-8 pb-0 flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">양동중학교 학습지원 소프트웨어</h1>
              <p className="text-gray-500 text-sm">현재까지 집계된 소프트웨어 신청 현황입니다. (총 참여: {votes.length}명)</p>
            </div>
            {renderTabs()}
          </div>

          <div className="p-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 text-center">No.</th>
                    <th className="py-4 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Software</th>
                    <th className="py-4 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Provider</th>
                    <th className="py-4 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="py-4 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subjects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedResultList.map((sw, index) => {
                    const count = resultStats[sw.id].count;
                    const subjectList = Array.from(resultStats[sw.id].subjects).sort().join(', ');

                    return (
                      <tr key={sw.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="py-4 px-2 text-center text-sm font-bold text-gray-400 group-hover:text-gray-900">{index + 1}</td>
                        <td className="py-4 px-2">
                          <span className="font-semibold text-gray-900 text-sm">{sw.name}</span>
                        </td>
                        <td className="py-4 px-2 text-sm text-gray-500">{sw.provider}</td>
                        <td className="py-4 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {sw.category}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-sm text-gray-900">
                          {count > 0 ? (
                            <div className="leading-relaxed text-gray-700">{subjectList}</div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Download Button */}
          <div className="flex justify-center py-8">
            <button
              onClick={handleDownloadChecklist}
              disabled={downloading || sortedResultList.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed w-52"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  생성 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  체크리스트 다운로드
                </>
              )}
            </button>
          </div>
        </div>
        {renderFooter()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="p-8 pb-0 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">양동중학교 학습지원 소프트웨어</h1>
            <p className="text-gray-500 text-sm">교과 수업에 사용을 원하는 소프트웨어를 선택 후 '확인'을 눌러주세요.</p>
          </div>
          {renderTabs()}
        </div>

        <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Teacher Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full p-2 border-b border-gray-200 focus:border-gray-900 focus:outline-none transition-colors bg-transparent placeholder-gray-300"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2 border-b border-gray-200 focus:border-gray-900 focus:outline-none bg-transparent"
            >
              <option value="">Select Subject</option>
              {subjects.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-8">
          <div className="flex flex-col gap-6 mb-8">

            {/* Category Filters - Modern Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-1">
              {['전체', ...categories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    px-4 py-2 text-sm font-medium transition-colors relative
                    ${selectedCategory === cat
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-900'}
                  `}
                >
                  {cat}
                  <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${selectedCategory === cat ? 'bg-gray-100 text-gray-900' : 'bg-gray-50 text-gray-400'}`}>
                    {categoryCounts[cat]}
                  </span>
                  {selectedCategory === cat && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-lg font-bold text-gray-900 tracking-tight">
                  {selectedCategory === '전체' ? 'All Software' : selectedCategory}
                </span>
                <span className="ml-3 text-sm text-gray-400 font-normal border-l border-gray-200 pl-3 mr-2 w-24 inline-block">
                  {selectedIds.length} selected
                </span>
                <a
                  href="https://edzip.kr/utilization/learning-sw/notice/697c5ea94d811c18858caa1b"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap hover:bg-blue-200 transition-colors"
                >
                  에듀집 등록 SW (2026.2.13.)
                </a>
              </div>

              <div className="w-full md:w-1/3 relative group">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search software..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-lg focus:outline-none transition-all text-sm group-hover:bg-white group-hover:border-gray-200"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 group-focus-within:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            {(selectedCategory === '전체' ? categories : [selectedCategory]).map(cat => {
              const items = filteredSoftwareList.filter(s => s.category === cat);
              if (items.length === 0) return null;

              return (
                <div key={cat}>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{cat}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(sw => (
                      <div
                        key={sw.id}
                        onMouseMove={(e) => {
                          const tooltip = e.currentTarget.querySelector('.custom-tooltip');
                          if (tooltip) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left - 4; // 4px left
                            const y = e.clientY - rect.top + 4;  // 4px below
                            tooltip.style.transform = `translate(${x}px, ${y}px)`;
                          }
                        }}
                        onClick={() => toggleSelection(sw.id)}
                        className={`
                          cursor-pointer p-4 rounded-xl border transition-all duration-200 flex items-start group relative
                          ${selectedIds.includes(sw.id)
                            ? 'border-gray-900 ring-1 ring-gray-900 bg-white'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'}
                        `}
                      >
                        {/* Custom Tooltip */}
                        <div
                          className="custom-tooltip absolute left-0 top-0 px-2 py-1 bg-gray-50 border border-gray-600 text-gray-800 text-[11px] rounded shadow-sm opacity-0 group-hover:opacity-100 z-50 pointer-events-none whitespace-nowrap"
                          style={{ willChange: 'transform' }}
                        >
                          {sw.name}
                        </div>
                        {/* Logo Placeholder */}
                        <div className={`
                          w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-lg font-bold border mr-4
                          ${selectedIds.includes(sw.id)
                            ? 'bg-gray-900 text-white border-transparent'
                            : 'bg-gray-50 text-gray-400 border-gray-100'}
                        `}>
                          {sw.name.charAt(0)}
                        </div>

                        <div className="flex-1 min-w-0 py-0.5">
                          <h4 className={`font-semibold text-sm truncate pr-6 ${selectedIds.includes(sw.id) ? 'text-gray-900' : 'text-gray-700'}`}>
                            {sw.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 truncate">{sw.provider}</p>
                        </div>

                        {/* Checkbox circle design */}
                        {selectedIds.includes(sw.id) && (
                          <div className="absolute top-4 right-4 text-gray-900">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" fillRule="evenodd"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Floating Submit Button (opens sidebar) */}
      <button
        onClick={() => setShowSidebar(true)}
        className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-full shadow-xl hover:bg-gray-800 transition transform hover:scale-105 z-20 flex items-center font-bold text-lg group"
        title="조회 및 제출"
      >
        <span className="mr-2">확인</span>
        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <span className="absolute -top-3 -right-1 bg-red-500 text-white text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full shadow-md border-1 border-white">
          {selectedIds.length}
        </span>
      </button>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-30 transition-opacity duration-300" onClick={() => setShowSidebar(false)}></div>
      )}

      {/* Sidebar Content */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 pt-10 pb-4 border-b border-gray-100 flex justify-between items-center bg-white">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Selected Software</h2>
            <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedIds.length === 0 ? (
              <p className="text-gray-500 text-center mt-10">아직 선택된 항목이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {selectedIds.map(id => {
                  const sw = softwareList.find(s => s.id === id);
                  if (!sw) return null;
                  return (
                    <li key={id} className="py-4 px-6 flex items-center group hover:bg-gray-100 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{sw.name}</h4>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{sw.provider}</p>
                      </div>

                      <button
                        onClick={() => toggleSelection(id)}
                        className="text-gray-400 hover:text-red-500 p-2 rounded-md hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
                        title="제거"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-white">
            <div className="flex gap-3">
              <button
                onClick={() => setShowSidebar(false)}
                className="flex-1 py-3 border border-gray-200 rounded-full text-gray-700 font-bold hover:bg-gray-50 transition text-sm"
              >
                다시 선택
              </button>
              <button
                onClick={() => { setShowSidebar(false); handleSubmit(); }}
                className="flex-1 py-3 bg-gray-900 text-white rounded-full font-bold hover:bg-gray-800 transition shadow-md text-sm"
              >
                제출하기 <span className="text-gray-400 font-normal ml-1">({selectedIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {renderFooter()}
    </div>
  )
}

export default App
