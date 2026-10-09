// Open the launcher UI in a full tab when the toolbar button is clicked.
// A full tab gives enough room to browse a large bookmark tree, which a
// tiny browser-action popup would not.
const PAGE = browser.runtime.getURL("popup.html");

browser.browserAction.onClicked.addListener(() => {
  browser.tabs.create({ url: PAGE });
});
