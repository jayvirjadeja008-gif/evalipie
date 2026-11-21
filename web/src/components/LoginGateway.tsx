import React, { FormEvent, useState } from "react";
import {
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  Compass,
  AlertCircle,
  Database,
  Zap,
  Search,
  MapPin,
  Check,
} from "lucide-react";
import { useApp } from "../store";

interface LoginGatewayProps {
  onSuccess?: () => void;
  fullPage?: boolean;
}

const INDIAN_HUBS = [
  { name: "Bengaluru", tier: "HQ Central Hub", state: "Karnataka" },
  { name: "Mumbai", tier: "West Coastal Hub", state: "Maharashtra" },
  { name: "Delhi", tier: "North Capital Hub", state: "NCR" },
  { name: "Hyderabad", tier: "South Central Hub", state: "Telangana" },
  { name: "Chennai", tier: "Coromandel Hub", state: "Tamil Nadu" },
  { name: "Pune", tier: "Industrial Hub", state: "Maharashtra" },
];

export function LoginGateway({ onSuccess, fullPage = false }: LoginGatewayProps) {
  const { login, register, loginAsDemo, browseAsGuest, city } = useApp();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCity, setSelectedCity] = useState(city || "Bengaluru");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 3D Card Interactive Tilt State
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;
    setTilt({
      x: rotX,
      y: rotY,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100,
    });
  };

  const handleCardMouseLeave = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await login(email.trim(), password);
      onSuccess?.();
    } catch (e: any) {
      setErr(e.message || "Failed to authenticate credentials.");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Please enter your full name.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await register(name.trim(), email.trim(), password, selectedCity);
      onSuccess?.();
    } catch (e: any) {
      setErr(e.message || "Failed to create account.");
    } finally {
      setBusy(false);
    }
  };

  const handleDemoAccess = async () => {
    setBusy(true);
    setErr(null);
    try {
      await loginAsDemo();
      onSuccess?.();
    } catch (e: any) {
      setErr(e.message || "Failed to connect demo account.");
    } finally {
      setBusy(false);
    }
  };

  const handleGuestAccess = () => {
    browseAsGuest();
    onSuccess?.();
  };

  return (
    <div
      className={`w-full ${
        fullPage ? "min-h-screen" : "min-h-screen"
      } bg-[#F6F5F0] bg-[linear-gradient(to_right,#E4E2DA_1px,transparent_1px),linear-gradient(to_bottom,#E4E2DA_1px,transparent_1px)] bg-[size:32px_32px] flex items-center justify-center p-4 sm:p-6 lg:p-12`}
    >
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Panel: Brand & Live Architecture Status */}
        <div className="lg:col-span-6 space-y-6">
          {/* Logo & Headline */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/evalipie-logo-transparent.png"
                alt="EvaliPie Market"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>

            <div className="space-y-2">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#B84A27] bg-[#B84A27]/10 px-2.5 py-1 rounded-[1px] inline-block">
                HIGH-CONCURRENCY RETAIL SPECIFICATION
              </span>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111111] leading-[1.08]">
                ACCESS NATIONWIDE REAL-TIME RETAIL.
              </h1>
              <p className="font-sans text-sm text-[#5A5852] max-w-lg leading-relaxed">
                Direct physical stock synchronization across 6 Indian fulfillment hubs. Zero phantom inventory
                guaranteed via PostgreSQL row-level locks, Kafka event streaming, and sub-15ms distributed OpenSearch.
              </p>
            </div>
          </div>

          {/* Clean 3-Line System Status Readout */}
          <div className="border border-[#111111] bg-[#FFFFFF] p-4 rounded-[2px] shadow-architectural font-mono text-xs space-y-2.5 max-w-md">
            <div className="flex items-center justify-between">
              <span className="text-[#5A5852] flex items-center gap-2">
                <Database strokeWidth={1.5} size={14} className="text-[#111111]" />
                <span>POSTGRESQL ACID LOCKS</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-[#1B4332]">
                <span className="w-2 h-2 bg-[#1B4332] rounded-[1px] animate-pulse" />
                <span>ONLINE</span>
              </span>
            </div>
            <div className="h-[1px] bg-[#E4E2DA]" />
            <div className="flex items-center justify-between">
              <span className="text-[#5A5852] flex items-center gap-2">
                <Zap strokeWidth={1.5} size={14} className="text-[#111111]" />
                <span>KAFKA EVENT STREAM</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-[#1B4332]">
                <span className="w-2 h-2 bg-[#1B4332] rounded-[1px] animate-pulse" />
                <span>ONLINE</span>
              </span>
            </div>
            <div className="h-[1px] bg-[#E4E2DA]" />
            <div className="flex items-center justify-between">
              <span className="text-[#5A5852] flex items-center gap-2">
                <Search strokeWidth={1.5} size={14} className="text-[#111111]" />
                <span>OPENSEARCH ENGINE</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-[#1B4332]">
                <span className="w-2 h-2 bg-[#1B4332] rounded-[1px] animate-pulse" />
                <span>ONLINE</span>
              </span>
            </div>
          </div>

          {/* Interactive 3D-Tilting Featured Product Preview Card */}
          <div
            className="relative w-full max-w-md"
            style={{ perspective: "1200px" }}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            <div
              className="relative border border-[#E4E2DA] hover:border-[#111111] bg-[#FFFFFF] p-5 rounded-[2px] shadow-architectural transition-transform duration-150 ease-out overflow-hidden"
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transformStyle: "preserve-3d",
              }}
            >
              {/* Dynamic Glare Reflection Overlay */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                style={{
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 65%)`,
                }}
              />

              {/* 3D Floating Layer: Top Badge */}
              <div
                className="flex items-center justify-between mb-3 text-xs font-mono"
                style={{ transform: "translateZ(20px)" }}
              >
                <span className="text-[10px] uppercase font-bold text-[#B84A27] bg-[#B84A27]/10 px-2 py-0.5 rounded-[1px]">
                  FEATURED STUDIO AUDIT
                </span>
                <span className="text-[10px] text-[#5A5852] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#1B4332] rounded-[1px] animate-pulse" />
                  REAL-TIME SYNC
                </span>
              </div>

              {/* 3D Floating Layer: Studio Packshot on Plain White Background */}
              <div
                className="w-full h-44 bg-[#FFFFFF] flex items-center justify-center p-2 mb-3 border border-[#E4E2DA]"
                style={{ transform: "translateZ(30px)" }}
              >
                <img
                  src="/products/AUD-028.jpg"
                  alt="Sony WH-1000XM4 Noise Cancelling Silver"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/products/MOB-028.jpg";
                  }}
                />
              </div>

              {/* 3D Floating Layer: Metadata */}
              <div style={{ transform: "translateZ(24px)" }} className="space-y-1.5">
                <div className="font-mono text-[10px] text-[#8E8A82]">SKU: AUD-028 · SONY STUDIO PACKSHOT</div>
                <h3 className="font-display text-sm font-bold text-[#111111] truncate">
                  Sony WH-1000XM4 Wireless Noise Cancelling Silver
                </h3>
                <div className="flex items-center justify-between font-mono text-xs pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-sm text-[#111111]">₹24,990</span>
                    <span className="text-[11px] text-[#8E8A82] line-through">₹29,990</span>
                    <span className="text-[10px] font-bold text-[#B84A27]">17% OFF</span>
                  </div>
                  <span className="text-[10px] text-[#1B4332] font-semibold bg-[#1B4332]/10 px-2 py-0.5 rounded-[1px]">
                    BENGALURU: 4 IN STOCK
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Architectural Auth Console */}
        <div className="lg:col-span-6">
          <div className="border border-[#111111] bg-[#FFFFFF] p-6 sm:p-8 rounded-[2px] shadow-architectural space-y-6">
            {/* Architectural Tab Switcher */}
            <div className="grid grid-cols-2 border border-[#111111] rounded-[0px] font-mono text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErr(null);
                }}
                className={`py-3 text-center transition-colors rounded-[0px] ${
                  mode === "signin"
                    ? "bg-[#111111] text-[#FFFFFF]"
                    : "bg-[#FFFFFF] text-[#5A5852] hover:text-[#111111] hover:bg-[#F6F5F0]"
                }`}
              >
                [ SIGN IN ]
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErr(null);
                }}
                className={`py-3 text-center transition-colors rounded-[0px] ${
                  mode === "register"
                    ? "bg-[#111111] text-[#FFFFFF]"
                    : "bg-[#FFFFFF] text-[#5A5852] hover:text-[#111111] hover:bg-[#F6F5F0]"
                }`}
              >
                [ CREATE ACCOUNT ]
              </button>
            </div>

            {/* Error Notification */}
            {err && (
              <div
                className="flex items-center gap-2 p-3 bg-red-50 border border-[#B84A27] text-[#B84A27] rounded-[2px] font-mono text-xs"
                role="alert"
              >
                <AlertCircle strokeWidth={1.5} size={15} className="shrink-0" />
                <span>{err}</span>
              </div>
            )}

            {/* Forms */}
            {mode === "signin" ? (
              /* Sign In Form */
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs font-semibold text-[#111111] mb-1">
                    EMAIL ADDRESS
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-[#5A5852] pointer-events-none">
                      <Mail strokeWidth={1.5} size={15} />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="buyer@stocksync.in"
                      autoComplete="email"
                      className="w-full bg-[#FFFFFF] border border-[#E4E2DA] focus:border-[#111111] text-[#111111] text-xs py-2.5 pl-9 pr-3 rounded-[2px] font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-[#111111] mb-1">
                    SECURITY KEY / PASSWORD
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-[#5A5852] pointer-events-none">
                      <KeyRound strokeWidth={1.5} size={15} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      autoComplete="current-password"
                      className="w-full bg-[#FFFFFF] border border-[#E4E2DA] focus:border-[#111111] text-[#111111] text-xs py-2.5 pl-9 pr-10 rounded-[2px] font-mono focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#5A5852] hover:text-[#111111] transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff strokeWidth={1.5} size={15} /> : <Eye strokeWidth={1.5} size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-[#111111] hover:bg-[#2D2D2A] text-[#FFFFFF] py-3 px-4 font-mono text-xs font-bold rounded-[2px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <span>{busy ? "AUTHENTICATING..." : "SIGN IN TO STOREFRONT"}</span>
                  <ArrowRight strokeWidth={1.5} size={14} />
                </button>
              </form>
            ) : (
              /* Create Account Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs font-semibold text-[#111111] mb-1">
                    FULL NAME
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-[#5A5852] pointer-events-none">
                      <UserIcon strokeWidth={1.5} size={15} />
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Aarav Sharma"
                      autoComplete="name"
                      className="w-full bg-[#FFFFFF] border border-[#E4E2DA] focus:border-[#111111] text-[#111111] text-xs py-2.5 pl-9 pr-3 rounded-[2px] font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-[#111111] mb-1">
                    EMAIL ADDRESS
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-[#5A5852] pointer-events-none">
                      <Mail strokeWidth={1.5} size={15} />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="aarav@evalipie.in"
                      autoComplete="email"
                      className="w-full bg-[#FFFFFF] border border-[#E4E2DA] focus:border-[#111111] text-[#111111] text-xs py-2.5 pl-9 pr-3 rounded-[2px] font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-[#111111] mb-1">
                    PASSWORD (MIN 6 CHARACTERS)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-[#5A5852] pointer-events-none">
                      <KeyRound strokeWidth={1.5} size={15} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create security password"
                      autoComplete="new-password"
                      className="w-full bg-[#FFFFFF] border border-[#E4E2DA] focus:border-[#111111] text-[#111111] text-xs py-2.5 pl-9 pr-10 rounded-[2px] font-mono focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#5A5852] hover:text-[#111111] transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff strokeWidth={1.5} size={15} /> : <Eye strokeWidth={1.5} size={15} />}
                    </button>
                  </div>
                </div>

                {/* Default Indian City Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-mono text-xs font-semibold text-[#111111]">
                      DEFAULT INDIAN FULFILLMENT HUB
                    </label>
                    <span className="font-mono text-[10px] text-[#5A5852] flex items-center gap-1">
                      <MapPin strokeWidth={1.5} size={11} className="text-[#B84A27]" />
                      LOCALIZED INVENTORY
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {INDIAN_HUBS.map((hub) => {
                      const isSelected = selectedCity === hub.name;
                      return (
                        <button
                          key={hub.name}
                          type="button"
                          onClick={() => setSelectedCity(hub.name)}
                          className={`p-2.5 text-left border rounded-[2px] transition-all font-mono text-xs relative ${
                            isSelected
                              ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                              : "border-[#E4E2DA] bg-[#F6F5F0] text-[#111111] hover:border-[#111111]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{hub.name}</span>
                            {isSelected && <Check strokeWidth={2} size={12} className="text-[#B84A27]" />}
                          </div>
                          <div
                            className={`text-[10px] truncate ${
                              isSelected ? "text-[#E4E2DA]" : "text-[#5A5852]"
                            }`}
                          >
                            {hub.tier}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-[#111111] hover:bg-[#2D2D2A] text-[#FFFFFF] py-3 px-4 font-mono text-xs font-bold rounded-[2px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <span>{busy ? "INITIALIZING ACCOUNT..." : "INITIALIZE ACCOUNT & ENTER"}</span>
                  <ArrowRight strokeWidth={1.5} size={14} />
                </button>
              </form>
            )}

            {/* One-Click Demo & Guest Access (Important for Fast Testing) */}
            <div className="pt-5 border-t border-[#E4E2DA] space-y-3 font-mono">
              <span className="text-[10px] font-bold text-[#5A5852] tracking-wider uppercase block">
                ONE-CLICK REVIEWER &amp; EVALUATION ACCESS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDemoAccess}
                  disabled={busy}
                  className="flex items-center gap-2.5 p-3 border border-[#111111] bg-[#FFFFFF] hover:bg-[#F6F5F0] transition-colors rounded-[2px] text-left group"
                >
                  <ShieldCheck strokeWidth={1.5} size={16} className="text-[#B84A27] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111111] group-hover:text-[#B84A27] transition-colors">
                      CONTINUE WITH DEMO
                    </div>
                    <div className="text-[10px] text-[#5A5852] truncate">
                      Bengaluru Hub · demo@stocksync.in
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleGuestAccess}
                  disabled={busy}
                  className="flex items-center gap-2.5 p-3 border border-[#E4E2DA] hover:border-[#111111] bg-[#F6F5F0] hover:bg-[#FFFFFF] transition-colors rounded-[2px] text-left group"
                >
                  <Compass strokeWidth={1.5} size={16} className="text-[#111111] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111111] group-hover:text-[#111111] transition-colors">
                      BROWSE AS GUEST
                    </div>
                    <div className="text-[10px] text-[#5A5852] truncate">
                      Instant exploration without credentials
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
