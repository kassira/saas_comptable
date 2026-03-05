import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, totpCode = null) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
        totp_code: totpCode
      });

      if (response.data.requires_2fa && !totpCode) {
        setRequires2FA(true);
        setPendingCredentials({ email, password });
        return { requires2FA: true };
      }

      const { access_token, user: userData } = response.data;
      localStorage.setItem("token", access_token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setToken(access_token);
      setUser(userData);
      setRequires2FA(false);
      setPendingCredentials(null);
      return { success: true };
    } catch (error) {
      throw new Error(error.response?.data?.detail || "Login failed");
    }
  };

  const register = async (email, password, fullName, role = "collaborator") => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email,
        password,
        full_name: fullName,
        role
      });

      const { access_token, user: userData } = response.data;
      localStorage.setItem("token", access_token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      throw new Error(error.response?.data?.detail || "Registration failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    setRequires2FA(false);
    setPendingCredentials(null);
  };

  const verify2FA = async (code) => {
    if (!pendingCredentials) {
      throw new Error("No pending 2FA verification");
    }
    return login(pendingCredentials.email, pendingCredentials.password, code);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      requires2FA,
      login,
      register,
      logout,
      verify2FA,
      updateUser,
      fetchUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
