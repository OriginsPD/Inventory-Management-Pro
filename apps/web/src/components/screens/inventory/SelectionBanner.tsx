import React from 'react';
import { Device } from '../../../lib/types/domain';
import { MotionPresenceBanner } from '@/components/ui/motion';

interface SelectionBannerProps {
  devices: Device[];
  paginatedDevices: Device[];
  selectedDeviceIds: string[];
  isAllSelectedGlobally: boolean;
  setIsAllSelectedGlobally: (val: boolean) => void;
  setSelectedDeviceIds: (ids: string[]) => void;
  handleBulkDelete: (ids: string[]) => Promise<void>;
}

export const SelectionBanner: React.FC<SelectionBannerProps> = ({
  devices,
  paginatedDevices,
  selectedDeviceIds,
  isAllSelectedGlobally,
  setIsAllSelectedGlobally,
  setSelectedDeviceIds,
  handleBulkDelete,
}) => {
  const pageIds = paginatedDevices.map(d => d.id || '');
  const isAllPageSelected = pageIds.length > 0 && pageIds.every(id => selectedDeviceIds.includes(id));
  const show = isAllPageSelected || isAllSelectedGlobally;
  
  return (
    <MotionPresenceBanner show={show}>
    <div className="bg-primary/10 border-b border-primary/10 py-2.5 px-4 text-xs flex justify-between items-center text-foreground">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="material-symbols-outlined text-[16px] text-primary shrink-0">info</span>
        <span>
          {isAllSelectedGlobally ? (
            <>All <strong>{devices.length}</strong> devices in inventory are selected.</>
          ) : (
            <>All <strong>{selectedDeviceIds.length}</strong> devices on this page are selected.</>
          )}
        </span>
        {!isAllSelectedGlobally && devices.length > paginatedDevices.length && (
          <button
            type="button"
            onClick={() => setIsAllSelectedGlobally(true)}
            className="text-primary hover:underline font-semibold ml-2 text-left cursor-pointer"
          >
            Select all {devices.length} devices in inventory
          </button>
        )}
        {isAllSelectedGlobally && (
          <button
            type="button"
            onClick={() => {
              setIsAllSelectedGlobally(false);
              setSelectedDeviceIds([]);
            }}
            className="text-muted-foreground hover:underline ml-2 text-left cursor-pointer"
          >
            Clear selection
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const idsToDelete = isAllSelectedGlobally ? devices.map(d => d.id || '') : selectedDeviceIds;
            handleBulkDelete(idsToDelete);
          }}
          className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/25 text-xs px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">delete</span> Bulk Delete ({isAllSelectedGlobally ? devices.length : selectedDeviceIds.length})
        </button>
      </div>
    </div>
    </MotionPresenceBanner>
  );
};
