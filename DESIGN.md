# soon: design spec

Bold, flat and colourful. Urgency is shown with colour, and folders are colour tiles.
Not iOS-styled: no system blur, no grey grouped lists, no SF fonts.
Flat colour, no shadows, no gradients.

## Colour

### Base (light mode)
| Token | Hex | Use |
|---|---|---|
| ink | #1C1B33 | text, dark buttons, add bar, progress fill |
| mist | #EFF0F6 | page background |
| paper | #FFFFFF | cards |
| cobalt | #3B3FE4 | links, primary "Add task" button |
| slate | #5A5A73 | secondary text |
| line | #ECEDF4 | dividers inside cards |
| control | #8F90A6 | empty tick circles and checkboxes |
| danger-text | #B3261E | "Delete task" text |

### Base (dark mode)
| Token | Hex |
|---|---|
| ground | #14132A |
| card | #24223F |
| card-raised | #34324F |
| text | #F2F1FA |
| text-secondary | #A8A7C6 |
| control | #7D7BA3 |
| link | #A3A6FF |

In dark mode:
- Urgency tabs and folder tiles keep the same bright colours, with ink text on top.
- The add bar flips to a light pill (#F2F1FA) with a cobalt plus button.

### Urgency (hot to cool)
| Name | Hex | When |
|---|---|---|
| late | #FF6B57 | overdue |
| today | #FFB23F | due today |
| tomorrow | #FFE27A | due tomorrow |
| later | #DCD8FF | later in the window |

Text on all of these is ink.

### Folder colours
| Name | Hex |
|---|---|
| lilac | #CFC9FF |
| peach | #FFC4A3 |
| mint | #9EE6CC |
| sky | #B5DBFF |
| butter | #FFE27A |
| rose | #FFC2D6 |

Other colours:
- Unsorted uses a neutral tile, #E1E2EC.
- Small folder dots next to task names use a slightly deeper shade, for example lilac dot #B9B0FF and peach dot #FFB48F.

### Messages
| Use | Background | Text |
|---|---|---|
| Backup nudge | #FFE3B3 | #4F3A12 |
| Success | mint | ink |
| Error | #FFE4DF | #5C1A12, with a coral icon |
| Update banner | cobalt | white, with a white "Reload" pill |

## Type
Bricolage Grotesque, a variable font with weight and width axes. It's one family for everything.

| Role | Size / weight | Width | Letter spacing |
|---|---|---|---|
| Display (date, folder title) | 56–64 / 780–790 | 75–77% | -1.5 to -2px, line-height 0.95 |
| Page title (task title, sheets) | 30–40 / 760–780 | 77–80% | |
| Section heading ("Due soon", "Folders") | 24 / 720 | 82% | |
| Folder tile name | 22 / 740 | 80% | |
| Task title | 17 / 600 | | |
| Body | 16–17 / 400 | | |
| Label | 13–15 / 700, slate | | |

Sentence case everywhere. No all-caps labels.

## Shape and spacing
- Screen side padding: 20px
- Corner radius:
  - cards 22px
  - folder tiles 24px
  - sheets 30px (top corners)
  - urgency tab 17px, inset 6px inside its card
  - buttons, chips and the add bar fully round
- Touch targets at least 44px. Gaps between cards 10–12px.
- Progress bars: 8px tall on tiles (12px on the folder header), track at ink 16% opacity, fill ink.

## Components
- **Due soon card**: white card. Coral/amber/yellow/lilac tab on the left, 78px wide, with two lines: the big one ("2 days", "17:00", "10:30", "Fri") and the small one ("late", "today", "tomorrow", "30 Oct"). Then the title, a folder dot and name, and an optional "2/4 steps" chip. Tick circle on the right.
- **Folder tile**: folder colour background. Name, "N left", "X of Y done" and a progress bar. At 100% it shows an ink tick badge and "All done". Tiles sit in a 2-column grid. Unsorted is a full-width white row above the grid.
- **Add bar**: fixed at the bottom of every screen. Ink pill, 62px tall, with "Add a task" placeholder and a butter-coloured round plus button. Inside a folder it reads "Add to <folder>" and the plus button takes the folder colour.
- **Folder header**: the folder colour fills the top of the screen, with round 44px back and options buttons, the folder name in display type, and a big progress bar.
- **Sheet**: white, slides up, 30px top corners, grabber handle, dimmed background.
- **Chips**: 40px round. Selected chips are ink with white text. Date chips use butter when selected. "Add time" has a dashed border.
- **Home header**: "soon" wordmark, then a white pill with List and Calendar icon buttons (44px, the active one ink with a white icon), then the round Settings button.
- **Week grid**: day headers (weekday, day number in display type, month), today's in an amber 17px-radius tab, earlier days in slate. A 52px hours column ("09:00", 12px bold slate). Hour lines and column lines in the divider colour. Task entries are 12px-radius blocks in the folder colour (Unsorted grey) with ink text: time on top, title below. Late gets a coral pill. The current time is a 2px coral line with a dot.
- **Toasts**: ink pill with white text and a butter "Undo" pill. Positioned above the add bar.
- **Buttons**: primary is cobalt ("Add task"), strong is ink ("Mark as done", "Export", "Create folder"), secondary is a 1.5px ink outline. Destructive is a coral fill with ink text ("Delete folder").

## Screens
1. **Home**: "soon" wordmark and settings button, big date, a one-line summary, Due soon cards, folders, add bar.
2. **Home, first run**: install hint card (sky colour, iPhone only), dashed empty Due soon, Unsorted tile and a dashed "New folder" tile, add bar reading "Add your first task".
3. **Folder**: colour header with progress, "With a due date" and "No date" lists in white cards, "Show completed (N)" toggle, add bar.
4. **Task**: back button and "Saved" indicator, editable display title, date and folder chips, "Mark as done" button, a card with date, time and folder, notes card, steps card with progress and "Add step", created and edited dates, "Delete task".
5. **Settings**: due-soon stepper ("3 days ahead"), "First page" picker (List / Calendar tiles), theme picker (System / Light / Dark tiles), backup card (amber when old) with Export and Import, a storage status row, and the version.
6. **Quick add sheet**: confirmation chip for the last added task, big title input, folder chips, "When" chips plus "Add time", cobalt "Add task" button.
7. **New / rename folder sheet**: name input, six colour swatches, live tile preview, Cancel and Create folder buttons.
8. **Folder options sheet**: Rename folder, Change colour, Delete folder (coral tint), Cancel.
9. **Delete folder dialog**: coral icon, "Delete <name>?", "Its N open tasks will move to Unsorted.", "Delete folder" and "Keep folder" buttons.
10. **Desktop landing**: shown on wide screens when not installed.
    - Version badge.
    - "soon lives on your phone" headline.
    - QR code for the app URL.
    - Install steps:
      - iPhone in a lilac card: Safari, Share, Add to Home Screen, keep "Open as Web App" on, Add.
      - Android in a mint card: Chrome, Install banner or menu then Install app, confirm.
    - Three short notes: works offline, private by default, keep a backup.
    - Footer with version and update date.
    - A "Try it in this browser" link.

11. **Calendar** (Home's second view): header with the view switch, the week ("26 Oct – 1 Nov") with previous and next buttons, "This week", then the week grid: day headers, the Any time row, hour rows. Add bar.

## Copy
- "4 tasks due in the next 3 days. One is already late."
- "See all 6"
- "3 tasks to sort"
- "Nothing due in the next 3 days."
- Toasts: "Pay rent done" / Undo, "Task deleted" / Undo
- "A new version of soon is ready" / Reload
- "Last backup was 14 days ago" / Export
- "Imported 24 tasks and 4 folders"
- "That file isn't a soon backup. Nothing on this phone was changed."
