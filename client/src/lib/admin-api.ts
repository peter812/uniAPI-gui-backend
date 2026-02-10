export function authFetch(url: string, sessionToken: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
      ...(options?.headers || {}),
    },
  });
}

export async function authPost(url: string, sessionToken: string, data?: any) {
  const res = await authFetch(url, sessionToken, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}
