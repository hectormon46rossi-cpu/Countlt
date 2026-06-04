import { useState } from "react";
import Auth from "./Auth.jsx";
import Groups from "./Groups.jsx";
import GroupDetail from "./GroupDetail.jsx";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("countit_token"));
  const [username, setUsername] = useState(() => localStorage.getItem("countit_username") || "");
  const [userId, setUserId] = useState(() => {
    try {
      const t = localStorage.getItem("countit_token");
      if (!t) return null;
      return JSON.parse(atob(t.split(".")[1])).id;
    } catch { return null; }
  });
  const [currentGroup, setCurrentGroup] = useState(null);

  function onLogin(t, u) {
    setToken(t);
    setUsername(u);
    try { setUserId(JSON.parse(atob(t.split(".")[1])).id); } catch {}
  }

  function logout() {
    localStorage.removeItem("countit_token");
    localStorage.removeItem("countit_username");
    setToken(null); setUsername(""); setUserId(null); setCurrentGroup(null);
  }

  if (!token) return <Auth onLogin={onLogin} />;

  if (currentGroup) return (
    <GroupDetail
      token={token}
      username={username}
      userId={userId}
      group={currentGroup}
      onBack={() => setCurrentGroup(null)}
    />
  );

  return <Groups token={token} username={username} onEnterGroup={setCurrentGroup} onLogout={logout} />;
}
