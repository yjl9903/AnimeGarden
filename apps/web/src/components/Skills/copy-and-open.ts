/** Copies before navigating, reserving the tab during the user's click to avoid popup blocking. */
export async function copyPromptAndOpen(prompt: string, href: string): Promise<void> {
  // Start the clipboard write while the original document still has focus.
  const copied = navigator.clipboard.writeText(prompt);
  const tab = window.open('about:blank', '_blank');
  if (tab) tab.opener = null;

  try {
    await copied;
  } catch (error) {
    tab?.close();
    throw error;
  }

  // If popups are blocked, the current tab still provides a usable handoff.
  if (tab) tab.location.replace(href);
  else window.location.assign(href);
}
