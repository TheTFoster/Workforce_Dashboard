import React, { useState } from "react";
import PrimaryNav from "./PrimaryNav";

/**
 * AppLayout - Wraps page content with common navigation elements
 * Used for all authenticated pages to provide consistent navigation
 */
export default function AppLayout({ children }) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Pass export/batch handlers to children if they accept them
  const childrenWithProps = React.cloneElement(children, {
    onExport: () => setIsExportModalOpen(true),
    onOpenBatch: () => setIsBatchModalOpen(true),
    isExportModalOpen,
    setIsExportModalOpen,
    isBatchModalOpen,
    setIsBatchModalOpen,
  });

  return (
    <div className="app-layout">
      <PrimaryNav
        onExport={() => setIsExportModalOpen(true)}
        onOpenBatch={() => setIsBatchModalOpen(true)}
      />
      {childrenWithProps}
    </div>
  );
}
