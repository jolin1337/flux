export const copySnippetToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);

    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard", err);

    return false;
  }
};
export const getSnippetFromClipboard = async (): Promise<string> => {
  try {
    return await navigator.clipboard.readText();
  } catch (err) {
    console.error("Failed to get clipboard", err);

    return Promise.reject();
  }
};
