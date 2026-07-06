import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ims_pro/ui/components/dialog';
import { ScrollArea } from '@ims_pro/ui/components/scroll-area';
import { Device, DeviceModel } from '../../../lib/types/domain';
import { apiClient } from '../../../lib/api-client';
import { useFeedback } from '@/components/ui/feedback-provider';
import { playSuccessBeep, playErrorBuzz } from '../../../lib/audio';
import { MotionDialogBody } from '@/components/ui/motion';

interface ManageLinksModalProps {
  device: Device | null;
  onClose: () => void;
  devices: Device[];
  models: DeviceModel[];
  relationships: any[];
  onSuccess: () => void;
}

export const ManageLinksModal: React.FC<ManageLinksModalProps> = ({
  device,
  onClose,
  devices,
  models,
  relationships,
  onSuccess,
}) => {
  const { toast } = useFeedback();
  const [linkSearch, setLinkSearch] = useState('');
  const [linkParentSearch, setLinkParentSearch] = useState('');
  const [stagedLinks, setStagedLinks] = useState<any[]>([]);
  const [linkModalError, setLinkModalError] = useState('');

  if (!device) return null;

  const isAncestor = (possibleAncestorId: string, currentDeviceId: string): boolean => {
    const rel = relationships.find(r => r.linkedDeviceId === currentDeviceId);
    let parentId = rel?.primaryDeviceId;
    if (!parentId) {
      const staged = stagedLinks.find(s => s.childId === currentDeviceId);
      parentId = staged?.primaryId;
    }
    if (!parentId) return false;
    if (parentId === possibleAncestorId) return true;
    return isAncestor(possibleAncestorId, parentId || '');
  };

  const parentRel = relationships.find(r => r.linkedDeviceId === (device.id || ''));
  const parentDev = parentRel ? devices.find(d => d.id === parentRel.primaryDeviceId) : null;
  const stagedParent = stagedLinks.find(s => s.childId === (device.id || ''));

  const model = models.find(m => m.id === device.modelId);
  let allowedChildTypes: string[] = [];
  if (model?.allowedChildren) {
    try {
      allowedChildTypes = Array.isArray(model.allowedChildren) ? model.allowedChildren : JSON.parse(model.allowedChildren as string);
    } catch (e) {
      console.error(e);
    }
  }

  const childRels = relationships.filter(r => r.primaryDeviceId === device.id);
  const stagedChildren = stagedLinks.filter(s => s.primaryId === device.id);

  const handleUnlink = async (primaryISN: string, childISN: string) => {
    try {
      const data = await apiClient.post<any>('/api/device-links/unlink', { links: [{ primaryISN, childISN }] });
      if (data.success) {
        toast.success('Unlinked successfully.');
        playSuccessBeep();
        onSuccess();
      } else {
        setLinkModalError(data.errors?.[0] || 'Unlinking failed.');
        playErrorBuzz();
      }
    } catch (e) {
      setLinkModalError('Network error during unlinking.');
      playErrorBuzz();
    }
  };

  const handleCommitLinks = async () => {
    try {
      const data = await apiClient.post<any>('/api/device-links/commit', {
        links: stagedLinks.map(s => ({ primaryISN: s.primaryISN, childISN: s.childISN }))
      });
      if (data.success) {
        playSuccessBeep();
        setStagedLinks([]);
        onSuccess();
        onClose();
      } else {
        setLinkModalError(data.errors?.[0] || 'Committing links failed.');
        playErrorBuzz();
      }
    } catch (e) {
      setLinkModalError('Network error committing relationship links.');
      playErrorBuzz();
    }
  };

  return (
    <Dialog open={!!device} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="surface-card rounded-2xl max-w-lg w-full max-h-[90vh] border-0" showCloseButton={true}>
        <MotionDialogBody className="p-6 overflow-y-auto space-y-6">
        <DialogHeader className="hidden"><DialogTitle>Manage Relationships</DialogTitle></DialogHeader>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-foreground">Manage Hardware Links</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Establish or edit custom device relationship mappings.</p>
        </div>

        {linkModalError && <div className="bg-red-500/10 text-red-400 text-xs p-2.5 rounded-lg border border-red-500/20 font-medium">{linkModalError}</div>}

        <div className="space-y-6 text-left">
          <div className="text-xs border border-border p-3 rounded-xl bg-primary/5 space-y-1">
            <div className="font-semibold text-primary">Selected Device:</div>
            <div className="font-mono text-foreground font-bold text-sm tracking-wider">{device.identifier}</div>
            <div className="text-muted-foreground">{device.modelName} ({device.type}) — Status: {device.status}</div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Parent Connection</h4>
            {parentDev ? (
              <div className="border border-border rounded-xl bg-primary/5 p-2.5 px-3 flex justify-between items-center text-xs">
                <div><div className="font-bold text-foreground font-mono">{parentDev.identifier}</div><div className="text-muted-foreground text-[10px]">{parentDev.modelName}</div></div>
                <button onClick={() => handleUnlink(parentDev.identifier, device.identifier)} className="text-xs text-red-400 p-1.5 cursor-pointer"><span className="material-symbols-outlined text-sm">delete</span></button>
              </div>
            ) : stagedParent ? (
              <div className="border border-primary/25 rounded-xl bg-primary/5 p-2.5 px-3 flex justify-between items-center text-xs">
                <div><div className="font-bold text-foreground font-mono flex items-center gap-1.5"><span className="text-primary text-[10px] font-bold bg-primary/10 px-1.5 py-0.5 rounded">Staged Parent</span>{stagedParent.primaryISN}</div></div>
                <button onClick={() => setStagedLinks(stagedLinks.filter(s => s.childId !== (device.id || '')))} className="text-xs text-muted-foreground cursor-pointer"><span className="material-symbols-outlined text-sm">close</span></button>
              </div>
            ) : (
              <div className="space-y-2">
                <input type="text" placeholder="Search compatible parent devices..." value={linkParentSearch} onChange={(e) => setLinkParentSearch(e.target.value)} className="flex h-9 w-full rounded-lg border border-border bg-background/50 px-3 text-xs text-foreground" />
                <ScrollArea className="border border-border rounded-xl max-h-32 bg-background">
                  {devices.filter(d => d.status === 'IN_STOCK' && d.id !== device.id && models.find(m => m.id === d.modelId)?.allowedChildren?.includes(device.type) && !isAncestor(device.id || '', d.id || '')).filter(d => !linkParentSearch || d.identifier.toLowerCase().includes(linkParentSearch.toLowerCase())).map(d => (
                    <button key={d.id} onClick={() => { setStagedLinks([...stagedLinks, { primaryISN: d.identifier, childISN: device.identifier, primaryId: d.id || '', childId: device.id || '', primaryModelName: d.modelName, childType: device.type }]); setLinkParentSearch(''); }} className="w-full text-left px-3 py-2 hover:bg-primary/5 text-xs cursor-pointer">
                      <div className="font-bold text-foreground font-mono">{d.identifier}</div><div className="text-muted-foreground text-[10px]">{d.modelName}</div>
                    </button>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>

          {allowedChildTypes.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Child Components</h4>
              {(childRels.length > 0 || stagedChildren.length > 0) && (
                <div className="border border-border rounded-xl bg-primary/5 overflow-hidden divide-y divide-primary/10">
                  {childRels.map(rel => {
                    const child = devices.find(d => d.id === rel.linkedDeviceId);
                    return child ? (
                      <div key={rel.id} className="p-2.5 px-3 flex justify-between items-center text-xs">
                        <div><div className="font-bold text-foreground font-mono">{child.identifier}</div><div className="text-muted-foreground text-[10px]">{child.modelName}</div></div>
                        <button onClick={() => handleUnlink(device.identifier, child.identifier)} className="text-xs text-red-400 p-1.5 cursor-pointer"><span className="material-symbols-outlined text-sm">delete</span></button>
                      </div>
                    ) : null;
                  })}
                  {stagedChildren.map((staged, idx) => (
                    <div key={idx} className="p-2.5 px-3 bg-primary/5 flex justify-between items-center text-xs">
                      <div><div className="font-bold text-foreground font-mono flex items-center gap-1.5"><span className="text-primary text-[10px] font-bold bg-primary/10 px-1.5 py-0.5 rounded">Staged Child</span>{staged.childISN}</div></div>
                      <button onClick={() => setStagedLinks(stagedLinks.filter(s => s.childId !== staged.childId))} className="text-xs text-muted-foreground cursor-pointer"><span className="material-symbols-outlined text-sm">close</span></button>
                    </div>
                  ))}
                </div>
              )}
              <input type="text" placeholder="Search compatible child components..." value={linkSearch} onChange={(e) => setLinkSearch(e.target.value)} className="flex h-9 w-full rounded-lg border border-border bg-background/50 px-3 text-xs text-foreground" />
              <ScrollArea className="border border-border rounded-xl max-h-32 bg-background">
                {devices.filter(d => d.status === 'IN_STOCK' && d.id !== device.id && allowedChildTypes.includes(d.type) && !relationships.some(r => r.linkedDeviceId === d.id) && !stagedLinks.some(s => s.childId === d.id) && !isAncestor(d.id || '', device.id || '')).filter(d => !linkSearch || d.identifier.toLowerCase().includes(linkSearch.toLowerCase())).map(d => (
                  <button key={d.id} onClick={() => { setStagedLinks([...stagedLinks, { primaryISN: device.identifier, childISN: d.identifier, primaryId: device.id || '', childId: d.id || '', primaryModelName: device.modelName, childModelName: d.modelName, childType: d.type }]); setLinkSearch(''); }} className="w-full text-left px-3 py-2 hover:bg-primary/5 text-xs cursor-pointer">
                    <div className="font-bold text-foreground font-mono">{d.identifier}</div><div className="text-muted-foreground text-[10px]">{d.modelName}</div>
                  </button>
                ))}
              </ScrollArea>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-lg text-xs font-bold border border-border bg-card/60 text-muted-foreground h-9 px-4 flex-1 cursor-pointer">Cancel</button>
            {stagedLinks.length > 0 && <button onClick={handleCommitLinks} className="inline-flex items-center justify-center rounded-lg text-xs font-bold bg-primary text-primary-foreground h-9 px-4 flex-1 cursor-pointer">Commit ({stagedLinks.length}) Links</button>}
          </div>
        </div>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
};

