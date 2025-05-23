"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { customStyle } from "@/app/style/custom-style";
import { backendUrl } from "@/app/baseUrl";
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const baseUrl = backendUrl();
  
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const check = await axios.get(`${baseUrl}/auth/check`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (check.data ===1) {
            router.push("/notes");
            return;
          }
         } catch (error) {
          console.log('error',error);
          return;
         }
      router.push("/notes");
      return;
    }

   try {
    const check = await axios.get(`${baseUrl}/auth/check`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!check.data) {
      localStorage.removeItem("token");
      router.push("/login");
      return;
    }
   } catch (error) {
    console.log('error',error);
    localStorage.removeItem("token");
    console.log('navifte to login');
    router.push("/login");
    return;
   }
 
  }
  fetchData();
}, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      console.log("env", process.env.NODE_ENV);
      const response = await axios.post(`${baseUrl}/auth/login`, {
        username: username,
        password: password,
      });

      const token = await response.data.accessToken;

      if (token) {
        localStorage.setItem("token", token);
        router.push("/home");
      } else {
        setError("No token received from server");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("An error occurred during login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${customStyle.selectBg} flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className={`${customStyle.textContentWhite} mt-6 text-center text-3xl font-bold tracking-tight `}>
            Login to your account
          </h2>
     
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Username
              </label>
              <input
                id="email-address"
                name="username"
                type="text"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-md border-0 py-1.5 px-3  ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`relative block w-full rounded-b-md border-0 py-1.5 px-3 text-white-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-900"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="#"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-400"
            >
              {loading ? "Processing..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
