// 心理压力自测的计分与解读规则，由服务端统一算分，前端只负责出题。
const QUESTION_COUNT = 8;
const MAX_QUESTION_SCORE = 3;
const MAX_TOTAL_SCORE = QUESTION_COUNT * MAX_QUESTION_SCORE;
const NAME_MAX_LENGTH = 50;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

const interpretScore = (score) => {
  if (score <= 6) {
    return {
      level: '心理状态良好',
      color: 'green',
      description: '您目前的心理状态比较稳定。继续保持良好的生活习惯，定期与家人朋友交流，适度进行放松活动。',
      suggestions: [
        '继续保持规律的作息和适度运动',
        '花时间做自己喜欢的事情',
        '与家人朋友保持良好的沟通',
        '可以尝试每天进行几分钟的冥想练习',
      ],
    };
  }
  if (score <= 12) {
    return {
      level: '轻度压力',
      color: 'yellow',
      description: '您可能正在经历一些压力，这是正常的反应。建议您关注自己的情绪变化，采取适当的方式缓解压力。',
      suggestions: [
        '每天安排一些放松时间',
        '尝试深呼吸或冥想练习',
        '与信任的人分享自己的感受',
        '保持规律的饮食和睡眠',
        '适度进行户外活动',
      ],
    };
  }
  if (score <= 18) {
    return {
      level: '中度压力',
      color: 'orange',
      description: '您的压力水平较高，建议您认真对待自己的心理健康。可以尝试多种放松方法，必要时寻求专业帮助。',
      suggestions: [
        '每天进行10-15分钟的放松练习',
        '考虑寻求心理咨询师的帮助',
        '与医生讨论您的情绪状态',
        '减少不必要的压力源',
        '增加社会支持，多与亲友相处',
      ],
    };
  }
  return {
    level: '较重心理负担',
    color: 'red',
    description: '您目前的心理负担较重，强烈建议您寻求专业心理支持。您不需要独自面对这些困难。',
    suggestions: [
      '请尽快联系专业心理咨询师或医生',
      '告诉家人您的感受，寻求他们的支持',
      '考虑加入支持小组，与有类似经历的人交流',
      '不要自责，寻求帮助是勇敢的表现',
      '可以拨打心理援助热线获得即时支持',
    ],
  };
};

// 校验并规范化一次提交；不合法时抛出 ValidationError，保证在写库之前拦截。
const normalizeSubmission = (payload) => {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('请求格式不正确');
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) {
    throw new ValidationError('请先写下填写人的名字');
  }
  if (name.length > NAME_MAX_LENGTH) {
    throw new ValidationError(`名字太长啦，请控制在 ${NAME_MAX_LENGTH} 个字以内`);
  }

  const { answers } = payload;
  if (!Array.isArray(answers) || answers.length !== QUESTION_COUNT) {
    throw new ValidationError(`题目还没答完，请答完全部 ${QUESTION_COUNT} 道题再提交`);
  }
  for (const answer of answers) {
    if (!Number.isInteger(answer) || answer < 0 || answer > MAX_QUESTION_SCORE) {
      throw new ValidationError('存在无效答案，请重新作答后再提交');
    }
  }

  return { name, answers };
};

const scoreAnswers = (answers) => {
  const totalScore = answers.reduce((sum, value) => sum + value, 0);
  return { totalScore, ...interpretScore(totalScore) };
};

module.exports = {
  QUESTION_COUNT,
  MAX_QUESTION_SCORE,
  MAX_TOTAL_SCORE,
  NAME_MAX_LENGTH,
  ValidationError,
  interpretScore,
  normalizeSubmission,
  scoreAnswers,
};
