import React, { useState } from 'react';
import {
  // useFloating,
  // offset,
  // flip,
  // shift,
  // useDismiss,
  // useRole,
  // useClick,
  // useInteractions,
  // FloatingFocusManager,
  // useId,
  type FloatingContext,
  type ReferenceType,
  type ElementProps,
  type Placement
} from '@floating-ui/react';

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';

const INTERACTIVE_ELEMENTS = ['INPUT', 'TEXTAREA'];

export function useDraggable<RT extends ReferenceType = ReferenceType>(
  context: FloatingContext<RT>,
  initialPlacement: Placement,
  isInteractive: (node: HTMLElement) => boolean = () => true
): ElementProps {
  const {
    open,
    refs,
    elements: { floating },
    middlewareData: { offset }
  } = context;
  const [canTrackMove, setCanTrackMove] = React.useState(false);
  const deltaRef = React.useRef({ x: 0, y: 0 });

  const handleMouseUp = React.useCallback(() => {
    setCanTrackMove(false);
  }, []);

  React.useEffect(() => {
    if (!open) {
      refs.setPositionReference(refs.domReference.current);
    }
  }, [refs, open]);

  React.useEffect(() => {
    if (canTrackMove) {
      const handleMouseMove = (event: MouseEvent) => {
        refs.setPositionReference({
          contextElement: refs.domReference.current || undefined,
          getBoundingClientRect() {
            return {
              width: 0,
              height: 0,
              x: event.clientX,
              y: event.clientY,
              top: event.clientY - deltaRef.current.y,
              left: event.clientX + deltaRef.current.x,
              right: event.clientX,
              bottom: event.clientY
            };
          }
        });
      };

      const win = getWindow(refs.floating.current);
      win.addEventListener('mousemove', handleMouseMove);
      return () => {
        win.removeEventListener('mousemove', handleMouseMove);
        win.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [canTrackMove, refs, handleMouseUp]);

  return React.useMemo(() => {
    return {
      floating: {
        onPointerDown(event) {
          const target = event.target as HTMLElement;
          if (INTERACTIVE_ELEMENTS.includes(target.tagName) || isInteractive(target)) return;
          if (floating) {
            const rect = floating.getBoundingClientRect();
            const { top, left, width, height } = rect;
            const [side, align = 'center'] = initialPlacement.split('-') as [Side, Align];
            // prettier-ignore
            const oppositeSideRect = {
              top: rect.bottom, bottom: rect.top,
              left: rect.right, right: rect.left,
            }[side];
            const factor = align === 'start' ? 1 : align === 'end' ? -1 : 0;
            const offsetX = Math.abs(offset?.x || 0);
            const offsetY = Math.abs(offset?.y || 0);
            if (['top', 'bottom'].includes(side)) {
              deltaRef.current = {
                y: event.clientY - oppositeSideRect - offsetY,
                x: width / 2 - (event.clientX - left) - (width / 2) * factor
              };
            } else {
              deltaRef.current = {
                y: (height / 2 - (event.clientY - top) - (height / 2) * factor) * -1,
                x: (event.clientX - oppositeSideRect + offsetX) * -1
              };
            }
          }
          const win = getWindow(event.currentTarget);
          win.addEventListener('mouseup', handleMouseUp);
          setCanTrackMove(true);
        }
      }
    };
  }, [handleMouseUp, floating, initialPlacement, offset]);
}

export function getDocument(node: Element | null) {
  return node?.ownerDocument || document;
}

export function getWindow(value: any) {
  return getDocument(value).defaultView || window;
}
