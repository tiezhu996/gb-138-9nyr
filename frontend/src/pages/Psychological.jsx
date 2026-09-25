import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { meditationAudios, selfAssessmentQuestions, hotlines } from '../data/psychological';
import { fetchAssessments, submitAssessment } from '../api/assessments';

const STORAGE_KEY = 'assessmentPersonName';

const getSavedName = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const LEVEL_STYLES = {
  green: { emoji: '😊', badge: 'bg-green-100 text-green-700', score: 'text-green-600', circle: 'from-green-100 to-emerald-100' },
  yellow: { emoji: '😐', badge: 'bg-yellow-100 text-yellow-700', score: 'text-yellow-600', circle: 'from-yellow-100 to-amber-100' },
  orange: { emoji: '😟', badge: 'bg-orange-100 text-orange-700', score: 'text-orange-600', circle: 'from-orange-100 to-red-100' },
  red: { emoji: '😢', badge: 'bg-red-100 text-red-700', score: 'text-red-600', circle: 'from-red-100 to-rose-100' },
};

const styleOf = (color) => LEVEL_STYLES[color] || LEVEL_STYLES.green;

const formatDateCN = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${year}年${month}月${day}日`;
};

const formatTime = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false });
};

// 分数越高压力越大：升分提示关注，降分表示好转。
const DeltaText = ({ delta, className = '' }) => {
  if (delta > 0) return <span className={`text-orange-600 ${className}`}>↑ 上升 {delta} 分</span>;
  if (delta < 0) return <span className={`text-green-600 ${className}`}>↓ 下降 {-delta} 分</span>;
  return <span className={`text-warm-500 ${className}`}>→ 持平</span>;
};

const Psychological = () => {
  const [activeTab, setActiveTab] = useState('meditation');
  const [selectedMeditation, setSelectedMeditation] = useState(null);

  // 自测档案：name → home（档案）→ quiz（作答）→ result（结果）
  // 打开页面时，如果之前填过名字，直接落在档案页并显示上次的总分。
  const [savedName] = useState(getSavedName);
  const [phase, setPhase] = useState(savedName ? 'home' : 'name');
  const [nameInput, setNameInput] = useState(savedName);
  const [personName, setPersonName] = useState(savedName);
  const [records, setRecords] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(Boolean(savedName));
  const [archiveError, setArchiveError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);

  const tabs = [
    { id: 'meditation', label: '冥想音频', icon: '🧘' },
    { id: 'assessment', label: '自测量表', icon: '📝' },
    { id: 'hotlines', label: '援助热线', icon: '📞' }
  ];

  const totalQuestions = selfAssessmentQuestions.length;
  const answeredCount = selfAssessmentQuestions.filter((_, index) => answers[index] !== undefined).length;
  const allAnswered = answeredCount === totalQuestions;

  const loadArchive = useCallback(async (name) => {
    setArchiveLoading(true);
    setArchiveError('');
    try {
      const data = await fetchAssessments(name);
      setRecords(data.records);
    } catch (err) {
      setRecords([]);
      setArchiveError(err.message);
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  const confirmName = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPersonName(trimmed);
    localStorage.setItem(STORAGE_KEY, trimmed);
    setPhase('home');
    loadArchive(trimmed);
  }, [loadArchive]);

  // 首次打开时，为记住的填写人加载档案（此时 archiveLoading 初始为 true）。
  useEffect(() => {
    if (!savedName) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAssessments(savedName);
        if (!cancelled) setRecords(data.records);
      } catch (err) {
        if (!cancelled) {
          setRecords([]);
          setArchiveError(err.message);
        }
      } finally {
        if (!cancelled) setArchiveLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [savedName]);

  const startQuiz = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setSubmitError('');
    setResult(null);
    setPhase('quiz');
  };

  const handleAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: value }));
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const ordered = selfAssessmentQuestions.map((_, index) => answers[index]);
      const data = await submitAssessment(personName, ordered);
      setResult(data);
      setPhase('result');
      loadArchive(personName);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const changePerson = () => {
    setPhase('name');
    setRecords([]);
    setResult(null);
    setExpandedId(null);
    setArchiveError('');
  };

  const latest = records[0] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-200/30 rounded-full blur-3xl" />
      </div>

      <header className="relative bg-white/70 backdrop-blur-md shadow-sm sticky top-0 z-20 border-b border-white/50">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2.5 hover:bg-warm-100 rounded-full transition-colors group"
            >
              <svg className="w-6 h-6 text-warm-600 group-hover:text-violet-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-warm-800">心理支持</h1>
              <p className="text-xs text-warm-500">关注心灵健康，温暖相伴</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-sm text-violet-600 font-medium mb-6 shadow-sm border border-violet-100">
            <span>💚</span>
            <span>理解 · 接纳 · 支持</span>
          </div>
          <h2 className="text-4xl font-bold text-warm-900 mb-4">
            心理健康支持
          </h2>
          <p className="text-lg text-warm-600 max-w-2xl mx-auto leading-relaxed">
            关注心理健康，学会自我调节。在这里，您可以找到冥想引导、心理自测和援助热线，
            帮助您和家人度过困难时刻。
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white/80 backdrop-blur-sm rounded-2xl p-1.5 shadow-lg border border-white/60">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
                    : 'text-warm-600 hover:bg-violet-50'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {activeTab === 'meditation' && (
            <div>
              {!selectedMeditation ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {meditationAudios.map((audio) => (
                    <button
                      key={audio.id}
                      onClick={() => setSelectedMeditation(audio)}
                      className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/60 text-left overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br from-violet-400 to-purple-500" />
                      </div>
                      <div className="relative flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                          {audio.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-warm-800 mb-2 group-hover:text-violet-600 transition-colors">
                            {audio.title}
                          </h3>
                          <p className="text-sm text-violet-500 font-semibold mb-2">
                            ⏱️ {audio.duration}
                          </p>
                          <p className="text-sm text-warm-500 leading-relaxed">
                            {audio.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-white/60 overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 opacity-10">
                    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-violet-400 to-purple-500" />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setSelectedMeditation(null)}
                      className="flex items-center gap-2 text-violet-600 hover:text-violet-700 mb-8 transition-colors font-semibold"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                      返回冥想列表
                    </button>

                    <div className="text-center mb-10">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-6xl shadow-2xl mx-auto mb-6">
                        {selectedMeditation.icon}
                      </div>
                      <h3 className="text-3xl font-bold text-warm-800 mb-3">
                        {selectedMeditation.title}
                      </h3>
                      <p className="text-warm-500 text-lg">
                        {selectedMeditation.description} · ⏱️ {selectedMeditation.duration}
                      </p>
                    </div>

                    <div className="bg-violet-50 rounded-2xl p-8 mb-8">
                      <h4 className="font-bold text-violet-800 mb-6 text-xl">冥想步骤：</h4>
                      <ol className="space-y-4">
                        {selectedMeditation.steps.map((step, index) => (
                          <li key={index} className="flex items-start gap-4">
                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">
                              {index + 1}
                            </span>
                            <span className="text-violet-700 pt-1 text-lg leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-warm-100 rounded-full px-8 py-4 flex items-center gap-6 border border-warm-200">
                        <button className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white flex items-center justify-center hover:shadow-xl transition-all duration-300 hover:scale-105 shadow-lg">
                          <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                        <div className="text-warm-600 font-medium">
                          点击开始播放引导音频
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assessment' && (
            <div>
              {phase === 'name' && (
                <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-10 text-center border border-white/60 overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 opacity-10">
                    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500" />
                  </div>
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-5xl shadow-2xl mx-auto mb-8">
                      📝
                    </div>
                    <h3 className="text-3xl font-bold text-warm-800 mb-4">
                      心理压力自测
                    </h3>
                    <p className="text-warm-600 mb-6 max-w-lg mx-auto text-lg leading-relaxed">
                      本测验包含8个问题，大约需要5分钟完成。请先写下填写人的名字，
                      提交后由服务端算分并保存到档案，下次打开就能看到上次的总分和历史变化。
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 max-w-lg mx-auto">
                      <p className="text-amber-700">
                        ⚠️ 本自测仅供参考，不能替代专业诊断。如有需要，请寻求专业心理咨询师的帮助。
                      </p>
                    </div>
                    <form
                      className="max-w-md mx-auto"
                      onSubmit={(event) => {
                        event.preventDefault();
                        confirmName(nameInput);
                      }}
                    >
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(event) => setNameInput(event.target.value)}
                        placeholder="请写下填写人的名字"
                        maxLength={50}
                        className="w-full px-6 py-4 rounded-2xl border-2 border-warm-200 focus:border-violet-400 focus:outline-none text-lg text-warm-800 placeholder-warm-400 bg-white mb-4"
                      />
                      <button
                        type="submit"
                        disabled={!nameInput.trim()}
                        className="w-full px-10 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-bold text-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 shadow-lg disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                      >
                        确认，查看我的档案
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {phase === 'home' && (
                <div className="space-y-6">
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/60 overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 opacity-10">
                      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500" />
                    </div>
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-warm-800">
                          👋 {personName}，欢迎回来
                        </h3>
                        <p className="text-warm-500 mt-1">自测档案保存在服务器上，随时可以回来翻看。</p>
                      </div>
                      <button
                        onClick={changePerson}
                        className="px-5 py-2.5 bg-warm-100 text-warm-600 rounded-full font-medium hover:bg-warm-200 transition-colors"
                      >
                        更换填写人
                      </button>
                    </div>
                  </div>

                  {archiveLoading ? (
                    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-12 border border-white/60 text-center text-warm-500 text-lg">
                      正在读取档案…
                    </div>
                  ) : archiveError ? (
                    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-white/60 text-center">
                      <p className="text-red-600 text-lg mb-6">😥 {archiveError}</p>
                      <button
                        onClick={() => loadArchive(personName)}
                        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-semibold hover:shadow-lg transition-all"
                      >
                        重新加载
                      </button>
                    </div>
                  ) : (
                    <>
                      {latest ? (
                        <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/60 overflow-hidden">
                          <div className="relative flex flex-wrap items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${styleOf(latest.color).circle} flex items-center justify-center text-4xl shadow-lg`}>
                                {styleOf(latest.color).emoji}
                              </div>
                              <div>
                                <p className="text-warm-500 font-medium">上次总分（{formatDateCN(latest.date)}）</p>
                                <p className={`text-4xl font-bold ${styleOf(latest.color).score}`}>
                                  {latest.totalScore} <span className="text-lg text-warm-400 font-medium">/ 24</span>
                                </p>
                              </div>
                            </div>
                            <span className={`px-4 py-2 rounded-full font-semibold ${styleOf(latest.color).badge}`}>
                              {latest.level}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-white/60 text-center">
                          <p className="text-warm-600 text-lg">
                            还没有自测记录。完成第一次测试后，总分和建议会保存在这里。
                          </p>
                        </div>
                      )}

                      <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/60 overflow-hidden text-center">
                        <p className="text-warm-600 mb-6 leading-relaxed">
                          本测验包含8个问题，大约需要5分钟。请根据最近一周的实际情况作答，
                          提交后由服务端算分并存入档案；同一天重复提交时，以最后一次为准。
                        </p>
                        <button
                          onClick={startQuiz}
                          className="px-10 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-bold text-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 shadow-lg"
                        >
                          {latest ? '开始新的测试' : '开始测试'}
                        </button>
                      </div>

                      {records.length > 0 && (
                        <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/60 overflow-hidden">
                          <h4 className="text-xl font-bold text-warm-800 mb-5">
                            📂 历史档案（共 {records.length} 条）
                          </h4>
                          <div className="space-y-3">
                            {records.map((record, index) => {
                              const earlier = records[index + 1] || null;
                              const delta = earlier ? record.totalScore - earlier.totalScore : null;
                              const expanded = expandedId === record.id;
                              return (
                                <div key={record.id} className="border border-warm-100 rounded-2xl overflow-hidden">
                                  <button
                                    onClick={() => setExpandedId(expanded ? null : record.id)}
                                    className="w-full flex flex-wrap items-center justify-between gap-3 p-5 bg-warm-50 hover:bg-violet-50 transition-colors text-left"
                                  >
                                    <div className="flex items-center gap-4">
                                      <span className="text-2xl">{styleOf(record.color).emoji}</span>
                                      <div>
                                        <p className="font-semibold text-warm-800">{formatDateCN(record.date)}</p>
                                        <p className="text-sm text-warm-500">{record.level}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      {delta !== null && (
                                        <span className="text-sm font-medium">
                                          <DeltaText delta={delta} />
                                        </span>
                                      )}
                                      <span className={`text-xl font-bold ${styleOf(record.color).score}`}>
                                        {record.totalScore} 分
                                      </span>
                                      <svg
                                        className={`w-5 h-5 text-warm-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </button>
                                  {expanded && (
                                    <div className="p-6 bg-white border-t border-warm-100">
                                      {earlier ? (
                                        <p className="text-warm-600 mb-4">
                                          与更早一条（{formatDateCN(earlier.date)}，{earlier.totalScore} 分）相比：
                                          <DeltaText delta={delta} className="font-semibold" />
                                        </p>
                                      ) : (
                                        <p className="text-warm-500 mb-4">这是档案里最早的一条记录。</p>
                                      )}
                                      <p className="text-warm-700 mb-4 leading-relaxed">{record.description}</p>
                                      <h5 className="font-bold text-warm-800 mb-3">💡 当时的建议：</h5>
                                      <ul className="space-y-2 mb-4">
                                        {record.suggestions.map((suggestion, suggestionIndex) => (
                                          <li key={suggestionIndex} className="flex items-start gap-3 text-warm-600">
                                            <span className="text-violet-500 mt-1">•</span>
                                            <span>{suggestion}</span>
                                          </li>
                                        ))}
                                      </ul>
                                      <p className="text-sm text-warm-400">提交时间：{formatTime(record.updatedAt)}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {phase === 'quiz' && (
                <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-white/60 overflow-hidden">
                  <div className="relative">
                    <div className="mb-8">
                      <div className="flex justify-between text-warm-500 mb-3 font-medium">
                        <span>问题 {currentQuestion + 1} / {totalQuestions}</span>
                        <span>已答 {answeredCount} / {totalQuestions}</span>
                      </div>
                      <div className="w-full bg-warm-100 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                        />
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-warm-800 mb-8 leading-relaxed">
                      {selfAssessmentQuestions[currentQuestion].question}
                    </h3>

                    <div className="space-y-4 mb-8">
                      {selfAssessmentQuestions[currentQuestion].options.map((option, index) => {
                        const selected = answers[currentQuestion] === option.value;
                        return (
                          <button
                            key={index}
                            onClick={() => handleAnswer(option.value)}
                            className={`w-full p-5 text-left rounded-2xl transition-all duration-300 border-2 group ${
                              selected
                                ? 'bg-violet-50 border-violet-400 shadow-lg'
                                : 'bg-warm-50 border-transparent hover:bg-violet-50 hover:border-violet-300 hover:shadow-lg'
                            }`}
                          >
                            <span className={`text-lg transition-colors ${selected ? 'text-violet-700 font-semibold' : 'text-warm-700 group-hover:text-violet-700'}`}>
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {submitError && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
                        <p className="text-red-700">😥 提交失败：{submitError}。您的作答还在，请重试。</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <button
                        onClick={() => setCurrentQuestion(currentQuestion - 1)}
                        disabled={currentQuestion === 0}
                        className="px-6 py-3 bg-warm-100 text-warm-700 rounded-full font-semibold hover:bg-warm-200 transition-colors disabled:opacity-40"
                      >
                        上一题
                      </button>
                      <div className="flex items-center gap-4">
                        {!allAnswered && (
                          <span className="text-warm-500">还有 {totalQuestions - answeredCount} 题未作答</span>
                        )}
                        <button
                          onClick={handleSubmit}
                          disabled={!allAnswered || submitting}
                          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-bold hover:shadow-xl transition-all duration-300 shadow-lg disabled:opacity-40 disabled:hover:shadow-lg"
                        >
                          {submitting ? '提交中…' : '提交并查看结果'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {phase === 'result' && result && (
                <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-white/60 overflow-hidden">
                  <div className="relative">
                    <div className="text-center mb-10">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-2xl mx-auto mb-6 bg-gradient-to-br ${styleOf(result.record.color).circle}`}>
                        {styleOf(result.record.color).emoji}
                      </div>
                      <h3 className="text-3xl font-bold text-warm-800 mb-3">
                        测试结果
                      </h3>
                      <p className={`text-4xl font-bold mb-4 ${styleOf(result.record.color).score}`}>
                        {result.record.level}
                      </p>
                      <p className="text-warm-500 text-lg">
                        得分：{result.record.totalScore} / 24
                      </p>
                      {result.replaced && (
                        <p className="text-warm-500 mt-2">
                          🔄 今天已提交过，档案已更新为本次结果。
                        </p>
                      )}
                    </div>

                    <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 mb-8">
                      {result.previous ? (
                        <p className="text-violet-800 text-lg">
                          与上次（{formatDateCN(result.previous.date)}，{result.previous.totalScore} 分）相比：
                          <DeltaText delta={result.delta} className="font-bold" />
                          {result.delta > 0 && '，压力有所增加，请多关照自己'}
                          {result.delta < 0 && '，状态有所好转，继续保持'}
                        </p>
                      ) : (
                        <p className="text-violet-800 text-lg">
                          🌱 这是您的第一条档案记录，下次测试后就能看到变化趋势了。
                        </p>
                      )}
                    </div>

                    <div className="bg-warm-50 rounded-2xl p-8 mb-8 border border-warm-100">
                      <p className="text-warm-700 mb-6 text-lg leading-relaxed">
                        {result.record.description}
                      </p>
                      <h4 className="font-bold text-warm-800 mb-4 text-xl">💡 建议：</h4>
                      <ul className="space-y-3">
                        {result.record.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-3 text-warm-600 text-lg">
                            <span className="text-violet-500 mt-1.5 text-xl">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {result.record.color === 'red' && (
                      <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 mb-8">
                        <p className="text-red-700 font-medium">
                          💡 您的心理压力较重，强烈建议您寻求专业心理支持。您可以拨打我们的援助热线，
                          或咨询专业心理咨询师。请记住，寻求帮助是勇敢的表现。
                        </p>
                      </div>
                    )}

                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => setPhase('home')}
                        className="px-8 py-3 bg-warm-100 text-warm-700 rounded-full font-semibold hover:bg-warm-200 transition-colors"
                      >
                        返回我的档案
                      </button>
                      <button
                        onClick={() => setActiveTab('hotlines')}
                        className="px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full font-semibold hover:shadow-lg transition-all"
                      >
                        查看援助热线
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'hotlines' && (
            <div>
              <div className="relative overflow-hidden bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-3xl p-10 mb-10 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                <div className="relative">
                  <h3 className="text-3xl font-bold mb-4 flex items-center gap-3">
                    <span className="text-4xl">🆘</span>
                    心理援助热线
                  </h3>
                  <p className="text-white/90 text-lg leading-relaxed">
                    如果您或您的家人正在经历心理危机，请立即拨打以下援助热线。
                    专业的心理咨询师将为您提供免费的心理支持服务。
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {hotlines.map((hotline, index) => (
                  <div
                    key={index}
                    className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/60 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity">
                      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br from-red-400 to-pink-500" />
                    </div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform">
                          📞
                        </div>
                        <div>
                          <h4 className="font-bold text-warm-800 text-xl">{hotline.name}</h4>
                          <p className="text-warm-500">{hotline.service}</p>
                        </div>
                      </div>
                      <a
                        href={`tel:${hotline.number}`}
                        className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-bold text-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 shadow-lg"
                      >
                        {hotline.number}
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 relative bg-warm-50 rounded-3xl p-8 text-center border border-warm-100">
                <p className="text-warm-600 text-lg leading-relaxed">
                  💙 请记住，您不是一个人在面对这些困难。寻求帮助是勇敢的表现，
                  总会有人愿意倾听和帮助您。
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative bg-gradient-to-r from-violet-800 to-purple-900 text-white/80 py-10 mt-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🕊️</span>
            <span className="text-lg font-semibold text-white">安宁疗护信息指南</span>
          </div>
          <p className="text-sm text-white/50 max-w-xl mx-auto">
            本平台仅供信息参考，具体诊疗请遵医嘱。如有紧急情况，请立即就医。
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Psychological;
