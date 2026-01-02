import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = localStorage.getItem('token');
  const skipAuth = localStorage.getItem('skipAuth');
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (options?.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // If skip auth mode and error, provide helpful message
  if (skipAuth === 'true' && (res.status === 401 || res.status === 400)) {
    console.log('⚠️ Skip auth mode: API call blocked, user needs to register');
    const errorData = await res.text();
    const message = errorData.includes('authentication') 
      ? 'Please complete registration to save and view data'
      : 'Please login or register to use this feature';
    
    throw new Error(message);
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    const skipAuth = localStorage.getItem('skipAuth');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    // If skip auth mode and 401, return empty data instead of error
    if (skipAuth === 'true' && res.status === 401) {
      console.log('Skip auth mode: returning empty data for', queryKey.join("/"));
      return { data: [], reports: [], patients: [], users: [] } as any;
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
