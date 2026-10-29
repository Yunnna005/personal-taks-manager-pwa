# iPhone test checklist

Work through this on a real iPhone, on the deployed address (https), in order.
For anything that fails, note the step number, what you expected and what happened.
A screenshot or screen recording helps a lot.

Write down your iPhone model and iOS version (Settings → General → About): ______

## A. Before installing (Safari)

1. Open the address in **Safari**. Home loads with today's date in big type.
2. The blue **Install soon on this iPhone** card shows.
3. Add one task here called "Safari tab test". (Used in step 9.)
4. Tap ✕ on the install card. Reload the page: the card stays gone.
5. Open the same address in **Chrome** on the iPhone, if you have it: no install card.

## B. Install

6. In Safari tap **Share → Add to Home Screen**. Keep **Open as Web App** on. Tap **Add**.
7. The home screen icon shows four coloured bars on dark blue, named "soon".
8. Open soon from the home screen. It opens full screen with no Safari address bar.
9. "Safari tab test" is **not** there. (Expected: Safari and the installed app keep separate data.)
10. Nothing is hidden behind the notch / Dynamic Island or the home bar at the bottom.

## C. Everyday use (in the installed app)

11. Tap **Add your first task**. The sheet slides up and **the keyboard comes up by itself**.
12. Add three tasks in a row without closing the sheet. Each shows the green "… added" chip.
13. Pick **Tomorrow**, then **Add time**: the iOS time wheel opens. Set a time, add the task.
14. Tap **Pick date**: the iOS date picker opens. Pick a date next week, add a task.
15. While the sheet is open, the page behind doesn't scroll. Swipe or tap the dimmed area to close.
16. Create a folder from **New folder**. The keyboard comes up for the name. Pick a colour.
17. Open the folder. Its add bar says "Add to …" and new tasks go into it.
18. Open a task. Edit the title, notes and a step. "Saved" appears. Go back: the changes are there.
19. On the task page, change the date and time with the iOS pickers; remove the time.
20. Tick a task off on Home. The "… done" toast shows above the add bar. Tap **Undo**: it comes back.
21. Delete a task from its page. The toast shows on the screen you return to. **Undo** restores it.
22. Swipe from the left edge to go back from a folder and from a task. It works like the Back button.
23. Rotate the phone: nothing breaks. (The app is meant for portrait.)

## D. Look

24. Settings → Theme → **Dark**, then **Light**, then **System**. Each applies at once.
25. With **System**, switch the iPhone between light and dark (Control Centre). The app follows.
26. Close the app fully (swipe it away) and reopen. The chosen theme shows straight away with no flash.

## E. Offline and storage

27. Settings → **Storage** says "Protected". (If it says "Not protected yet", note it.)
28. Turn on **Airplane Mode**. Close the app fully and reopen from the home screen. It opens with all your tasks.
29. Add a task while offline. Turn Airplane Mode off. The task is still there.

## F. Backup

30. Settings → **Export**. The share sheet opens. Choose **Save to Files** and save it.
31. "Last backup was today" shows, and the backup nudge on Home is gone.
32. Delete a couple of tasks. Settings → **Import**, pick the file you saved. "Replace everything?" asks first. Confirm.
33. "Imported N tasks and N folders" shows and the deleted tasks are back.
34. Import a photo or any non-backup file: it's refused with "That file isn't a soon backup. Nothing on this phone was changed."

## G. Updates (needs a second deploy, ask for one)

35. After a new version is deployed, open the installed app (or switch back to it). Within a minute or two the blue **A new version of soon is ready** banner shows. If it doesn't, go to Settings → Updates → **Check for updates**: it says **A new version is ready**.
36. Tap **Reload** (on the banner or in Settings). The app reloads on the new version (Settings → Version shows the new number).

## H. Accessibility (optional, quick)

37. Settings → Accessibility → Display & Text Size → **Larger Text**: turn it up a few steps. Text grows and nothing overlaps.
38. Turn on **VoiceOver** briefly: on Home, swipe through. Buttons are read with sensible names ("Mark Pay rent as done", "Settings").
39. Settings → Accessibility → Motion → **Reduce Motion** on: sheets and toasts appear without sliding.
