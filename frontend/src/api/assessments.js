const request = async (path, options = {}) => {
  let res;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('连不上服务器，请检查网络后重试');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // 非 JSON 响应，按失败处理
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `请求失败（${res.status}），请稍后再试`);
  }
  return data;
};

export const fetchAssessments = (name) =>
  request(`/api/assessments?name=${encodeURIComponent(name)}`);

export const submitAssessment = (name, answers) =>
  request('/api/assessments', {
    method: 'POST',
    body: JSON.stringify({ name, answers }),
  });
