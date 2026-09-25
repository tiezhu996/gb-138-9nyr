import { useState } from 'react';
import { Link } from 'react-router-dom';
import { meditationAudios, hotlines } from '../data/psychological';
import AssessmentArchive from '../components/AssessmentArchive';

const Psychological = () => {
  const [activeTab, setActiveTab] = useState('meditation');
  const [selectedMeditation, setSelectedMeditation] = useState(null);

  const tabs = [
    { id: 'meditation', label: '冥想音频', icon: '🧘' },
    { id: 'assessment', label: '自测量表', icon: '📝' },
    { id: 'hotlines', label: '援助热线', icon: '📞' }
  ];

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
            <AssessmentArchive onGoHotlines={() => setActiveTab('hotlines')} />
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
