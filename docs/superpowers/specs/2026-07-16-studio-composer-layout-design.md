# Studio Composer Layout Design

## Goal

Keep the generated image as the dominant workspace while making prompt refinement, references, image settings, and errors faster to operate from the bottom dock.

## Confirmed interaction

- Move `归纳预设` from the center title area to the top-right action area.
- Remove the standalone top-right `提示词协作` action.
- Present `快速润色` and `提示词协作` as two faces of one compact mode control in the input area. A small rotate button switches faces.
- Keep quick polish as a one-click action. It never shows an “adopt prompt” action.
- Embed prompt collaboration in the input area. Reference thumbnails remain visible while collaborating. Each assistant response automatically synchronizes its candidate text into the main prompt state, so there is no `采用当前提示词` button.
- Place all selected references in a vertical rail on the left side of the input area. The rail also contains upload and library entry points.
- Merge image settings and the generate action into one narrow right column. Remove the redundant generation summary card.
- Add a square resize handle where the timeline boundary and dock boundary meet. Dragging it changes both dimensions in one gesture.
- Replace dock-bottom errors with a dismissible red notification near the top center. New errors restart the auto-dismiss timer; clearing an error removes the notice immediately.

## Component boundaries

- `Studio.tsx` owns mode selection, prompt state, layout sizing, and notification state.
- `PromptCollaboration.tsx` becomes an inline region. It owns message loading/submission and reports assistant text and errors through callbacks.
- `styles.css` owns the two-column dock, vertical reference rail, inline collaboration states, corner resize handle, and notification presentation.
- No backend request or database contract changes are required.

## Responsive behavior

Desktop keeps the wide input column and compact settings column. At narrow widths, the input and settings columns stack, reference thumbnails become a horizontal strip, and resize handles are hidden. Main image containment remains unchanged.

## Error handling

Generation, optimization, collaboration, validation, and library errors all use the same top notification. It is accessible with `role="alert"`, manually dismissible, and automatically dismissed after eight seconds.

## Verification

Frontend tests cover mode switching, automatic prompt synchronization, absence of adoption actions, merged settings/generate layout, vertical reference rail, top error notification, and simultaneous resizing. Production build and browser checks verify real geometry and dragging.

