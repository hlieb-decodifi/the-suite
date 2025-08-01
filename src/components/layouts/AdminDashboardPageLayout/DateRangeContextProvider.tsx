// Provides date range context and hook for admin dashboard tabs
"use client";
import { createContext, useContext, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type DateRangeContextType = {
  start: string | undefined;
  end: string | undefined;
  setDateRange: (start?: string, end?: string) => void;
};

type DateRangeContextProviderProps = {
  initialStart?: string | undefined;
  initialEnd?: string | undefined;
  children: React.ReactNode;
};

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeContextProvider({ initialStart, initialEnd, children }: DateRangeContextProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const start = searchParams.get("start") || initialStart;
  const end = searchParams.get("end") || initialEnd;

  const setDateRange = useCallback((newStart?: string, newEnd?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newStart) params.set("start", newStart); else params.delete("start");
    if (newEnd) params.set("end", newEnd); else params.delete("end");
    router.replace(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <DateRangeContext.Provider value={{ start, end, setDateRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeContextProvider");
  return ctx;
} 