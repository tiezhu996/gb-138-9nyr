const parseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const request = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('网络连接失败，请稍后重试');
  }

  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error((data && data.error) || `请求失败（${response.status}）`);
  }
  return data;
};

export const fetchRecords = (name) =>
  request(`/api/assessment/records?name=${encodeURIComponent(name)}`);

export const submitAssessment = (name, answers) =>
  request('/api/assessment/records', {
    method: 'POST',
    body: JSON.stringify({ name, answers }),
  });
