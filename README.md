# Private Bookmark Launcher

A Firefox extension for selecting bookmarks from nested folders and opening them as tabs in the current browser window.

![Private Bookmark Launcher preview](screenshots/extension-preview.jpg)



## Features

- Browse the native Firefox bookmark tree.
- Navigate through nested folders and subfolders.
- Select individual bookmarks with checkboxes.
- Select entire folders recursively.
- Deselect individual bookmarks after selecting a folder.
- Keep selections while navigating or searching.
- Search bookmarks by name or URL.
- Display the number of selected bookmarks.
- Open all selected bookmarks as new tabs in the current Firefox window.
- Works in normal and private browsing windows.

## Technologies

- JavaScript
- HTML
- CSS
- Firefox WebExtensions API
- Firefox Bookmarks API
- Firefox Tabs API

## Privacy

The extension is designed to work locally in the browser.

It does not require an external server and does not collect or transmit bookmark data or browsing data.

The extension requests access to Firefox bookmarks and browser tabs because these permissions are required for its functionality.

## Development

This project was developed with AI-assisted tools, including Bolt.new and ChatGPT, followed by manual testing, debugging, configuration, and iterative refinement.

The development process included testing the extension in Firefox, configuring the WebExtension manifest, resolving Mozilla validation requirements, and testing the final signed extension.

## Installation

The extension is distributed through Mozilla Add-ons as a signed, self-distributed Firefox extension.

For development or testing, the extension can also be loaded temporarily through Firefox's `about:debugging` page.

## Project status

The extension is currently functional and has been tested in Mozilla Firefox.

## License

See the `LICENSE` file for licensing information.