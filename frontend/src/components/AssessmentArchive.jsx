import { useCallback, useEffect, useState } from 'react';
import {
  selfAssessmentQuestions,
  getResultInterpretation,
} from '../data/psychological';
import { fetchRecords, submitAssessment } from '../api';

const NAME_STORAGE_KEY = 'assessment_person_name';

const colorStyles = {
  green: {
    badge: 'bg-gradient-to-br from-green-100 to-emerald-100',
    text: 'text-green-600',
    emoji: '😊',
  },
  yellow: {
    badge: 'bg-gradient-to-br from-yellow-100 to-amber-100',
    text: 'text-yellow-600',
    emoji: '😐',
  },
  orange: {
    badge: 'bg-gradient-to-br from-orange-100 to-red-100',
    text: 'text-orange-600',
    emoji: '😟',
  },
  red: {
    badge: 'bg-gradient-to-br from-red-100 to-rose-100',
    text: 'text-red-600',
    emoji: '😢',
  },
};

const formatTime = (isoString) => {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isToday = (dateString) => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === dateString
  );
};

const answerLabel = (questionId, value) => {
  const question = selfAssessmentQuestions.find((q) => q.id === questionId);
  const option = question && question.options.find((o) => o.value === value);
  return option ? option.label : '—';
};

const ScoreDiff = ({ diff }) => {
  if (diff === null || diff === undefined) {
    return (
      <span className="text-sm text-warm-400 font-medium">首次记录</span>
    );
  }
  if (diff === 0) {
    return <span className="text-sm text-warm-500 font-medium">与上次持平</span>;
  }
  if (diff < 0) {
    return (
      <span className="text-sm text-green-600 font-bold">较上次 ↓ {Math.abs(diff)} 分</span>
    );
  }
  return (
    <span className="text-sm text-red-600 font-bold">较上次 ↑ {diff} 分</span>
  );
};

