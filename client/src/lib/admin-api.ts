function handleAuthError(res: Response) {
  if (res.status === 401) {
    sessionStorage.removeItem("adminSession");
    window.location.reload();
  }
}

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
    handleAuthError(res);
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export async function authDelete(url: string, sessionToken: string) {
  const res = await authFetch(url, sessionToken, {
    method: "DELETE",
  });
  if (!res.ok) {
    handleAuthError(res);
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}
