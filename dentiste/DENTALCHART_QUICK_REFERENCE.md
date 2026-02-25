# DentalChart Quick Reference

## Import
```tsx
import { DentalChart } from '@/components/DentalChart';
```

## Basic Usage
```tsx
<DentalChart
  patientId={patient.id}
  selectedTeeth={new Set(['11', '21'])}
  onToothSelect={(toothNum, isSelected) => {
    console.log(`Tooth ${toothNum} ${isSelected ? 'selected' : 'deselected'}`);
  }}
/>
```

## Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `patientId` | `string` | ❌ | `undefined` | Patient ID (logged to console) |
| `selectedTeeth` | `Set<string>` | ❌ | `new Set()` | Currently selected tooth numbers |
| `onToothSelect` | `Function` | ❌ | `undefined` | Callback: `(toothNum: string, isSelected: boolean) => void` |

## State Management in Parent

```tsx
// Parent component (e.g., PatientProfile.tsx)
const [selectedTeeth, setSelectedTeeth] = useState<Set<string>>(new Set());

const handleToothSelect = (toothNumber: string, isSelected: boolean) => {
  const newSelected = new Set(selectedTeeth);
  if (isSelected) {
    newSelected.add(toothNumber);
  } else {
    newSelected.delete(toothNumber);
  }
  setSelectedTeeth(newSelected);

  // Do something with selected tooth
  if (isSelected) {
    openTreatmentDialog(parseInt(toothNumber, 10));
  }
};
```

## Tooth FDI Numbers (Supported)

### Upper
```
Right: 11 (incisor)  13 (canine)  14 (premolar)  16 (molar)
Left:  21 (incisor)  23 (canine)
```

### Lower
```
Right: 41 (incisor)  44 (premolar)  47 (molar)
Left:  31 (incisor)  33 (canine)    36 (molar)
```

**Total: 12 adult teeth** (no deciduous teeth)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Tab** | Focus next tooth |
| **Shift + Tab** | Focus previous tooth |
| **← / →** | Move focus circularly |
| **Enter / Space** | Toggle select |
| **Esc** | Clear all selections |

## Console Output Demo

### DentalChart Logs
```javascript
[DentalChart] Tooth 11 selected
[DentalChart] Selected teeth: ["11"]
[DentalChart] Patient ID: patient-123
```

### Parent Component Logs
```javascript
[PatientProfile] Tooth 11 selected
[PatientProfile] All selected teeth: ["11"]
[PatientProfile] Patient: Jean Dupont
```

## Styling Classes

```css
.tooth              /* Base tooth (clickable) */
.tooth:hover        /* Mouse hover */
.tooth:focus        /* Keyboard focus (blue outline) */
.tooth.focused      /* Programmatic focus */
.tooth.selected     /* Selected state (blue fill) */
```

## Colors Used

- **Selected highlight**: `#3b82f6` (Tailwind blue-500)
- **Hover shadow**: `rgba(59, 130, 246, 0.4)` (semi-transparent blue)
- **Focus outline**: `2px solid #3b82f6`
- **Glow effect**: `drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))`

## Common Patterns

### Pattern 1: Direct Selection Toggle
```tsx
const toggleTooth = (toothNum: string) => {
  const updated = new Set(selectedTeeth);
  if (updated.has(toothNum)) {
    updated.delete(toothNum);
  } else {
    updated.add(toothNum);
  }
  setSelectedTeeth(updated);
};
```

### Pattern 2: Select Entire Arch
```tsx
const selectUpperRight = () => {
  setSelectedTeeth(new Set(['11', '13', '14', '16']));
};

const selectLowerLeft = () => {
  setSelectedTeeth(new Set(['31', '33', '36']));
};
```

### Pattern 3: Clear All
```tsx
const clearAllTeeth = () => {
  setSelectedTeeth(new Set());
};
```

### Pattern 4: Get Selected Count
```tsx
const selectedCount = selectedTeeth.size;
// Use in UI: `${selectedCount} dents selectionnées`
```

### Pattern 5: Integration with TreatmentDialog
```tsx
const [selectedToothForDialog, setSelectedToothForDialog] = useState<number | null>(null);
const [isDialogOpen, setIsDialogOpen] = useState(false);

const handleToothSelect = (toothNum: string, isSelected: boolean) => {
  // Update set
  const updated = new Set(selectedTeeth);
  isSelected ? updated.add(toothNum) : updated.delete(toothNum);
  setSelectedTeeth(updated);

  // Open dialog when selecting
  if (isSelected) {
    setSelectedToothForDialog(parseInt(toothNum, 10));
    setIsDialogOpen(true);
  }
};
```

## Responsive Breakpoints

| Screen | Max Width | Behavior |
|--------|-----------|----------|
| Desktop | 600px | Full size, clear instructions |
| Tablet | 400px | 67% of desktop |
| Mobile | 300px | 50% of desktop, text smaller |

## Accessibility Features

✅ **Keyboard Navigation**: Tab, Arrow keys, Enter, Escape  
✅ **Screen Reader**: ARIA labels, roles, aria-pressed  
✅ **Focus Indicator**: 2px blue outline (WCAG AA)  
✅ **Color Contrast**: 7:1 ratio (exceeds AA)  
✅ **Touch**: 20px+ click targets  
✅ **Print**: Clean monochrome output  

## TypeScript Types

```tsx
interface DentalChartProps {
  selectedTeeth?: Set<string>;
  onToothSelect?: (toothNumber: string, isSelected: boolean) => void;
  patientId?: string;
}
```

## Error Handling

### If tooth doesn't respond to click
```tsx
// Check console for:
// ✅ [DentalChart] Tooth X selected
// ✅ onToothSelect callback fires

// If not visible:
// - Parent component not re-rendering?
// - Set not updating correctly?
// - Use React DevTools to inspect state
```

### If keyboard nav doesn't work
```tsx
// Check:
// 1. Tab key navigates to SVG group elements
// 2. onKeyDown handlers attached to <g>
// 3. CSS :focus not hidden
// 4. tabIndex={0} on each tooth group
```

## Performance Tips

1. **Memoize callback** (prevent re-renders)
   ```tsx
   const handleToothSelect = useCallback((toothNum, isSelected) => {
     // ...
   }, [selectedTeeth]);
   ```

2. **Keep selectedTeeth in state** (don't pass huge objects)
   ```tsx
   // GOOD: Only Set<string>
   selectedTeeth={new Set(['11', '21'])}

   // BAD: Passing whole patient object
   patient={patient}
   ```

3. **Batch updates** if processing multiple teeth
   ```tsx
   const newSet = new Set(selectedTeeth);
   newSet.add('11');
   newSet.add('21');
   newSet.add('31');
   setSelectedTeeth(newSet);  // Single state update
   ```

## Browser Support

✅ Chrome 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Edge 90+  
✅ Electron (all versions 32+)  
❌ Internet Explorer (SVG tabindex not supported)  

## Files

| File | Purpose |
|------|---------|
| `DentalChart.tsx` | Component logic + keyboard handlers |
| `DentalChart.css` | Responsive styling + focus states |
| `PatientProfile.tsx` | Parent integration example |

## See Also

- 📖 [Full Integration Guide](./DENTALCHART_INTEGRATION.md)
- 🎨 [Tailwind CSS Docs](https://tailwindcss.com/)
- ♿ [WCAG Accessibility Guide](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Ready to integrate?** Copy the import above and follow the "Basic Usage" example! 🦷
