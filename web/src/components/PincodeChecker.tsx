import React, { useState } from "react";
import { MapPin, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { useApp } from "../store";

export function PincodeChecker() {
  const { city } = useApp();
  const [pincode, setPincode] = useState("");
  const [checked, setChecked] = useState(false);
  const [isValid, setIsValid] = useState(true);

  const cityPincodePrefixes: Record<string, string[]> = {
    Bengaluru: ["560"],
    Mumbai: ["400", "401"],
    Delhi: ["110"],
    Hyderabad: ["500", "501"],
    Chennai: ["600"],
    Pune: ["411"],
  };

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const pinRegex = /^[1-9][0-9]{5}$/;
    if (!pinRegex.test(pincode.trim())) {
      setIsValid(false);
      setChecked(true);
      return;
    }
    setIsValid(true);
    setChecked(true);
  };

  const isLocalCity = () => {
    const prefixes = cityPincodePrefixes[city] || [];
    return prefixes.some((pre) => pincode.startsWith(pre));
  };

  const samplePincodes: Record<string, string> = {
    Bengaluru: "560001",
    Mumbai: "400001",
    Delhi: "110001",
    Hyderabad: "500001",
    Chennai: "600001",
    Pune: "411001",
  };

  return (
    <div className="border border-[#E4E2DA] bg-[#FFFFFF] p-4 rounded-[2px] space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-[#111111]">
          <Truck strokeWidth={1.5} size={15} className="text-[#B84A27]" />
          <span>CHECK LOCAL RETAIL DISPATCH</span>
        </div>
        <span className="text-[10px] text-[#5A5852] uppercase bg-[#ECEAE2] px-1.5 py-0.5 rounded-[1px]">
          HUB: {city}
        </span>
      </div>

      <form onSubmit={handleCheck} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            maxLength={6}
            value={pincode}
            onChange={(e) => {
              setPincode(e.target.value.replace(/\D/g, ""));
              setChecked(false);
            }}
            placeholder="Enter 6-digit Pincode"
            className="input !text-xs !py-1.5 uppercase font-mono tracking-wider w-full"
          />
        </div>
        <button
          type="submit"
          className="btn-primary !text-xs !py-1.5 !px-3 font-mono font-semibold"
        >
          VERIFY
        </button>
      </form>

      {/* Quick chip for current city */}
      <div className="flex items-center gap-1.5 text-[10px] text-[#5A5852]">
        <span>Quick select:</span>
        <button
          type="button"
          onClick={() => {
            setPincode(samplePincodes[city] || "560001");
            setChecked(false);
          }}
          className="underline hover:text-[#111111] transition-colors"
        >
          {samplePincodes[city] || "560001"} ({city})
        </button>
      </div>

      {checked && (
        <div className="pt-2 border-t border-[#E4E2DA] space-y-1.5">
          {!isValid ? (
            <div className="flex items-center gap-1.5 text-[#B84A27] font-semibold text-[11px]">
              <AlertCircle strokeWidth={1.5} size={13} />
              <span>Please enter a valid 6-digit Indian Postal Code.</span>
            </div>
          ) : isLocalCity() ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#1B4332] font-bold text-[11px]">
                <CheckCircle2 strokeWidth={1.5} size={13} />
                <span>Same-day retail dispatch available for {pincode}.</span>
              </div>
              <p className="text-[#5A5852] text-[11px] leading-relaxed">
                Order within 3 hrs for delivery by 9:00 PM today via local {city} retail fleet. Cash on Delivery supported.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#111111] font-semibold text-[11px]">
                <CheckCircle2 strokeWidth={1.5} size={13} className="text-[#1B4332]" />
                <span>Express courier dispatch available for {pincode}.</span>
              </div>
              <p className="text-[#5A5852] text-[11px] leading-relaxed">
                Estimated delivery in 24-48 hours via StockSync Surface Logistics. Physical returns accepted at any hub.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PincodeChecker;
