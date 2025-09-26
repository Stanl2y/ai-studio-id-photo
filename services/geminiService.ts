export async function generateIdPhoto(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
  const endpoint = `${apiBaseUrl}/api/generate`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64ImageData,
        mimeType,
        prompt,
      }),
    });

    const payload = await response.json().catch(() => {
      throw new Error('서버에서 JSON 형식의 응답을 받지 못했습니다.');
    });

    if (!response.ok) {
      const message = typeof payload?.error === 'string' ? payload.error : '이미지 생성에 실패했습니다.';
      throw new Error(message);
    }

    if (!payload?.imageBase64 || typeof payload.imageBase64 !== 'string') {
      throw new Error('서버에서 올바른 이미지 데이터를 받지 못했습니다.');
    }

    return payload.imageBase64;
  } catch (error) {
    console.error('generateIdPhoto 호출 실패:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('이미지 생성 중 알 수 없는 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
  }
}
