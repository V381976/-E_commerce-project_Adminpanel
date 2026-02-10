import { useNavigate } from "react-router-dom";

export default function Topbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header
      className="
        sticky top-0 z-30
        backdrop-blur-lg
        bg-slate-900/70
        border-b border-white/10
        text-white
        px-6 py-4
        flex justify-between items-center
      "
    >
      <h2 className="text-2xl font-bold tracking-wide">
           ShopEase
      </h2>
        

      <button
        onClick={logout}
        className="
          bg-linear-to-r
          from-red-500 to-pink-500
          px-4 py-2 rounded-lg
          text-sm font-semibold
          hover:scale-105
          transition
        "
      >
        Logout
      </button>
    </header>
  );
}
