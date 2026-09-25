// 心理压力自测量表（8 题）。题目选项的 value 已包含正向/反向计分方向，
// 总分即各题所选分值之和，满分 24 分。
const QUESTIONS = [
  {
    id: 1,
    question: '最近一周，您是否经常感到紧张或焦虑？',
    options: [
      { value: 0, label: '很少或没有' },
      { value: 1, label: '偶尔' },
      { value: 2, label: '经常' },
      { value: 3, label: '几乎每天' },
    ],
  },
  {
    id: 2,
    question: '您是否能够控制自己的担忧？',
    options: [
      { value: 3, label: '很少或没有' },
      { value: 2, label: '偶尔' },
      { value: 1, label: '经常' },
      { value: 0, label: '几乎每天' },
    ],
  },
  {
    id: 3,
    question: '您是否容易感到烦躁或易怒？',
    options: [
      { value: 0, label: '很少或没有' },
      { value: 1, label: '偶尔' },
      { value: 2, label: '经常' },
      { value: 3, label: '几乎每天' },
    ],
  },
  {
    id: 4,
    question: '您是否感到疲劳或精力不足？',
    options: [
      { value: 0, label: '很少或没有' },
      { value: 1, label: '偶尔' },
      { value: 2, label: '经常' },
      { value: 3, label: '几乎每天' },
    ],
  },
  {
    id: 5,
    question: '您是否有睡眠困扰（入睡困难、易醒或早醒）？',
    options: [
      { value: 0, label: '很少或没有' },
      { value: 1, label: '偶尔' },
      { value: 2, label: '经常' },
      { value: 3, label: '几乎每天' },
    ],
  },
  {
    id: 6,
    question: '您是否感到对事物失去兴趣或愉悦感？',
    options: [
      { value: 0, label: '很少或没有' },
      { value: 1, label: '偶尔' },
      { value: 2, label: '经常' },
      { value: 3, label: '几乎每天' },
    ],
  },
  {
    id: 7,
    question: '您是否感到孤独或与他人隔绝？',
    options: [
      { value: 0, label: '很少或没有' },
      { value: 1, label: '偶尔' },
      { value: 2, label: '经常' },
      { value: 3, label: '几乎每天' },
    ],
  },
  {
    id: 8,
    question: '您是否能够获得足够的情感支持？',
    options: [
      { value: 3, label: '总是可以' },
      { value: 2, label: '大部分时间可以' },
      { value: 1, label: '偶尔可以' },
      { value: 0, label: '很少或没有' },
    ],
  },
];

const LEVELS = [
  {
    max: 6,
    level: '心理状态良好',
    color: 'green',
    description:
      '您目前的心理状态比较稳定。继续保持良好的生活习惯，定期与家人朋友交流，适度进行放松活动。',
    suggestions: [
      '继续保持规律的作息和适度运动',
      '花时间做自己喜欢的事情',
      '与家人朋友保持良好的沟通',
      '可以尝试每天进行几分钟的冥想练习',
    ],
  },
  {
    max: 12,
    level: '轻度压力',
    color: 'yellow',
    description:
      '您可能正在经历一些压力，这是正常的反应。建议您关注自己的情绪变化，采取适当的方式缓解压力。',
    suggestions: [
      '每天安排一些放松时间',
      '尝试深呼吸或冥想练习',
      '与信任的人分享自己的感受',
      '保持规律的饮食和睡眠',
      '适度进行户外活动',
    ],
  },
  {
    max: 18,
    level: '中度压力',
    color: 'orange',
    description:
      '您的压力水平较高，建议您认真对待自己的心理健康。可以尝试多种放松方法，必要时寻求专业帮助。',
    suggestions: [
      '每天进行10-15分钟的放松练习',
      '考虑寻求心理咨询师的帮助',
      '与医生讨论您的情绪状态',
      '减少不必要的压力源',
      '增加社会支持，多与亲友相处',
    ],
  },
  {
    max: Number.POSITIVE_INFINITY,
    level: '较重心理负担',
    color: 'red',
    description:
      '您目前的心理负担较重，强烈建议您寻求专业心理支持。您不需要独自面对这些困难。',
    suggestions: [
      '请尽快联系专业心理咨询师或医生',
      '告诉家人您的感受，寻求他们的支持',
      '考虑加入支持小组，与有类似经历的人交流',
      '不要自责，寻求帮助是勇敢的表现',
      '可以拨打心理援助热线获得即时支持',
    ],
  },
];

const interpret = (score) => LEVELS.find((item) => score <= item.max);

module.exports = {
  QUESTIONS,
  MAX_SCORE: QUESTIONS.length * 3,
  interpret,
};
