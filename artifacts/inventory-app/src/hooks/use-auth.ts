import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe, useLogin } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useGetMe({
    query: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    }
  });

  const logout = () => {
    localStorage.removeItem("token");
    queryClient.clear();
    setLocation("/login");
  };

  useEffect(() => {
    // If we have an auth error (401), clear token and redirect
    if (error) {
      localStorage.removeItem("token");
    }
  }, [error]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