const readSavedName = () => {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const AssessmentArchive = ({ onGoHotlines }) => {
  const [name, setName] = useState(readSavedName);
  const [nameDraft, setNameDraft] = useState(readSavedName);
  const [records, setRecords] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(() => Boolean(readSavedName()));
  const [archiveError, setArchiveError] = useState('');

  const [phase, setPhase] = useState('intro'); // intro | quiz | review | result
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitOutcome, setSubmitOutcome] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);

  const loadArchive = useCallback(async (personName) => {
    setLoadingArchive(true);
    setArchiveError('');
    try {
      const data = await fetchRecords(personName);
      setRecords(data.records || []);
    } catch (err) {
      setArchiveError(err.message);
      setRecords([]);
    } finally {
      setLoadingArchive(false);
    }
  }, []);

  // 打开页面即读取该填写人的档案，显示上次总分
  useEffect(() => {
    if (!name) return undefined;
    let cancelled = false;
    fetchRecords(name)
      .then((data) => {
        if (!cancelled) setRecords(data.records || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setArchiveError(err.message);
          setRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingArchive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  const latest = records[0] || null;
  const latestResult = latest ? getResultInterpretation(latest.score) : null;
  // 列表按时间倒序，每条与紧邻的更早一条比较
  const diffAgainst = (index) => {
    const older = records[index + 1];
    if (!older) return null;
    return records[index].score - older.score;
  };

  const handleConfirmName = (event) => {
    event.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setName(trimmed);
    localStorage.setItem(NAME_STORAGE_KEY, trimmed);
    loadArchive(trimmed);
  };

  const startQuiz = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setSubmitError('');
    setSubmitOutcome(null);
    setPhase('quiz');
  };

  const handleAnswer = (value) => {
    const next = { ...answers, [selfAssessmentQuestions[currentQuestion].id]: value };
    setAnswers(next);
    if (currentQuestion < selfAssessmentQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setPhase('review');
    }
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === selfAssessmentQuestions.length;

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const outcome = await submitAssessment(name, answers);
      setSubmitOutcome(outcome);
      setPhase('result');
      await loadArchive(name);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const question = selfAssessmentQuestions[currentQuestion];
  const result = submitOutcome ? getResultInterpretation(submitOutcome.record.score) : null;
  const submittedDiff = submitOutcome && submitOutcome.previous
    ? submitOutcome.record.score - submitOutcome.previous.score
    : null;

  return (
    <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 md:p-10 border border-white/60 overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500" />
      </div>

      <div className="relative">
        {phase === 'intro' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-4xl shadow-2xl mx-auto mb-5">
                📝
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-warm-800 mb-3">
                心理压力自测档案
              </h3>
              <p className="text-warm-600 max-w-xl mx-auto leading-relaxed">
                本测验包含 {selfAssessmentQuestions.length} 个问题。请先留下填写人姓名，提交后由服务端统一算分并给出建议。
                每位填写人的每次完成记录都会保存在档案里，方便日后翻看与对比。
              </p>
            </div>

            <form onSubmit={handleConfirmName} className="max-w-md mx-auto mb-8">
              <label htmlFor="assessment-name" className="block text-sm font-semibold text-warm-700 mb-2">
                填写人姓名
              </label>
              <div className="flex gap-3">
                <input
                  id="assessment-name"
                  type="text"
                  value={nameDraft}
                  maxLength={50}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="请输入姓名，例如：王阿姨"
                  className="flex-1 px-4 py-3 rounded-2xl border-2 border-warm-200 focus:border-blue-400 focus:outline-none text-warm-800 bg-white"
                />
                <button
                  type="submit"
                  disabled={!nameDraft.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-bold hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  查看档案
                </button>
              </div>
            </form>

            {name && (
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-warm-800">
                    {name} 的测评档案
                  </h4>
                  <button
                    onClick={startQuiz}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-semibold hover:shadow-lg transition-all text-sm md:text-base"
                  >
                    {latest ? '再次测评' : '开始测试'}
                  </button>
                </div>

                {loadingArchive && (
                  <p className="text-center text-warm-400 py-8">正在读取档案…</p>
                )}
                {archiveError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                    <p className="text-red-700 text-sm">{archiveError}，请稍后重试。</p>
                  </div>
                )}

                {!loadingArchive && !archiveError && latest && (
                  <div className={`rounded-2xl p-6 mb-6 border ${colorStyles[latestResult.color].badge} border-white`}>
                    <p className="text-sm text-warm-500 mb-1">上次测评总分（{formatTime(latest.createdAt)}）</p>
                    <div className="flex items-end justify-between flex-wrap gap-3">
                      <p className={`text-4xl font-extrabold ${colorStyles[latestResult.color].text}`}>
                        {latest.score}
                        <span className="text-lg font-semibold text-warm-400"> / {latest.maxScore}</span>
                      </p>
                      <p className={`text-lg font-bold ${colorStyles[latestResult.color].text}`}>
                        {colorStyles[latestResult.color].emoji} {latestResult.level}
                      </p>
                    </div>
                  </div>
                )}

                {!loadingArchive && !archiveError && !latest && (
                  <div className="bg-warm-50 rounded-2xl p-8 text-center border border-warm-100 mb-6">
                    <p className="text-warm-500">
                      档案里还没有测评记录，完成第一次测试后即可在这里查看总分与变化。
                    </p>
                  </div>
                )}

                {!loadingArchive && !archiveError && records.length > 0 && (
                  <div>
                    <h5 className="font-bold text-warm-700 mb-3">历史记录（共 {records.length} 条）</h5>
                    <div className="space-y-3">
                      {records.map((record, index) => {
                        const item = getResultInterpretation(record.score);
                        const diff = diffAgainst(index);
                        const expanded = expandedRecord === record.id;
                        return (
                          <div
                            key={record.id}
                            className="bg-white rounded-2xl border border-warm-100 shadow-sm overflow-hidden"
                          >
                            <button
                              onClick={() => setExpandedRecord(expanded ? null : record.id)}
                              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-warm-50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-2xl flex-shrink-0">{colorStyles[item.color].emoji}</span>
                                <div className="min-w-0">
                                  <p className="font-bold text-warm-800">
                                    {record.score} 分 · {item.level}
                                    {isToday(record.assessmentDate) && index === 0 && (
                                      <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                        今日最新
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-warm-400">{formatTime(record.createdAt)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <ScoreDiff diff={diff} />
                                <span className="text-warm-300 text-sm">{expanded ? '收起 ▲' : '明细 ▼'}</span>
                              </div>
                            </button>
                            {expanded && (
                              <div className="px-5 pb-5 border-t border-warm-100">
                                <ul className="mt-4 space-y-2">
                                  {selfAssessmentQuestions.map((q) => (
                                    <li key={q.id} className="text-sm flex gap-2">
                                      <span className="text-warm-400 flex-shrink-0">第{q.id}题</span>
                                      <span className="text-warm-600 truncate">{q.question}</span>
                                      <span className="text-violet-600 font-semibold flex-shrink-0 ml-auto">
                                        {answerLabel(q.id, record.answers[String(q.id)])}（{record.answers[String(q.id)] ?? '—'}分）
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-8 max-w-xl mx-auto">
              <p className="text-amber-700 text-sm text-center">
                ⚠️ 本自测仅供参考，不能替代专业诊断。如有需要，请寻求专业心理咨询师的帮助。
              </p>
            </div>
          </div>
        )}

        {phase === 'quiz' && (
          <div>
            <div className="mb-8">
              <div className="flex justify-between text-warm-500 mb-3 font-medium">
                <span>问题 {currentQuestion + 1} / {selfAssessmentQuestions.length}</span>
                <span>{Math.round(((currentQuestion + 1) / selfAssessmentQuestions.length) * 100)}%</span>
              </div>
              <div className="w-full bg-warm-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${((currentQuestion + 1) / selfAssessmentQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-warm-800 mb-8 leading-relaxed">
              {question.question}
            </h3>

            <div className="space-y-4 mb-8">
              {question.options.map((option, index) => {
                const selected = answers[question.id] === option.value;
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option.value)}
                    className={`w-full p-5 text-left rounded-2xl transition-all duration-300 border-2 group ${
                      selected
                        ? 'bg-blue-50 border-blue-400 shadow-lg'
                        : 'bg-warm-50 hover:bg-violet-50 border-transparent hover:border-violet-300 hover:shadow-lg'
                    }`}
                  >
                    <span className={`text-lg transition-colors ${selected ? 'text-blue-700 font-semibold' : 'text-warm-700 group-hover:text-violet-700'}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
                  else setPhase('intro');
                }}
                className="px-6 py-2.5 text-warm-500 hover:text-warm-700 font-semibold transition-colors"
              >
                {currentQuestion > 0 ? '上一题' : '退出测试'}
              </button>
              <p className="text-sm text-warm-400">已答 {answeredCount} / {selfAssessmentQuestions.length} 题</p>
            </div>
          </div>
        )}

        {phase === 'review' && (
          <div>
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold text-warm-800 mb-3">核对您的答案</h3>
              <p className="text-warm-500">
                {allAnswered
                  ? `${name}，全部 ${selfAssessmentQuestions.length} 题均已作答，确认无误后提交，由服务端算分并保存到档案。`
                  : `还有 ${selfAssessmentQuestions.length - answeredCount} 题未作答，提交按钮暂不可用。`}
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {selfAssessmentQuestions.map((q, index) => {
                const value = answers[q.id];
                const answered = value !== undefined;
                return (
                  <li key={q.id}>
                    <button
                      onClick={() => {
                        setCurrentQuestion(index);
                        setPhase('quiz');
                      }}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                        answered
                          ? 'bg-warm-50 border-warm-100 hover:border-blue-300'
                          : 'bg-red-50 border-red-200 hover:border-red-300'
                      }`}
                    >
                      <span className={`flex-shrink-0 w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center ${answered ? 'bg-blue-400' : 'bg-red-400'}`}>
                        {index + 1}
                      </span>
                      <span className="flex-1">
                        <span className="block text-warm-800 font-medium mb-1">{q.question}</span>
                        <span className={`text-sm font-semibold ${answered ? 'text-blue-600' : 'text-red-500'}`}>
                          {answered ? `${answerLabel(q.id, value)}（${value} 分）` : '未作答，点击返回作答'}
                        </span>
                      </span>
                      <span className="text-warm-300 text-sm flex-shrink-0">修改</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <p className="text-red-700 text-sm text-center">{submitError}，本次作答仍保留在页面上，请重试。</p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setPhase('intro')}
                className="px-8 py-3 bg-warm-100 text-warm-700 rounded-full font-semibold hover:bg-warm-200 transition-colors"
              >
                暂不提交
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="px-10 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-bold hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? '提交中…' : '确认提交并算分'}
              </button>
            </div>
          </div>
        )}

        {phase === 'result' && submitOutcome && (
          <div>
            <div className="text-center mb-10">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-2xl mx-auto mb-6 ${colorStyles[result.color].badge}`}>
                {colorStyles[result.color].emoji}
              </div>
              <h3 className="text-3xl font-bold text-warm-800 mb-3">测试结果已存入档案</h3>
              <p className={`text-4xl font-bold mb-4 ${colorStyles[result.color].text}`}>
                {result.level}
              </p>
              <p className="text-warm-500 text-lg mb-2">
                {name} 的得分：{submitOutcome.record.score} / {submitOutcome.record.maxScore}
              </p>
              <ScoreDiff diff={submittedDiff} />
            </div>

            <div className="bg-warm-50 rounded-2xl p-8 mb-8 border border-warm-100">
              <p className="text-warm-700 mb-6 text-lg leading-relaxed">
                {result.description}
              </p>
              <h4 className="font-bold text-warm-800 mb-4 text-xl">💡 建议：</h4>
              <ul className="space-y-3">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-3 text-warm-600 text-lg">
                    <span className="text-violet-500 mt-1.5 text-xl">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {result.color === 'red' && (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 mb-8">
                <p className="text-red-700 font-medium">
                  💡 您的心理压力较重，强烈建议您寻求专业心理支持。您可以拨打我们的援助热线，
                  或咨询专业心理咨询师。请记住，寻求帮助是勇敢的表现。
                </p>
              </div>
            )}

            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={() => setPhase('intro')}
                className="px-8 py-3 bg-warm-100 text-warm-700 rounded-full font-semibold hover:bg-warm-200 transition-colors"
              >
                返回档案
              </button>
              <button
                onClick={startQuiz}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-semibold hover:shadow-lg transition-all"
              >
                再测一次
              </button>
              <button
                onClick={onGoHotlines}
                className="px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full font-semibold hover:shadow-lg transition-all"
              >
                查看援助热线
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentArchive;
