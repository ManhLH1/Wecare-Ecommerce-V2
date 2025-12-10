"use client"

import * as React from "react"

interface AccordionProps {
  type?: "single" | "multiple";
  defaultValue?: string[];
  children: React.ReactNode;
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
}

interface AccordionTriggerProps {
  className?: string;
  children: React.ReactNode;
}

interface AccordionContentProps {
  children: React.ReactNode;
}

const AccordionContext = React.createContext<{
  openItems: Set<string>;
  toggleItem: (value: string) => void;
}>({
  openItems: new Set(),
  toggleItem: () => {}
});

const AccordionItemContext = React.createContext<{
  value: string;
  isOpen: boolean;
}>({
  value: "",
  isOpen: false
});

const Accordion: React.FC<AccordionProps> = ({ type = "multiple", defaultValue = [], children }) => {
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set(defaultValue));

  const toggleItem = React.useCallback((value: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (type === "single") {
        // For single type, close all others and toggle current
        newSet.clear();
        if (!prev.has(value)) {
          newSet.add(value);
        }
      } else {
        // For multiple type, toggle current
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
      }
      return newSet;
    });
  }, [type]);

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className="space-y-2">
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

const AccordionItem: React.FC<AccordionItemProps> = ({ value, children }) => {
  const { openItems } = React.useContext(AccordionContext);
  const isOpen = openItems.has(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div className="border border-gray-200 rounded-lg">
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

const AccordionTrigger: React.FC<AccordionTriggerProps> = ({ className = "", children }) => {
  const { toggleItem } = React.useContext(AccordionContext);
  const { value, isOpen } = React.useContext(AccordionItemContext);

  return (
    <button
      className={`flex w-full items-center justify-between px-4 py-3 text-left font-medium hover:bg-gray-50 ${className}`}
      onClick={() => toggleItem(value)}
    >
      {children}
      <svg
        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
};

const AccordionContent: React.FC<AccordionContentProps> = ({ children }) => {
  const { isOpen } = React.useContext(AccordionItemContext);

  if (!isOpen) return null;

  return (
    <div className="px-4 pb-4">
      {children}
    </div>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
