// Provides date range context and hook for admin dashboard tabs
"use client";
import { createContext, useContext, useCallback, useState, useEffect } from "react";
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

export function DateRangeContextProvider(props: DateRangeContextProviderProps) {
  const { initialStart, initialEnd, children } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Persist date range in state, initialize from initialStart/initialEnd
  const [dateRange, setDateRangeState] = useState<{ start: string | undefined; end: string | undefined }>({ start: initialStart, end: initialEnd });

  // On mount and whenever searchParams change, update state from URL if present
  useEffect(() => {
    const urlStart = searchParams.get("start");
    const urlEnd = searchParams.get("end");
    setDateRangeState(prev => ({
      start: urlStart !== null ? urlStart : prev.start,
      end: urlEnd !== null ? urlEnd : prev.end,
    }));
  }, [searchParams]);

  const setDateRange = useCallback((newStart?: string, newEnd?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newStart) params.set("start", newStart); else params.delete("start");
    if (newEnd) params.set("end", newEnd); else params.delete("end");
    router.replace(`${pathname}?${params.toString()}`);
    setDateRangeState({ start: newStart, end: newEnd });
  }, [router, pathname, searchParams]);

  return (
    <DateRangeContext.Provider value={{ start: dateRange.start, end: dateRange.end, setDateRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeContextProvider");
  return ctx;
}