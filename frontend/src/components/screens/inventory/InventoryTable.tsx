import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../ui/table';
import { Checkbox } from '../../ui/checkbox';
import { Skeleton } from '../../ui/skeleton';
import { EmptyState } from '../../ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Device } from '../../../lib/types/domain';

interface InventoryTableProps {
  devices: Device[];
  paginatedDevices: Device[];
  isLoading: boolean;
  selectedDeviceIds: string[];
  isAllSelectedGlobally: boolean;
  togglePageSelection: () => void;
  toggleDeviceSelection: (id: string) => void;
  visibleColumns: Record<string, boolean>;
  handleSort: (field: string) => void;
  user: any;
  setViewModalDevice: (d: Device) => void;
  setLinkModalDevice: (d: Device) => void;
  handleOpenEditModal: (d: Device) => void;
  handleDelete: (id: string) => void;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  totalPages: number;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  devices,
  paginatedDevices,
  isLoading,
  selectedDeviceIds,
  isAllSelectedGlobally,
  togglePageSelection,
  toggleDeviceSelection,
  visibleColumns,
  handleSort,
  user,
  setViewModalDevice,
  setLinkModalDevice,
  handleOpenEditModal,
  handleDelete,
  currentPage,
  setCurrentPage,
  totalPages,
}) => {
  return (
    <div className="glass-panel rounded-xl overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] px-4">
              <Checkbox 
                checked={isAllSelectedGlobally || (paginatedDevices.length > 0 && paginatedDevices.every(d => selectedDeviceIds.includes(d.id || '')))}
                onCheckedChange={togglePageSelection}
                disabled={user?.role === 'REVIEWER'}
              />
            </TableHead>
            {visibleColumns.identifier && (
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort('identifier')}
                  className="inline-flex items-center gap-1 hover:text-foreground text-left font-medium text-muted-foreground cursor-pointer"
                >
                  Identifier (ISN) <span className="material-symbols-outlined text-sm text-muted-foreground/70 shrink-0">unfold_more</span>
                </button>
              </TableHead>
            )}
            {visibleColumns.type && (
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort('type')}
                  className="inline-flex items-center gap-1 hover:text-foreground text-left font-medium text-muted-foreground cursor-pointer"
                >
                  Type <span className="material-symbols-outlined text-sm text-muted-foreground/70 shrink-0">unfold_more</span>
                </button>
              </TableHead>
            )}
            {visibleColumns.modelName && (
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort('modelName')}
                  className="inline-flex items-center gap-1 hover:text-foreground text-left font-medium text-muted-foreground cursor-pointer"
                >
                  Model Template <span className="material-symbols-outlined text-sm text-muted-foreground/70 shrink-0">unfold_more</span>
                </button>
              </TableHead>
            )}
            {visibleColumns.status && (
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort('status')}
                  className="inline-flex items-center gap-1 hover:text-foreground text-left font-medium text-muted-foreground cursor-pointer"
                >
                  Status <span className="material-symbols-outlined text-sm text-muted-foreground/70 shrink-0">unfold_more</span>
                </button>
              </TableHead>
            )}
            {visibleColumns.metadata && <TableHead>Device Attributes</TableHead>}
            {visibleColumns.linked && <TableHead className="text-right">Polymorphic Components</TableHead>}
            {visibleColumns.actions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index} className="animate-pulse">
                <TableCell className="w-[40px] px-4"><Skeleton className="h-4 w-4" /></TableCell>
                {visibleColumns.identifier && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                {visibleColumns.type && <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>}
                {visibleColumns.modelName && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                {visibleColumns.status && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-3.5 w-16" />
                    </div>
                  </TableCell>
                )}
                {visibleColumns.metadata && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                {visibleColumns.linked && <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>}
                {visibleColumns.actions && <TableCell className="text-right"><Skeleton className="h-4 w-4 ml-auto" /></TableCell>}
              </TableRow>
            ))
          ) : paginatedDevices.length > 0 ? (
            paginatedDevices.map((device) => (
              <TableRow key={device.id} className="group hover:bg-primary/5 transition-colors">
                <TableCell className="w-[40px] px-4">
                  <Checkbox 
                    checked={isAllSelectedGlobally || selectedDeviceIds.includes(device.id || '')}
                    onCheckedChange={() => toggleDeviceSelection(device.id || '')}
                    disabled={user?.role === 'REVIEWER'}
                  />
                </TableCell>
                {visibleColumns.identifier && <TableCell className="font-medium tracking-mono font-mono text-foreground">{device.identifier}</TableCell>}
                {visibleColumns.type && (
                  <TableCell>
                    <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono tracking-wider">
                      {device.type}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.modelName && <TableCell className="text-muted-foreground">{device.modelName}</TableCell>}
                {visibleColumns.status && (
                  <TableCell className="text-xs font-semibold">
                    {device.status === 'IN_STOCK' && (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> In Stock
                      </span>
                    )}
                    {device.status === 'DISPATCHED' && (
                      <span className="inline-flex items-center gap-1 text-blue-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Dispatched
                      </span>
                    )}
                    {device.status === 'TESTING' && (
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Testing
                      </span>
                    )}
                    {device.status === 'DAMAGED' && (
                      <span className="inline-flex items-center gap-1 text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Damaged
                      </span>
                    )}
                    {device.status === 'RMA' && (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> RMA Swap
                      </span>
                    )}
                    {!['IN_STOCK', 'DISPATCHED', 'TESTING', 'DAMAGED', 'RMA'].includes(device.status) && (
                      <span className="text-muted-foreground font-semibold">{device.status.replace('_', ' ')}</span>
                    )}
                  </TableCell>
                )}
                {visibleColumns.metadata && (
                  <TableCell className="text-xs">
                    {device.metadata && Object.keys(device.metadata).length > 0 ? (
                      <div className="flex flex-col gap-0.5 text-muted-foreground max-w-xs truncate font-sans">
                        {device.type === 'SIM' && (
                          <>
                            <span className="font-semibold text-foreground">Phone: {device.metadata.phoneNumber || '-'}</span>
                            <span>Carrier: {device.metadata.carrier || '-'}</span>
                          </>
                        )}
                        {device.type === 'SD_CARD' && (
                          <>
                            <span className="font-semibold text-foreground">Capacity: {device.metadata.capacity || '-'}</span>
                            <span>Speed: {device.metadata.speedClass || '-'}</span>
                          </>
                        )}
                        {device.type === 'TRACKER' && (
                          <>
                            <span className="font-semibold text-foreground">Firmware: {device.metadata.firmware || '-'}</span>
                            <span>Revision: {device.metadata.hwRevision || '-'}</span>
                          </>
                        )}
                        {device.type === 'PANIC_BUTTON' && (
                          <>
                            <span className="font-semibold text-foreground">Freq: {device.metadata.rfFrequency || '-'}</span>
                            <span>Button: {device.metadata.buttonColor || '-'}</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">-</span>
                    )}
                  </TableCell>
                )}
                {visibleColumns.linked && (
                  <TableCell className="text-right text-muted-foreground font-medium">
                    {device.linked > 0 ? (
                      <span className="text-foreground inline-flex items-center gap-1.5 bg-primary/5 px-2 py-1 rounded-lg text-xs border border-primary/10">
                        <span className="material-symbols-outlined text-sm text-primary">developer_board</span> {device.linked} linked
                      </span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                {visibleColumns.actions && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className="text-muted-foreground hover:text-foreground p-1 hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-2xl border border-primary/15 text-foreground rounded-xl p-1 shadow-xl">
                        <DropdownMenuItem 
                          onClick={() => setViewModalDevice(device)}
                          className="text-xs font-semibold cursor-pointer flex items-center px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm mr-2 text-primary">visibility</span>
                          View Asset Profile
                        </DropdownMenuItem>
                        {user?.role !== 'REVIEWER' && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => setLinkModalDevice(device)}
                              className="text-xs font-semibold cursor-pointer flex items-center px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm mr-2 text-primary">link</span>
                              Manage Relationships
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOpenEditModal(device)}
                              className="text-xs font-semibold cursor-pointer flex items-center px-2.5 py-2 hover:bg-primary/5 focus:bg-primary/5 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm mr-2 text-muted-foreground">edit</span>
                              Edit Properties
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-primary/10 my-1" />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(device.id || '')}
                              className="text-xs font-semibold text-red-400 focus:text-red-400 cursor-pointer flex items-center px-2.5 py-2 hover:bg-red-500/5 focus:bg-red-500/5 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm mr-2 text-red-400">delete</span>
                              Decommission Unit
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="p-8">
                <EmptyState
                  icon={() => <span className="material-symbols-outlined text-3xl opacity-20">search</span>}
                  title="No devices found"
                  description="No matching devices in inventory database. Try modifying your filters or search query."
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {devices.length > 0 && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-primary/10 bg-transparent">
          <div className="text-sm text-muted-foreground flex-1">
            {isAllSelectedGlobally ? (
              `All ${devices.length} of ${devices.length} row(s) selected.`
            ) : (
              `${selectedDeviceIds.length} of ${devices.length} row(s) selected.`
            )}
          </div>
          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setCurrentPage(prev => Math.max(prev - 1, 1));
              }}
              disabled={currentPage === 1}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentPage(prev => Math.min(prev + 1, totalPages));
              }}
              disabled={currentPage === totalPages || totalPages === 0}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

